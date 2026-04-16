import { toOptionalNumber } from './numberUtils';

/** @typedef {'mg' | 'ug' | 'g'} MassUnit */
/** @typedef {'kg' | 'g'} WeightUnit */

/** Convert a mass amount to milligrams. */
export function massToMg(amount, unit) {
  const n = toOptionalNumber(amount);
  if (n === undefined) return undefined;
  switch (unit) {
    case 'mg':
      return n;
    case 'ug':
      return n / 1000;
    case 'g':
      return n * 1000;
    default:
      return undefined;
  }
}

/** Convert milligrams to the given mass unit. */
export function mgToMassUnit(mg, unit) {
  if (mg === undefined || !Number.isFinite(mg)) return undefined;
  switch (unit) {
    case 'mg':
      return mg;
    case 'ug':
      return mg * 1000;
    case 'g':
      return mg / 1000;
    default:
      return undefined;
  }
}

/** Convert a weight amount to kilograms. */
export function weightToKg(amount, unit) {
  const n = toOptionalNumber(amount);
  if (n === undefined) return undefined;
  switch (unit) {
    case 'kg':
      return n;
    case 'g':
      return n / 1000;
    default:
      return undefined;
  }
}
