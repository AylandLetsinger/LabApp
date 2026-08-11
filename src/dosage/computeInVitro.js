/**
 * Dosing a fixed volume of medium, rather than an animal.
 *
 * The whole calculation is one identity, C1 V1 = C2 V2:
 *
 *     volume of stock = (target concentration x final volume) / stock concentration
 *
 * with two things watched alongside it. The stock brings its own solvent, and
 * in a well that solvent is the limit long before the drug is — cells have no
 * liver. And the pipette has to be able to deliver the volume the identity
 * asks for, which for a potent compound in a strong stock it very often
 * cannot.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO
 * ---------------------------------------
 * It carries no default solvent tolerance. Every tolerability figure in
 * vehicles.js is a mouse or a rat given an injection, and applying those to
 * cultured cells would be wrong by orders of magnitude while looking
 * authoritative. What a preparation tolerates is assay- and line-dependent, so
 * the threshold is the user's to state and this module only compares against
 * whatever they said.
 */
import { toNonNegativeNumber, toPositiveNumber } from './numberUtils';

/**
 * Volume of stock that puts `targetMgPerMl` into `finalVolumeMl`.
 *
 * The final volume is the volume AFTER the stock goes in — the well is made up
 * to it, not spiked on top of it. Spiking 2 uL into a 200 uL well gives 202 uL
 * and a concentration 1% below target; small, but it is an error that grows
 * with the volume added and there is no reason to carry it.
 *
 * @returns {number | undefined} Millilitres.
 */
export function stockVolumeMl(targetMgPerMl, finalVolumeMl, stockMgPerMl) {
  const target = toNonNegativeNumber(targetMgPerMl);
  const final = toPositiveNumber(finalVolumeMl);
  const stock = toPositiveNumber(stockMgPerMl);
  if (target === undefined || final === undefined || stock === undefined) return undefined;
  return (target * final) / stock;
}

/**
 * The fraction of the finished volume that is the stock's own solvent.
 *
 * A stock is not always neat solvent — a 10 mM stock in 50% DMSO carries half
 * the burden of the same stock in neat DMSO — so the fraction is a parameter
 * rather than an assumption.
 *
 * @returns {number | undefined} A percentage of the final volume, v/v.
 */
export function solventPercentVv(stockVolumeMlValue, finalVolumeMl, solventFractionOfStock = 1) {
  const added = toNonNegativeNumber(stockVolumeMlValue);
  const final = toPositiveNumber(finalVolumeMl);
  const fraction = toNonNegativeNumber(solventFractionOfStock);
  if (added === undefined || final === undefined || fraction === undefined) return undefined;
  return (added / final) * fraction * 100;
}

/**
 * Everything one substance contributes to one vessel.
 *
 * @param {object} p
 * @param {number} [p.targetMgPerMl]
 * @param {number} [p.stockMgPerMl]
 * @param {number} [p.finalVolumeMl]
 * @param {number} [p.solventFractionOfStock]
 * @returns {{stockMl: number|undefined, solventPct: number|undefined}}
 */
export function perVesselContribution({
  targetMgPerMl,
  stockMgPerMl,
  finalVolumeMl,
  solventFractionOfStock = 1,
}) {
  const stockMl = stockVolumeMl(targetMgPerMl, finalVolumeMl, stockMgPerMl);
  return {
    stockMl,
    solventPct: solventPercentVv(stockMl, finalVolumeMl, solventFractionOfStock),
  };
}

/**
 * Solvent from every substance in the vessel, added up.
 *
 * Two stocks both in DMSO put twice the DMSO in the well. Reporting them
 * separately and leaving the reader to add them is how a pair of individually
 * innocent numbers becomes a dead plate.
 *
 * @returns {number | undefined} undefined if any contribution is unknown.
 */
export function totalSolventPercentVv(contributions) {
  if (contributions.length === 0) return undefined;
  if (contributions.some((c) => c.solventPct === undefined)) return undefined;
  return contributions.reduce((sum, c) => sum + c.solventPct, 0);
}

/** The medium left once every stock has taken its share of the final volume. */
export function mediumVolumeMl(finalVolumeMl, contributions) {
  const final = toPositiveNumber(finalVolumeMl);
  if (final === undefined) return undefined;
  if (contributions.some((c) => c.stockMl === undefined)) return undefined;
  return final - contributions.reduce((sum, c) => sum + c.stockMl, 0);
}

/** Guard against a range that would generate an unusable number of rows. */
const MAX_SERIES_ROWS = 200;

/** Slack for comparing figures that arithmetic should have made exactly equal. */
const SERIES_EPSILON = 1e-9;

/**
 * A concentration series: the same vessel at a range of target concentrations.
 *
 * The in-vitro counterpart of the dosing table by body mass. Where that scales
 * one rate across the animals you have, this scales one stock across the
 * concentrations you want, and flags the rows the pipette or the solvent limit
 * rules out — which is usually the top of the range, and always worth knowing
 * before the plate is seeded rather than after.
 *
 * Steps geometrically when `factor` is given, because a dose-response curve is
 * a log series; linearly is available but rarely what anyone wants.
 *
 * @returns {Array<object> | null} null when the inputs cannot make a series.
 */
export function concentrationSeries({
  fromMgPerMl,
  toMgPerMl,
  factor,
  stockMgPerMl,
  finalVolumeMl,
  solventFractionOfStock = 1,
  pipetteMinMl = 0,
  maxSolventPct,
}) {
  const from = toPositiveNumber(fromMgPerMl);
  const to = toPositiveNumber(toMgPerMl);
  const step = toPositiveNumber(factor);
  if (from === undefined || to === undefined || step === undefined) return null;
  if (step <= 1 || to < from) return null;

  const rows = [];
  for (let i = 0; ; i += 1) {
    // Each step is computed from the start rather than from the row before.
    // Multiplying repeatedly accumulates float error, and 0.01 x 10 x 10 x 10
    // lands just above 10 rather than on it — enough to report a row sitting
    // exactly on the user's solvent limit as breaching it.
    const c = from * step ** i;
    if (c > to * (1 + SERIES_EPSILON)) break;
    if (rows.length >= MAX_SERIES_ROWS) return null;
    const { stockMl, solventPct } = perVesselContribution({
      targetMgPerMl: c,
      stockMgPerMl,
      finalVolumeMl,
      solventFractionOfStock,
    });
    rows.push({
      targetMgPerMl: c,
      stockMl,
      solventPct,
      belowPipetteMinimum:
        pipetteMinMl > 0 && stockMl !== undefined && stockMl > 0 && stockMl < pipetteMinMl,
      // Compared with the same tolerance, so a limit met exactly is met, not
      // breached. A warning that fires on the number the user chose teaches
      // them to ignore warnings.
      overSolventLimit:
        maxSolventPct !== undefined &&
        solventPct !== undefined &&
        solventPct > maxSolventPct * (1 + SERIES_EPSILON),
      // A stock weaker than the target cannot reach it at any volume: the
      // "volume to add" would exceed the vessel itself.
      strongerThanStock:
        stockMl !== undefined && finalVolumeMl !== undefined && stockMl > finalVolumeMl,
    });
  }
  return rows.length > 0 ? rows : null;
}
