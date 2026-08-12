/**
 * Diluting antibodies into a staining or blotting solution.
 *
 * WHY A FOLD AND NOT A CONCENTRATION
 * ----------------------------------
 * Nobody knows an antibody's concentration. The datasheet gives a working
 * dilution — 1:500 — and that is the number people have, so that is the input.
 *
 * WHY A MIXTURE RATHER THAN ONE ANTIBODY
 * --------------------------------------
 * A primary solution routinely carries several antibodies at once, each at its
 * own dilution, sharing one volume of diluent. Working one at a time and adding
 * the volumes up by hand is the step where the diluent gets counted twice.
 *
 * "1:500" means one volume of antibody in five hundred volumes of FINISHED
 * solution, not one in five hundred and one. That is the convention every
 * datasheet uses, and it is what is implemented.
 */
import { toPositiveNumber } from '../dosage/numberUtils';

/**
 * Working volume from a count of samples.
 *
 * One sample of 10 mL and ten samples of 1 mL are the same 10 mL, which is why
 * there is no separate "just tell me the volume" field: it would be a second
 * way of saying this one.
 *
 * @returns {number | undefined} Millilitres.
 */
export function workingVolumeMl(sampleCount, volumePerSampleMl) {
  const n = toPositiveNumber(sampleCount);
  const each = toPositiveNumber(volumePerSampleMl);
  if (n === undefined || each === undefined) return undefined;
  return n * each;
}

/**
 * How much neat antibody a working volume needs at a given fold.
 *
 * @returns {number | undefined} Millilitres.
 */
export function antibodyVolumeMl(workingMl, foldDilution) {
  const working = toPositiveNumber(workingMl);
  const fold = toPositiveNumber(foldDilution);
  if (working === undefined || fold === undefined) return undefined;
  return working / fold;
}

/**
 * Diluent left once every antibody in the mixture has gone in.
 *
 * Undefined if any antibody volume is unknown — a total that silently omitted
 * one would be a recipe short of an ingredient. Negative is possible and is
 * reported rather than clamped: it means the antibodies alone exceed the
 * volume asked for, which is a real thing to be told.
 *
 * @returns {{ diluentMl: number, overfull: boolean } | undefined}
 */
export function mixtureDiluentMl(workingMl, antibodyVolumesMl) {
  const working = toPositiveNumber(workingMl);
  if (working === undefined) return undefined;
  if (antibodyVolumesMl.length === 0) return { diluentMl: working, overfull: false };
  if (antibodyVolumesMl.some((x) => toPositiveNumber(x) === undefined)) return undefined;
  const used = antibodyVolumesMl.reduce((sum, x) => sum + x, 0);
  return { diluentMl: working - used, overfull: used > working };
}

/**
 * The most working solution a tube of antibody could make.
 *
 * The useful direction of "how much do I have": not whether a particular plan
 * fits, which is a subtraction anyone can do, but what the tube is worth at
 * this dilution. 20 uL at 1:500 is 10 mL of staining solution, and that is the
 * number that decides how many rounds are left.
 *
 * @returns {number | undefined} Millilitres.
 */
export function maxWorkingVolumeMl(stockMl, foldDilution) {
  const stock = toPositiveNumber(stockMl);
  const fold = toPositiveNumber(foldDilution);
  if (stock === undefined || fold === undefined) return undefined;
  return stock * fold;
}
