/**
 * Oral dosing via drug-loaded mealworms.
 *
 * This is not an injection calculator with different labels. The input model
 * differs: there is no injection volume, the deliverable volume is capped by
 * what a mealworm can absorb before it leaks, and the same target dose can be
 * reached either by fixing the load volume and solving for concentration, or
 * by fixing a stock concentration and solving for the load volume.
 *
 * One worm per mouse. The loading capacity is a user-set ceiling because it
 * depends on worm size.
 *
 * Scope note: this calculates what to LOAD. Whether the mouse eats the worm
 * is a bench observation, not a calculation, and is deliberately not modelled
 * here. Outputs are named accordingly.
 */
import { toNonNegativeNumber, toPositiveNumber } from './numberUtils';
import { volumeToMl, weightToG } from './unitConversions';
import { drugAmountToMg } from './molarUnits';

/** @typedef {{ level: 'error' | 'warning', message: string }} Issue */

/** Every mouse receives exactly one loaded worm. */
export const WORMS_PER_MOUSE = 1;

/** Loading capacity presets, in microlitres, before the worm leaks. */
export const WORM_SIZE_PRESETS = [
  { value: '250', label: 'Large (250 µL)' },
  { value: '125', label: 'Small (125 µL)' },
];

/**
 * Checks that apply to any loaded volume, in either mode.
 *
 * @returns {Issue[]}
 */
export function checkLoadVolume({ loadVolumeUl, wormCapacityUl, pipetteMinUl }) {
  /** @type {Issue[]} */
  const issues = [];
  const load = toPositiveNumber(loadVolumeUl);
  const capacity = toPositiveNumber(wormCapacityUl);
  const pipetteMin = toNonNegativeNumber(pipetteMinUl);

  if (load === undefined) return issues;

  if (capacity !== undefined && load > capacity) {
    issues.push({
      level: 'error',
      message:
        `${round(load)} µL exceeds the ${round(capacity)} µL loading capacity. ` +
        'The worm will leak and the delivered dose will be unknown. ' +
        'Use a more concentrated solution or a larger worm.',
    });
  }

  if (pipetteMin !== undefined && pipetteMin > 0 && load < pipetteMin) {
    issues.push({
      level: 'error',
      message:
        `${round(load)} µL is below your ${round(pipetteMin)} µL pipette minimum ` +
        'and cannot be measured accurately. Use a more dilute solution.',
    });
  }

  return issues;
}

/**
 * MODE A — fixed load volume, solve for the concentration to mix.
 *
 * Use when every mouse gets the same absolute dose, so every worm gets the
 * same volume.
 */
export function computeMealwormConcentrationMode({
  dosePerSubjectMg,
  loadVolumeUl,
  wormCapacityUl,
  pipetteMinUl,
  totalDoses,
  wasteBufferPct,
}) {
  const loadMl = volumeToMl(loadVolumeUl, 'ul');
  const doses = toNonNegativeNumber(totalDoses);
  const waste = toNonNegativeNumber(wasteBufferPct) ?? 0;

  const issues = checkLoadVolume({ loadVolumeUl, wormCapacityUl, pipetteMinUl });

  if (dosePerSubjectMg === undefined || loadMl === undefined || loadMl <= 0) {
    return { requiredConcentrationMgPerMl: undefined, totalSolutionMl: undefined, totalSoluteMg: undefined, issues };
  }

  const requiredConcentrationMgPerMl = dosePerSubjectMg / loadMl;

  let totalSolutionMl;
  let totalSoluteMg;
  if (doses !== undefined) {
    totalSolutionMl = loadMl * doses * (1 + waste / 100);
    totalSoluteMg = requiredConcentrationMgPerMl * totalSolutionMl;
  }

  return { requiredConcentrationMgPerMl, totalSolutionMl, totalSoluteMg, issues };
}

/**
 * MODE B — fixed stock concentration, solve for the volume to load.
 *
 * Use when dose scales with body mass: mix one stock, vary the volume.
 */
export function computeMealwormVolumeMode({
  dosePerSubjectMg,
  stockConcentrationMgPerMl,
  wormCapacityUl,
  pipetteMinUl,
}) {
  const stock = toPositiveNumber(stockConcentrationMgPerMl);

  if (dosePerSubjectMg === undefined || stock === undefined) {
    return { loadVolumeUl: undefined, issues: [] };
  }

  const loadVolumeUl = (dosePerSubjectMg / stock) * 1000;
  const issues = checkLoadVolume({ loadVolumeUl, wormCapacityUl, pipetteMinUl });

  return { loadVolumeUl, issues };
}

/**
 * The range of stock concentrations that works across a whole body-weight
 * range, given the worm's capacity and the pipette's resolution.
 *
 * Too dilute and the heaviest animal's volume overflows the worm; too
 * concentrated and the lightest animal's volume falls under the pipette.
 * Choosing a stock outside this window fails at the bench, not on screen.
 */
export function computeWorkableConcentrationWindow({
  doseRateMgPerG,
  minBodyWeightG,
  maxBodyWeightG,
  wormCapacityUl,
  pipetteMinUl,
}) {
  const rate = toPositiveNumber(doseRateMgPerG);
  const minG = toPositiveNumber(minBodyWeightG);
  const maxG = toPositiveNumber(maxBodyWeightG);
  const capacityMl = volumeToMl(toPositiveNumber(wormCapacityUl), 'ul');
  const pipetteMinMl = volumeToMl(toPositiveNumber(pipetteMinUl), 'ul');

  if (rate === undefined || minG === undefined || maxG === undefined) return null;
  if (capacityMl === undefined || capacityMl <= 0) return null;

  // Heaviest animal must still fit in the worm.
  const minMgPerMl = (rate * maxG) / capacityMl;

  // Lightest animal must still be pipettable. With no pipette floor there is
  // no upper bound on concentration.
  const maxMgPerMl =
    pipetteMinMl !== undefined && pipetteMinMl > 0 ? (rate * minG) / pipetteMinMl : Infinity;

  return {
    minMgPerMl,
    maxMgPerMl,
    feasible: minMgPerMl <= maxMgPerMl,
  };
}

/**
 * Dose-volume bounds for the AVERAGE subject, when one batch serves a range of
 * body masses.
 *
 * A batch has one concentration, and fixing the average subject's volume fixes
 * it. Every other subject's volume then follows their body mass: a subject of
 * mass w gets V x (w / w_avg). So the instrument floor and the carrier ceiling
 * are not limits on V directly — the LIGHTEST subject reaches the floor first
 * and the HEAVIEST reaches the ceiling first, and both have to be translated
 * back into limits on V before a suggested volume can respect them.
 *
 * Without a range this is the identity — the bounds come back as they went in.
 * That is what lets the range be optional: not knowing it costs you the wider
 * check, not the calculator.
 *
 * The ratios are clamped so they always span the average, because the average
 * subject is a subject too. A range typed as 30–40 g around a 25 g average
 * would otherwise scale the floor DOWN and licence a volume the pipette cannot
 * actually deliver.
 *
 * @param {object} p
 * @param {number} [p.floorUl] Smallest volume the loading instrument can deliver.
 * @param {number} [p.capacityUl] Most one carrier holds. Omit when nothing bounds it.
 * @param {number} [p.avgBodyWeightG]
 * @param {number} [p.minBodyWeightG] Lightest subject. Optional.
 * @param {number} [p.maxBodyWeightG] Heaviest subject. Optional.
 * @returns {{ floorUl: number, capacityUl: number | undefined, lightestRatio: number,
 *   heaviestRatio: number, scaled: boolean, feasible: boolean, issues: Issue[] }}
 */
export function computeCohortVolumeBounds({
  floorUl,
  capacityUl,
  avgBodyWeightG,
  minBodyWeightG,
  maxBodyWeightG,
}) {
  const floor = toNonNegativeNumber(floorUl) ?? 0;
  const capacity = toPositiveNumber(capacityUl);
  const avgG = toPositiveNumber(avgBodyWeightG);
  const minG = toPositiveNumber(minBodyWeightG);
  const maxG = toPositiveNumber(maxBodyWeightG);

  /** @type {Issue[]} */
  const issues = [];
  const unscaled = {
    floorUl: floor,
    capacityUl: capacity,
    lightestG: avgG,
    heaviestG: avgG,
    lightestRatio: 1,
    heaviestRatio: 1,
    scaled: false,
    feasible: capacity === undefined || floor <= capacity,
    issues,
  };

  if (avgG === undefined || (minG === undefined && maxG === undefined)) return unscaled;

  if (minG !== undefined && maxG !== undefined && maxG < minG) {
    issues.push({
      level: 'warning',
      message:
        'The lightest subject is heavier than the heaviest one. The range is ignored until that ' +
        'is fixed, so the volume below is sized for the average subject only.',
    });
    return unscaled;
  }

  if ((minG !== undefined && minG > avgG) || (maxG !== undefined && maxG < avgG)) {
    issues.push({
      level: 'warning',
      message:
        `Your average body mass (${round(avgG)} g) sits outside the ${round(minG ?? avgG)}–` +
        `${round(maxG ?? avgG)} g range. One of the two is wrong; the range is being widened to ` +
        'include the average so the volume stays deliverable for it.',
    });
  }

  const lightestG = Math.min(minG ?? avgG, avgG);
  const heaviestG = Math.max(maxG ?? avgG, avgG);
  const lightestRatio = lightestG / avgG;
  const heaviestRatio = heaviestG / avgG;

  const scaledFloorUl = floor / lightestRatio;
  const scaledCapacityUl = capacity === undefined ? undefined : capacity / heaviestRatio;

  return {
    floorUl: scaledFloorUl,
    capacityUl: scaledCapacityUl,
    lightestG,
    heaviestG,
    lightestRatio,
    heaviestRatio,
    scaled: true,
    feasible: scaledCapacityUl === undefined || scaledFloorUl <= scaledCapacityUl,
    issues,
  };
}

/**
 * Bench reference table: for each body weight, the volume to load.
 *
 * @returns {Array<{ bodyWeightG: number, doseMg: number, loadVolumeUl: number,
 *   overCapacity: boolean, belowPipetteMinimum: boolean }> | null}
 */
export function computeMealwormDosingTable({
  doseRateMgPerG,
  stockConcentrationMgPerMl,
  minBodyWeightG,
  maxBodyWeightG,
  stepG,
  wormCapacityUl,
  syringeMinUl,
}) {
  const rate = toPositiveNumber(doseRateMgPerG);
  const stock = toPositiveNumber(stockConcentrationMgPerMl);
  const minG = toPositiveNumber(minBodyWeightG);
  const maxG = toPositiveNumber(maxBodyWeightG);
  const step = toPositiveNumber(stepG);
  const capacity = toPositiveNumber(wormCapacityUl);
  const syringeMin = toNonNegativeNumber(syringeMinUl);

  if (rate === undefined || stock === undefined) return null;
  if (minG === undefined || maxG === undefined || step === undefined) return null;
  if (maxG < minG) return null;

  // Guard against a tiny step over a wide range generating thousands of rows.
  const rowCount = Math.floor((maxG - minG) / step) + 1;
  if (rowCount > 200) return null;

  const rows = [];
  for (let i = 0; i < rowCount; i += 1) {
    const bodyWeightG = minG + i * step;
    const doseMg = rate * bodyWeightG;
    const loadVolumeUl = (doseMg / stock) * 1000;
    rows.push({
      bodyWeightG,
      doseMg,
      loadVolumeUl,
      overCapacity: capacity !== undefined && loadVolumeUl > capacity,
      belowSyringeMinimum: syringeMin !== undefined && syringeMin > 0 && loadVolumeUl < syringeMin,
    });
  }
  return rows;
}

/**
 * Build a vehicle from the chemistry, rather than checking one the user
 * guessed.
 *
 * The order matters and it is not the order a ratio table implies:
 *
 *   1. Solubility fixes how much primary solvent is needed. This is not a
 *      choice — mass / solubility, and no percentage can change it.
 *   2. That solvent volume is checked for tolerability, in mg/kg. Too high
 *      means no vehicle built on this solvent will work at this dose; you
 *      need a co-solvent or a solvent the drug likes better.
 *   3. Only then does total volume matter. If the solvent volume alone is
 *      below what the syringe can deliver, diluent is added to bring the
 *      dose up to a volume that can actually be measured.
 *   4. The ratio falls out of those volumes. It is an output.
 *
 * A drug that dissolves in the diluent needs no step 1 at all — pass no
 * solubility and the plan is simply "one solvent, volume set by the syringe".
 *
 * @param {object} p
 * @param {number} p.dosePerSubjectMg
 * @param {number} [p.solubilityMgPerMl] Omit when the drug dissolves in the diluent.
 * @param {number} p.syringeMinUl Smallest volume the loading tool can deliver.
 * @param {number} p.maxVolumeUl Worm capacity, or any per-subject volume ceiling.
 * @param {number} [p.preferredVolumeUl] A volume the user finds comfortable.
 * @returns {object | null}
 */
export function computeVehiclePlan({
  dosePerSubjectMg,
  solubilityMgPerMl,
  syringeMinUl,
  maxVolumeUl,
  preferredVolumeUl,
}) {
  const dose = toPositiveNumber(dosePerSubjectMg);
  const syringeMin = toNonNegativeNumber(syringeMinUl) ?? 0;
  const maxVolume = toPositiveNumber(maxVolumeUl);
  const solubility = toPositiveNumber(solubilityMgPerMl);
  const preferred = toPositiveNumber(preferredVolumeUl);
  if (dose === undefined || maxVolume === undefined) return null;

  /** @type {Issue[]} */
  const issues = [];

  // Step 1 — how much primary solvent the drug actually requires.
  const primaryVolumeUl = solubility === undefined ? 0 : (dose / solubility) * 1000;

  // Step 3 — the smallest total volume that is both measurable and sufficient.
  const minimumWorkableUl = Math.max(primaryVolumeUl, syringeMin);
  const suggestedVolumeUl =
    preferred !== undefined && preferred >= minimumWorkableUl && preferred <= maxVolume
      ? preferred
      : minimumWorkableUl;

  const diluentVolumeUl = Math.max(0, suggestedVolumeUl - primaryVolumeUl);

  if (primaryVolumeUl > maxVolume) {
    issues.push({
      level: 'error',
      message:
        `Dissolving ${round(dose)} mg needs ${round(primaryVolumeUl)} µL of solvent, more than the ` +
        `${round(maxVolume)} µL that fits. No vehicle can fix this — you need a solvent the drug ` +
        'is more soluble in, a smaller dose, or more than one worm.',
    });
  } else if (minimumWorkableUl > maxVolume) {
    issues.push({
      level: 'error',
      message:
        `The smallest measurable dose is ${round(minimumWorkableUl)} µL but only ` +
        `${round(maxVolume)} µL fits. A finer syringe or a larger worm is needed.`,
    });
  }

  if (solubility !== undefined && primaryVolumeUl < syringeMin && primaryVolumeUl > 0) {
    issues.push({
      level: 'warning',
      message:
        `The drug needs only ${round(primaryVolumeUl)} µL of solvent, below the ${round(syringeMin)} µL ` +
        'your syringe can measure. Diluent is required to bring the dose up to a workable volume — ' +
        'that is what the second solvent is for.',
    });
  }

  const totalForRatio = primaryVolumeUl + diluentVolumeUl;
  return {
    primaryVolumeUl,
    diluentVolumeUl,
    suggestedVolumeUl,
    minimumWorkableUl,
    /** Concentration the finished vehicle would carry. */
    concentrationMgPerMl: suggestedVolumeUl > 0 ? dose / (suggestedVolumeUl / 1000) : undefined,
    /** %v/v of the primary solvent — derived, never entered. */
    primaryPercentVv: totalForRatio > 0 ? (primaryVolumeUl / totalForRatio) * 100 : 0,
    /** Whether diluent is needed at all. */
    needsDiluent: diluentVolumeUl > 0,
    issues,
  };
}

/**
 * Can the vehicle actually dissolve the drug at the concentration required?
 *
 * A drug dissolved in a primary solvent cannot be more concentrated in the
 * finished mix than (its solubility in that solvent) x (the fraction of the
 * mix that solvent is). Exceed that and the batch is a suspension, whatever
 * the arithmetic upstream says.
 *
 * The ceiling is conservative. It assumes the drug is soluble only in the
 * primary solvent, which a surfactant can beat by holding the compound in a
 * stable emulsion — so treat a failure as "check this at the bench", not as
 * a proof of impossibility.
 *
 * @returns {{ ceilingMgPerMl: number, requiredMgPerMl: number,
 *   achievable: boolean, minSolventFraction: number } | null}
 */
export function checkSolubilityCeiling({
  requiredConcentrationMgPerMl,
  solubilityMgPerMl,
  primarySolventPercentVv,
}) {
  const required = toPositiveNumber(requiredConcentrationMgPerMl);
  const solubility = toPositiveNumber(solubilityMgPerMl);
  const fraction = toPositiveNumber(primarySolventPercentVv);
  if (required === undefined || solubility === undefined || fraction === undefined) return null;

  const ceilingMgPerMl = solubility * (fraction / 100);
  return {
    ceilingMgPerMl,
    requiredMgPerMl: required,
    achievable: required <= ceilingMgPerMl,
    // The share of the mix the primary solvent would have to be to work.
    minSolventFraction: Math.min(100, (required / solubility) * 100),
  };
}

/**
 * Dose rate in mg per gram of body weight, from the Step 2 dose inputs.
 *
 * "0.2 mg per 10 g" and "0.02 mg per 1 g" are the same rate; both are entered
 * as an amount and a reference weight.
 */
export function computeDoseRateMgPerG({ doseAmount, doseUnit, refBodyWeight, refBodyWeightUnit, molecularWeightGPerMol }) {
  if (toNonNegativeNumber(doseAmount) === undefined) return undefined;
  const doseMg = drugAmountToMg(doseAmount, doseUnit, molecularWeightGPerMol);
  const refG = weightToG(refBodyWeight, refBodyWeightUnit);
  if (doseMg === undefined || refG === undefined || refG <= 0) return undefined;
  return doseMg / refG;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
