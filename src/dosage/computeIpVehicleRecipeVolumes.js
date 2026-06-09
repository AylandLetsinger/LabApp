import { toOptionalNumber } from './numberUtils';

/**
 * Split total working solution volume (mL) across ratio parts.
 * First n−1 solvents get (totalMl × partᵢ / sumParts); the last gets the remainder so volumes sum exactly.
 *
 * @param {number | undefined} totalVolumeMl
 * @param {unknown[]} ratioPartsInOrder Same order as UI rows (e.g. DMSO, ethanol, Emulphor, saline).
 * @returns {number[] | null} Individual volumes in mL, or null if inputs are invalid.
 */
export function computeVehicleRecipeVolumesMl(totalVolumeMl, ratioPartsInOrder) {
  if (totalVolumeMl === undefined || !Number.isFinite(totalVolumeMl) || totalVolumeMl <= 0) {
    return null;
  }
  const parts = ratioPartsInOrder.map(toOptionalNumber);
  if (parts.length === 0) return null;
  if (parts.some((v) => v === undefined || v < 0)) return null;
  const totalParts = parts.reduce((sum, v) => sum + v, 0);
  if (totalParts <= 0) return null;

  const out = [];
  let allocated = 0;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const ml = totalVolumeMl * (parts[i] / totalParts);
    out.push(ml);
    allocated += ml;
  }
  out.push(totalVolumeMl - allocated);
  return out;
}
