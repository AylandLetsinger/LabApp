/**
 * Unit conversion for every calculator.
 *
 * The rule this module exists to enforce: **all arithmetic happens in
 * canonical units — milligrams and millilitres.** Values enter through a
 * `xToCanonical` function and leave through a `canonicalToX` function.
 * Nothing in between ever sees a user-facing unit.
 *
 * A previous version of the dosage calculator broke this rule: one code path
 * honoured the body-weight unit selector and another assumed grams, which
 * produced a silent 1000x error in the injection volume. Every conversion
 * now goes through here.
 */
import { toOptionalNumber } from './numberUtils';

/** @typedef {'mg' | 'ug' | 'g'} MassUnit */
/** @typedef {'kg' | 'g'} WeightUnit */
/** @typedef {'ml' | 'ul' | 'l'} VolumeUnit */

/** Milligrams in one of each supported mass unit. */
const MG_PER_MASS_UNIT = {
  g: 1000,
  mg: 1,
  ug: 1e-3,
  ng: 1e-6,
  pg: 1e-9,
};

/** Convert a mass amount to milligrams. */
export function massToMg(amount, unit) {
  const n = toOptionalNumber(amount);
  const factor = MG_PER_MASS_UNIT[unit];
  if (n === undefined || factor === undefined) return undefined;
  return n * factor;
}

/** Convert milligrams to the given mass unit. */
export function mgToMassUnit(mg, unit) {
  const factor = MG_PER_MASS_UNIT[unit];
  if (mg === undefined || !Number.isFinite(mg) || factor === undefined) return undefined;
  return mg / factor;
}

/** Convert a body weight to kilograms. */
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

/**
 * Convert a body weight to grams.
 *
 * Volume-per-body-weight rates are expressed per gram, so this is the
 * companion to `weightToKg` and the one whose absence caused the 1000x bug.
 */
export function weightToG(amount, unit) {
  const kg = weightToKg(amount, unit);
  if (kg === undefined) return undefined;
  return kg * 1000;
}

/** Convert kilograms to the given weight unit. */
export function kgToWeightUnit(kg, unit) {
  if (kg === undefined || !Number.isFinite(kg)) return undefined;
  switch (unit) {
    case 'kg':
      return kg;
    case 'g':
      return kg * 1000;
    default:
      return undefined;
  }
}

/** Convert a volume amount to millilitres. */
export function volumeToMl(amount, unit) {
  const n = toOptionalNumber(amount);
  if (n === undefined) return undefined;
  switch (unit) {
    case 'ml':
      return n;
    case 'ul':
      return n / 1000;
    case 'l':
      return n * 1000;
    default:
      return undefined;
  }
}

/** Convert millilitres to the given volume unit. */
export function mlToVolumeUnit(ml, unit) {
  if (ml === undefined || !Number.isFinite(ml)) return undefined;
  switch (unit) {
    case 'ml':
      return ml;
    case 'ul':
      return ml * 1000;
    case 'l':
      return ml / 1000;
    default:
      return undefined;
  }
}
