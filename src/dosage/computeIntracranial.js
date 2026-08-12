/**
 * Delivery into the brain, where volume is anatomical rather than allometric.
 *
 * Every other in-vivo route in this app scales volume with the animal: 5 mL/kg
 * means a bigger mouse gets more. A ventricle does not work that way. One
 * microlitre into a lateral ventricle is one microlitre whether the mouse
 * weighs 20 g or 30 g, because what bounds it is the space, not the body mass.
 * So nothing here divides by a weight, and the "mL per kg" idea is absent on
 * purpose.
 *
 * The rate-and-duration half of an infusion is not specific to the brain, so it
 * lives in computeInfusion.js and is re-exported here for the callers that
 * think of it as part of this page.
 */
import { toPositiveNumber } from './numberUtils';

export {
  infusionVolumeMl,
  totalDoseFromDaily,
  dailyDoseFromTotal,
  checkReservoir,
  durationToHours,
  concentrationForDose,
  DURATION_UNITS,
} from './computeInfusion';

/**
 * Volume one subject receives in total, in millilitres.
 *
 * @param {number} volumePerSiteMl
 * @param {unknown} sites
 * @returns {number | undefined}
 */
export function bolusTotalVolumeMl(volumePerSiteMl, sites) {
  const perSite = toPositiveNumber(volumePerSiteMl);
  const n = toPositiveNumber(sites);
  if (perSite === undefined || n === undefined) return undefined;
  return perSite * n;
}

/**
 * How long the needle is delivering, per site, in minutes.
 *
 * Not the same as how long it stays in: tissue needs time to accept the volume
 * before the needle moves, or the dose follows it back up the track. That wait
 * is a protocol decision, so only the delivery time is computed here.
 *
 * @returns {number | undefined}
 */
export function bolusMinutesPerSite(volumePerSiteMl, rateMlPerMin) {
  const perSite = toPositiveNumber(volumePerSiteMl);
  const rate = toPositiveNumber(rateMlPerMin);
  if (perSite === undefined || rate === undefined) return undefined;
  return perSite / rate;
}
