/**
 * Delivery into the brain, where volume is anatomical rather than allometric.
 *
 * Every other route in this app scales volume with the animal: 5 mL/kg means
 * a bigger mouse gets more. A ventricle does not work that way. One microlitre
 * into a lateral ventricle is one microlitre whether the mouse weighs 20 g or
 * 30 g, because what bounds it is the space, not the body mass. So nothing
 * here divides by a weight, and the "mL per kg" idea is absent on purpose.
 *
 * Two practices share that property and little else:
 *
 *   A BOLUS is a fixed volume placed at a site, often at both of a pair. The
 *   concentration follows from the dose and the total volume delivered.
 *
 *   An INFUSION runs at a rate for a duration — a minipump over days, or a
 *   syringe pump over minutes. The volume is the rate times the time, and the
 *   reservoir has to hold it.
 */
import { toNonNegativeNumber, toPositiveNumber } from './numberUtils';

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

/**
 * Volume an infusion delivers over its whole run, in millilitres.
 *
 * @returns {number | undefined}
 */
export function infusionVolumeMl(rateMlPerHour, durationHours) {
  const rate = toPositiveNumber(rateMlPerHour);
  const hours = toPositiveNumber(durationHours);
  if (rate === undefined || hours === undefined) return undefined;
  return rate * hours;
}

/**
 * The concentration that puts `doseMg` into `volumeMl`.
 *
 * The whole calculation, for either practice. Everything else is arriving at
 * the right volume.
 *
 * @returns {number | undefined} mg/mL.
 */
export function concentrationForDose(doseMg, volumeMl) {
  const dose = toNonNegativeNumber(doseMg);
  const volume = toPositiveNumber(volumeMl);
  if (dose === undefined || volume === undefined) return undefined;
  return dose / volume;
}

/**
 * Convert between a total dose and a daily one.
 *
 * A minipump protocol is usually written per day — "1 ug/day for 14 days" —
 * while the solution that goes in the reservoir is made to a total. Getting
 * this backwards is a fourteen-fold error, so both directions are named
 * rather than left to a multiplication at the call site.
 */
export function totalDoseFromDaily(dailyDoseMg, durationHours) {
  const daily = toNonNegativeNumber(dailyDoseMg);
  const hours = toPositiveNumber(durationHours);
  if (daily === undefined || hours === undefined) return undefined;
  return daily * (hours / 24);
}

/** @returns {number | undefined} Milligrams per day. */
export function dailyDoseFromTotal(totalDoseMg, durationHours) {
  const total = toNonNegativeNumber(totalDoseMg);
  const hours = toPositiveNumber(durationHours);
  if (total === undefined || hours === undefined) return undefined;
  return total / (hours / 24);
}

/**
 * Does the reservoir hold what the run needs?
 *
 * A pump that empties before the study ends stops dosing silently — the animal
 * carries on looking dosed — so this is worth checking before implantation
 * rather than discovering in the data.
 *
 * @returns {{ fits: boolean, shortfallMl: number } | undefined}
 */
export function checkReservoir(volumeNeededMl, reservoirMl) {
  const needed = toPositiveNumber(volumeNeededMl);
  const capacity = toPositiveNumber(reservoirMl);
  if (needed === undefined || capacity === undefined) return undefined;
  return { fits: needed <= capacity, shortfallMl: Math.max(0, needed - capacity) };
}

/** Hours in a duration given in days, hours, or minutes. */
export function durationToHours(value, unit) {
  const n = toNonNegativeNumber(value);
  if (n === undefined) return undefined;
  switch (unit) {
    case 'day':
      return n * 24;
    case 'hour':
      return n;
    case 'minute':
      return n / 60;
    default:
      return undefined;
  }
}

export const DURATION_UNITS = [
  { value: 'day', label: 'days' },
  { value: 'hour', label: 'hours' },
  { value: 'minute', label: 'minutes' },
];
