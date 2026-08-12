/**
 * Anything delivered at a rate for a duration.
 *
 * A minipump into a ventricle and a syringe pump into a jugular line pose the
 * same arithmetic: volume is rate times time, the reservoir has to hold it, and
 * a protocol written per day has to be reconciled with a syringe filled once.
 * None of that is a property of where the line ends, so it lives here rather
 * than in either route's module.
 */
import { toNonNegativeNumber, toPositiveNumber } from './numberUtils';

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
 * Convert between a total dose and a daily one.
 *
 * A chronic protocol is usually written per day — "1 ug/day for 14 days" —
 * while the reservoir is filled to a total. Getting this backwards is a
 * fourteen-fold error, so both directions are named rather than left to a
 * multiplication at the call site.
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
 * A pump or syringe that empties before the study ends stops dosing silently —
 * the animal carries on looking dosed — so this is worth checking beforehand
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

/**
 * The concentration that puts `doseMg` into `volumeMl`.
 *
 * @returns {number | undefined} mg/mL.
 */
export function concentrationForDose(doseMg, volumeMl) {
  const dose = toNonNegativeNumber(doseMg);
  const volume = toPositiveNumber(volumeMl);
  if (dose === undefined || volume === undefined) return undefined;
  return dose / volume;
}
