/**
 * Split a dose volume across vehicle solvents.
 *
 * Two kinds of row, and the distinction is the whole point:
 *
 *   A solvent the drug is dissolved IN has its volume fixed by chemistry —
 *   mass / solubility. It is not a share of anything and no ratio can change
 *   it. Pass it as `fixedVolumeMl`.
 *
 *   Every other solvent is diluent, and those DO share what is left over,
 *   in proportion to their ratio parts.
 *
 * When no row is fixed this behaves exactly as a plain ratio split, which is
 * what a user who already has a vehicle recipe expects.
 *
 * Percentages are computed from the resulting volumes rather than from the
 * ratio parts, so they stay correct when the two kinds of row are mixed.
 *
 * Two guarantees, both of which an earlier version broke at the display layer:
 *   1. Displayed volumes sum exactly to the total.
 *   2. A row too small to measure is reported, never rounded silently to zero.
 */
import { roundToStep, toNonNegativeNumber } from './numberUtils';

/**
 * @typedef {object} VehicleVolumeRow
 * @property {number} exactMl
 * @property {number} displayMl Rounded to what the pipette can deliver.
 * @property {number} percentVv Share of the finished vehicle.
 * @property {boolean} isFixed Volume set by solubility rather than by ratio.
 * @property {boolean} belowPipetteMinimum
 */

/**
 * @param {number | undefined} totalVolumeMl
 * @param {Array<{parts?: unknown, fixedVolumeMl?: number}>} rows In UI order.
 * @param {object} [options]
 * @param {number} [options.pipetteStepMl]
 * @returns {{ rows: VehicleVolumeRow[], overflowMl: number } | null}
 */
export function computeVehicleVolumes(totalVolumeMl, rows, options = {}) {
  const { pipetteStepMl = 0 } = options;

  if (totalVolumeMl === undefined || !Number.isFinite(totalVolumeMl) || totalVolumeMl <= 0) {
    return null;
  }
  if (rows.length === 0) return null;

  const fixed = rows.map((r) =>
    Number.isFinite(r.fixedVolumeMl) && r.fixedVolumeMl >= 0 ? r.fixedVolumeMl : undefined,
  );
  const fixedTotal = fixed.reduce((sum, v) => sum + (v ?? 0), 0);

  // Diluent rows share whatever the fixed solvents leave behind.
  const diluentIndexes = rows.map((_, i) => i).filter((i) => fixed[i] === undefined);
  const parts = diluentIndexes.map((i) => toNonNegativeNumber(rows[i].parts));
  if (parts.some((p) => p === undefined)) return null;
  const partsTotal = parts.reduce((sum, p) => sum + p, 0);

  // Nothing to share out, and nothing that wants a share: a single fixed row.
  if (diluentIndexes.length > 0 && partsTotal <= 0 && fixedTotal <= 0) return null;

  const remainingMl = totalVolumeMl - fixedTotal;
  const overflowMl = remainingMl < 0 ? -remainingMl : 0;

  const exact = new Array(rows.length).fill(0);
  fixed.forEach((v, i) => {
    if (v !== undefined) exact[i] = v;
  });

  if (diluentIndexes.length > 0 && partsTotal > 0 && remainingMl > 0) {
    let allocated = 0;
    diluentIndexes.forEach((rowIndex, n) => {
      const isLast = n === diluentIndexes.length - 1;
      // The last diluent absorbs float drift so the exact volumes sum true.
      const ml = isLast ? remainingMl - allocated : remainingMl * (parts[n] / partsTotal);
      exact[rowIndex] = ml;
      allocated += ml;
    });
  }

  // Round for display, again letting one row absorb the error so the printed
  // recipe adds up. A fixed row is never the absorber — its value is chemistry.
  const display = exact.map((ml) => roundToStep(ml, pipetteStepMl));
  const absorber =
    diluentIndexes.length > 0 ? diluentIndexes[diluentIndexes.length - 1] : exact.length - 1;
  const displayedOthers = display.reduce((sum, ml, i) => (i === absorber ? sum : sum + ml), 0);
  display[absorber] = totalVolumeMl - displayedOthers;

  const volumeTotal = exact.reduce((sum, ml) => sum + ml, 0);

  return {
    overflowMl,
    rows: exact.map((exactMl, i) => ({
      exactMl,
      displayMl: display[i],
      percentVv: volumeTotal > 0 ? (exactMl / volumeTotal) * 100 : 0,
      isFixed: fixed[i] !== undefined,
      belowPipetteMinimum: pipetteStepMl > 0 && exactMl > 0 && exactMl < pipetteStepMl,
    })),
  };
}

/**
 * Volume of primary solvent a dose requires, in mL. Chemistry, not choice.
 *
 * @returns {number | undefined} undefined when no solubility is given, which
 *   means the drug dissolves in the diluent and needs no primary solvent.
 */
export function primarySolventVolumeMl(doseMg, solubilityMgPerMl) {
  const dose = toNonNegativeNumber(doseMg);
  const solubility = toNonNegativeNumber(solubilityMgPerMl);
  if (dose === undefined || solubility === undefined || solubility <= 0) return undefined;
  return dose / solubility;
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
