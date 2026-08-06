/**
 * Split a working-solution volume across vehicle solvents by ratio parts.
 *
 * Two guarantees this module makes, both of which the previous version broke
 * at the display layer:
 *
 *   1. The volumes shown to the user sum exactly to the total volume. The
 *      last row absorbs all rounding error, so a recipe always adds up.
 *   2. Any row the user cannot physically pipette is reported, not silently
 *      rounded to zero. Telling someone to add "0 uL" of a solvent the
 *      vehicle requires is worse than telling them the plan is unworkable.
 */
import { roundToStep, toNonNegativeNumber } from './numberUtils';

/**
 * @typedef {object} VehicleVolumeRow
 * @property {number} exactMl Unrounded share of the total.
 * @property {number} displayMl Rounded to what a pipette can deliver.
 * @property {number} percentVv Share of the vehicle, as a percentage.
 * @property {boolean} belowPipetteMinimum Too small to measure accurately.
 */

/**
 * @param {number | undefined} totalVolumeMl
 * @param {unknown[]} ratioPartsInOrder Ratio parts, in UI row order.
 * @param {object} [options]
 * @param {number} [options.pipetteStepMl] Smallest deliverable increment.
 * @returns {VehicleVolumeRow[] | null} null if the inputs cannot produce a split.
 */
export function computeVehicleVolumes(totalVolumeMl, ratioPartsInOrder, options = {}) {
  const { pipetteStepMl = 0 } = options;

  if (totalVolumeMl === undefined || !Number.isFinite(totalVolumeMl) || totalVolumeMl <= 0) {
    return null;
  }
  if (ratioPartsInOrder.length === 0) return null;

  const parts = ratioPartsInOrder.map(toNonNegativeNumber);
  if (parts.some((v) => v === undefined)) return null;

  const totalParts = parts.reduce((sum, v) => sum + v, 0);
  if (totalParts <= 0) return null;

  // Exact shares first. The last row is the remainder so the exact volumes
  // sum to the total without floating-point drift.
  const exact = [];
  let allocated = 0;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const ml = totalVolumeMl * (parts[i] / totalParts);
    exact.push(ml);
    allocated += ml;
  }
  exact.push(totalVolumeMl - allocated);

  // Rounded shares, using the same remainder trick so the DISPLAYED volumes
  // also sum to the total. Rounding every row independently would not.
  const display = [];
  let displayAllocated = 0;
  for (let i = 0; i < exact.length - 1; i += 1) {
    const ml = roundToStep(exact[i], pipetteStepMl);
    display.push(ml);
    displayAllocated += ml;
  }
  display.push(totalVolumeMl - displayAllocated);

  return exact.map((exactMl, i) => ({
    exactMl,
    displayMl: display[i],
    percentVv: (parts[i] / totalParts) * 100,
    // A row is unpipettable when it is a real, required volume that falls
    // below the smallest increment the pipette can deliver. Zero parts are
    // deliberate omissions, not problems.
    belowPipetteMinimum:
      pipetteStepMl > 0 && exactMl > 0 && exactMl < pipetteStepMl,
  }));
}

/**
 * Percentage of each solvent in the vehicle, independent of total volume.
 *
 * @param {unknown[]} ratioPartsInOrder
 * @returns {number[] | null}
 */
export function computeVehiclePercents(ratioPartsInOrder) {
  if (ratioPartsInOrder.length === 0) return null;
  const parts = ratioPartsInOrder.map(toNonNegativeNumber);
  if (parts.some((v) => v === undefined)) return null;
  const totalParts = parts.reduce((sum, v) => sum + v, 0);
  if (totalParts <= 0) return null;
  return parts.map((v) => (v / totalParts) * 100);
}
