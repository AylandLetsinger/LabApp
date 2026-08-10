/**
 * Split a dose volume across vehicle solvents, by ratio.
 *
 * Solubility does NOT fix a solvent's volume — it sets a floor. A vehicle may
 * carry more of a solvent than the drug strictly needs, and published vehicles
 * routinely do. So the ratio drives every volume, and solubility is checked
 * against the result.
 *
 * An earlier version made a solubility-bearing row's volume immovable, which
 * meant a perfectly ordinary recipe like 5:2:2:16 could not be entered.
 *
 * Volumes are NOT snapped to the pipette's minimum. That minimum is a floor on
 * what can be delivered, not a step size: a pipette that reaches 2 uL can
 * deliver 25 uL, or 25.5. Rounding to multiples of the floor is what once
 * turned a 25 uL requirement into a 26 uL suggestion.
 */
import { roundTo, toNonNegativeNumber } from './numberUtils';
import { molarConcentrationToMgPerMl } from './molarUnits';

/**
 * @typedef {object} VehicleVolumeRow
 * @property {number} exactMl
 * @property {number} displayMl Rounded for reading, still summing to the total.
 * @property {number} percentVv Share of the finished vehicle.
 * @property {boolean} belowPipetteMinimum Too small for the pipette to deliver.
 */

/** Decimal places that keep microlitre volumes readable without inventing precision. */
const DISPLAY_DECIMALS_ML = 5;

/**
 * @param {number | undefined} totalVolumeMl
 * @param {Array<{parts?: unknown}>} rows In UI order.
 * @param {object} [options]
 * @param {number} [options.pipetteMinMl] Smallest deliverable volume.
 * @returns {{ rows: VehicleVolumeRow[] } | null}
 */
export function computeVehicleVolumes(totalVolumeMl, rows, options = {}) {
  const { pipetteMinMl = 0 } = options;

  if (totalVolumeMl === undefined || !Number.isFinite(totalVolumeMl) || totalVolumeMl <= 0) {
    return null;
  }
  if (rows.length === 0) return null;

  const parts = rows.map((r) => toNonNegativeNumber(r.parts));
  if (parts.some((p) => p === undefined)) return null;
  const partsTotal = parts.reduce((sum, p) => sum + p, 0);
  if (partsTotal <= 0) return null;

  // The last row absorbs float drift so the volumes sum to the total exactly.
  const exact = [];
  let allocated = 0;
  parts.forEach((part, i) => {
    const isLast = i === parts.length - 1;
    const ml = isLast ? totalVolumeMl - allocated : totalVolumeMl * (part / partsTotal);
    exact.push(ml);
    allocated += ml;
  });

  const display = exact.map((ml) => roundTo(ml, DISPLAY_DECIMALS_ML));
  const last = display.length - 1;
  display[last] = roundTo(
    totalVolumeMl - display.reduce((sum, ml, i) => (i === last ? sum : sum + ml), 0),
    DISPLAY_DECIMALS_ML,
  );

  return {
    rows: exact.map((exactMl, i) => ({
      exactMl,
      displayMl: display[i],
      percentVv: (parts[i] / partsTotal) * 100,
      belowPipetteMinimum: pipetteMinMl > 0 && exactMl > 0 && exactMl < pipetteMinMl,
    })),
  };
}

/**
 * Volume of a solvent a dose needs to dissolve in it, in mL. A floor.
 *
 * @returns {number | undefined} undefined when no solubility is given, meaning
 *   the drug does not rely on this solvent to dissolve.
 */
export function primarySolventVolumeMl(doseMg, solubilityMgPerMl) {
  const dose = toNonNegativeNumber(doseMg);
  const solubility = toNonNegativeNumber(solubilityMgPerMl);
  if (dose === undefined || solubility === undefined || solubility <= 0) return undefined;
  return dose / solubility;
}

/**
 * A row's concentration in mg/mL, whichever unit it was typed in.
 *
 * Rows predating the unit picker carry `solubilityMgPerMl` and no unit; those
 * are already mg/mL, so the fallback keeps them working.
 */
export function rowConcentrationMgPerMl(row, molecularWeightGPerMol) {
  const value = row.concentrationValue ?? row.solubilityMgPerMl;
  const unit = row.concentrationUnit ?? 'mg/ml';
  if (unit === 'mg/ml') return toNonNegativeNumber(value);
  return molarConcentrationToMgPerMl(value, unit, molecularWeightGPerMol);
}

/**
 * The smallest dose volume at which every solvent still meets its minimum.
 *
 * With a ratio fixed, a solvent occupying fraction f of the vehicle reaches
 * its required volume m only once the total is at least m / f. The binding
 * solvent is whichever needs the largest total, and the syringe floor applies
 * on top.
 *
 * @returns {number} Microlitres. Zero when nothing is known yet.
 */
export function suggestedDoseVolumeUl(rows, dosePerSubjectMg, syringeMinUl, molecularWeight) {
  const parts = rows.map((r) => toNonNegativeNumber(r.parts) ?? 0);
  const partsTotal = parts.reduce((sum, p) => sum + p, 0);

  let requiredUl = 0;
  rows.forEach((row, i) => {
    const ml = primarySolventVolumeMl(dosePerSubjectMg, rowConcentrationMgPerMl(row, molecularWeight));
    if (ml === undefined) return;
    const fraction = partsTotal > 0 ? parts[i] / partsTotal : 0;
    // A solvent with no share of the vehicle can never meet a minimum, so it
    // is left to the caller's validation rather than driving an infinite total.
    if (fraction > 0) requiredUl = Math.max(requiredUl, (ml * 1000) / fraction);
  });

  return Math.max(requiredUl, toNonNegativeNumber(syringeMinUl) ?? 0);
}

/**
 * Percentages from ratio parts alone, for callers with no volume context.
 */
export function computeVehiclePercents(ratioPartsInOrder) {
  if (ratioPartsInOrder.length === 0) return null;
  const parts = ratioPartsInOrder.map(toNonNegativeNumber);
  if (parts.some((v) => v === undefined)) return null;
  const totalParts = parts.reduce((sum, v) => sum + v, 0);
  if (totalParts <= 0) return null;
  return parts.map((v) => (v / totalParts) * 100);
}
