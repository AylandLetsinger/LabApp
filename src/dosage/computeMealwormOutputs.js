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
import { massToMg, volumeToMl, weightToG } from './unitConversions';

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
  pipetteMinUl,
}) {
  const rate = toPositiveNumber(doseRateMgPerG);
  const stock = toPositiveNumber(stockConcentrationMgPerMl);
  const minG = toPositiveNumber(minBodyWeightG);
  const maxG = toPositiveNumber(maxBodyWeightG);
  const step = toPositiveNumber(stepG);
  const capacity = toPositiveNumber(wormCapacityUl);
  const pipetteMin = toNonNegativeNumber(pipetteMinUl);

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
      belowPipetteMinimum: pipetteMin !== undefined && pipetteMin > 0 && loadVolumeUl < pipetteMin,
    });
  }
  return rows;
}

/**
 * Dose rate in mg per gram of body weight, from the Step 2 dose inputs.
 *
 * "0.2 mg per 10 g" and "0.02 mg per 1 g" are the same rate; both are entered
 * as an amount and a reference weight.
 */
export function computeDoseRateMgPerG({ doseAmount, doseUnit, refBodyWeight, refBodyWeightUnit }) {
  if (toNonNegativeNumber(doseAmount) === undefined) return undefined;
  const doseMg = massToMg(doseAmount, doseUnit);
  const refG = weightToG(refBodyWeight, refBodyWeightUnit);
  if (doseMg === undefined || refG === undefined || refG <= 0) return undefined;
  return doseMg / refG;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
