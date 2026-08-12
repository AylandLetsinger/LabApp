/**
 * Getting from a tube of powder to a very dilute working solution.
 *
 * THE PROBLEM THIS EXISTS FOR
 * ---------------------------
 * A 10 nM bath application of something with a molecular weight around 500 is
 * 5 ng per millilitre. Two millilitres of it contains ten nanograms of drug.
 * No balance in a normal lab weighs ten nanograms, so the drug cannot be
 * weighed into the thing it ends up in — it has to be weighed once, at a mass
 * a balance can actually resolve, and then walked down in steps.
 *
 * The question people get stuck on is not the arithmetic of any one step. It
 * is "what stock should I make", and that has no answer until three limits are
 * on the table:
 *
 *   THE BALANCE sets the smallest mass that can be weighed at all, and so the
 *   most dilute stock a single weighing can produce.
 *
 *   THE PIPETTE sets the smallest volume that can be transferred, and so the
 *   largest fold any one step can achieve at a given working volume.
 *
 *   ACCURACY sets how large a single step should be regardless. A hundredfold
 *   step in one move is a pipetting error multiplied by a hundred, and the
 *   error compounds down the chain.
 *
 * Given those, the number of steps follows, and so does the stock.
 *
 * WHY THE STEPS ARE EQUAL
 * -----------------------
 * Splitting a total fold into n equal steps minimises the worst-case relative
 * error of the chain. Two steps of 100 and 2 are not as good as two steps of
 * about 14 each, even though both reach 200: the error of the large step is
 * carried by everything after it.
 */
import { toPositiveNumber } from '../dosage/numberUtils';

/** More than this many steps means the plan is not one anybody would follow. */
const MAX_STEPS = 8;

/**
 * The most dilute stock a single weighing can honestly produce.
 *
 * Weighing less than the balance resolves does not make a more dilute stock,
 * it makes an unknown one. Dissolving the same minimum in more solvent does.
 *
 * @returns {number | undefined} mg/mL.
 */
export function stockConcentrationMgPerMl(massMg, volumeMl) {
  const mass = toPositiveNumber(massMg);
  const volume = toPositiveNumber(volumeMl);
  if (mass === undefined || volume === undefined) return undefined;
  return mass / volume;
}

/**
 * How many equal steps are needed, and how large each one is.
 *
 * @returns {{ steps: number, foldPerStep: number, totalFold: number } | undefined}
 */
export function stepPlan(totalFold, maxFoldPerStep) {
  const total = toPositiveNumber(totalFold);
  const max = toPositiveNumber(maxFoldPerStep);
  if (total === undefined || max === undefined || max <= 1) return undefined;
  if (total <= 1) return { steps: 0, foldPerStep: 1, totalFold: total };
  const steps = Math.ceil(Math.log(total) / Math.log(max) - 1e-12);
  if (steps > MAX_STEPS) return undefined;
  return { steps, foldPerStep: total ** (1 / steps), totalFold: total };
}

/**
 * The whole chain, from the stock to the vessel it ends up in.
 *
 * Every step but the last makes a fixed intermediate volume. The last one is
 * the working solution itself, which is why its transfer is worked out from
 * the working volume rather than from the intermediate volume.
 *
 * @param {object} p
 * @param {number} p.stockMgPerMl
 * @param {number} p.targetMgPerMl
 * @param {number} p.workingVolumeMl The volume actually applied, in total.
 * @param {number} p.intermediateVolumeMl How much of each intermediate to make.
 * @param {number} [p.pipetteMinMl]
 * @param {number} [p.maxFoldPerStep]
 * @returns {{ steps: Array<object>, foldPerStep: number, totalFold: number,
 *            tooManySteps: boolean, stockTooWeak: boolean } | undefined}
 */
export function planDilutionSeries({
  stockMgPerMl,
  targetMgPerMl,
  workingVolumeMl,
  intermediateVolumeMl,
  pipetteMinMl = 0,
  maxFoldPerStep = 100,
}) {
  const stock = toPositiveNumber(stockMgPerMl);
  const target = toPositiveNumber(targetMgPerMl);
  const working = toPositiveNumber(workingVolumeMl);
  const intermediate = toPositiveNumber(intermediateVolumeMl);
  if (stock === undefined || target === undefined || working === undefined) return undefined;
  if (intermediate === undefined) return undefined;

  const totalFold = stock / target;
  // A stock at or below the target cannot be diluted to reach it.
  if (totalFold <= 1) {
    return { steps: [], foldPerStep: 1, totalFold, tooManySteps: false, stockTooWeak: true };
  }

  const plan = stepPlan(totalFold, maxFoldPerStep);
  if (plan === undefined) {
    return { steps: [], foldPerStep: 0, totalFold, tooManySteps: true, stockTooWeak: false };
  }

  const { steps: count, foldPerStep } = plan;
  const steps = [];
  let from = stock;
  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1;
    // The last step makes the working solution; the rest make intermediates.
    const finalVolumeMl = isLast ? working : intermediate;
    const to = isLast ? target : from / foldPerStep;
    const transferMl = finalVolumeMl / foldPerStep;
    steps.push({
      index: i + 1,
      isLast,
      fromMgPerMl: from,
      toMgPerMl: to,
      transferMl,
      diluentMl: finalVolumeMl - transferMl,
      finalVolumeMl,
      belowPipetteMinimum: pipetteMinMl > 0 && transferMl < pipetteMinMl,
    });
    from = to;
  }

  return { steps, foldPerStep, totalFold, tooManySteps: false, stockTooWeak: false };
}

/**
 * The intermediate volume that keeps every transfer above the pipette floor.
 *
 * A transfer is the volume being made divided by the fold, so the smallest
 * volume that works is the pipette minimum times the fold. The margin is there
 * because a transfer sitting exactly on the pipette's floor is its least
 * accurate measurement, not its most.
 *
 * @returns {number | undefined} Millilitres.
 */
export function suggestIntermediateVolumeMl(foldPerStep, pipetteMinMl, margin = 5) {
  const fold = toPositiveNumber(foldPerStep);
  const min = toPositiveNumber(pipetteMinMl);
  if (fold === undefined || min === undefined) return undefined;
  return fold * min * margin;
}

/**
 * How much drug the plan actually consumes, and what is left.
 *
 * Only the stock costs drug — every step after it spends a fraction of a
 * millilitre of something already made. For a compound sold in 5 mg lots at
 * hundreds of pounds a lot, that is the number worth seeing.
 *
 * @returns {{ usedMg: number, leftMg: number | undefined }}
 */
export function powderUsed(massWeighedMg, massAvailableMg) {
  const used = toPositiveNumber(massWeighedMg);
  const available = toPositiveNumber(massAvailableMg);
  return {
    usedMg: used,
    leftMg: used !== undefined && available !== undefined ? available - used : undefined,
  };
}
