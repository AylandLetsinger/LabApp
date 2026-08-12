/**
 * Molar quantities, for the very common case where a dose or a solution is
 * specified in moles rather than mass.
 *
 * Everything here needs a molecular weight, and without one the conversions
 * return `undefined` rather than guessing. That is the whole reason molar
 * units are gated behind an explicit molecular weight field: a molar figure
 * with the wrong molecular weight is wrong by an arbitrary factor and looks
 * entirely plausible.
 *
 * The identity worth remembering:
 *
 *     1 M = 1 mol/L = (MW) g/L = (MW) mg/mL
 *
 * so a 20 mM solution of something with MW 342.39 is 6.85 mg/mL.
 */
import { toOptionalNumber, toPositiveNumber } from './numberUtils';
import { massToMg, mgToMassUnit, volumeToMl } from './unitConversions';

/** Amounts of substance, largest first. */
export const MOLAR_AMOUNT_UNITS = [
  { value: 'mol', label: 'mol' },
  { value: 'mmol', label: 'mmol' },
  { value: 'umol', label: 'µmol' },
  { value: 'nmol', label: 'nmol' },
];

/** Molar concentrations, largest first. */
export const MOLAR_CONCENTRATION_UNITS = [
  { value: 'M', label: 'M' },
  { value: 'mM', label: 'mM' },
  { value: 'uM', label: 'µM' },
  { value: 'nM', label: 'nM' },
];

/** Moles in one of each amount unit. */
const MOL_PER_AMOUNT_UNIT = {
  mol: 1,
  mmol: 1e-3,
  umol: 1e-6,
  nmol: 1e-9,
};

/** Moles per litre in one of each concentration unit. */
const MOL_PER_L_PER_CONCENTRATION_UNIT = {
  M: 1,
  mM: 1e-3,
  uM: 1e-6,
  nM: 1e-9,
};

/**
 * A molar concentration in mol/L, with no molecular weight involved.
 *
 * `molarConcentrationToMgPerMl` needs a molecular weight because it crosses
 * into mass. This one stays inside molarity, so it does not — which is what a
 * calculator solving for the molecular weight itself needs.
 *
 * @returns {number | undefined}
 */
export function molarConcentrationToMolPerL(value, unit) {
  const n = toOptionalNumber(value);
  const molPerL = MOL_PER_L_PER_CONCENTRATION_UNIT[unit];
  if (n === undefined || molPerL === undefined) return undefined;
  return n * molPerL;
}

/** mol/L expressed in one of the molar concentration units. */
export function molPerLToMolarConcentration(molPerL, unit) {
  const factor = MOL_PER_L_PER_CONCENTRATION_UNIT[unit];
  if (!Number.isFinite(molPerL) || factor === undefined) return undefined;
  return molPerL / factor;
}

/** @param {string} unit */
export function isMolarAmountUnit(unit) {
  return Object.prototype.hasOwnProperty.call(MOL_PER_AMOUNT_UNIT, unit);
}

/** @param {string} unit */
export function isMolarConcentrationUnit(unit) {
  return Object.prototype.hasOwnProperty.call(MOL_PER_L_PER_CONCENTRATION_UNIT, unit);
}

/**
 * An amount of substance, in milligrams.
 *
 * @returns {number | undefined} undefined without a molecular weight, because
 *   moles cannot be weighed without one.
 */
export function molarAmountToMg(amount, unit, molecularWeightGPerMol) {
  const n = toOptionalNumber(amount);
  const mw = toPositiveNumber(molecularWeightGPerMol);
  const molPerUnit = MOL_PER_AMOUNT_UNIT[unit];
  if (n === undefined || mw === undefined || molPerUnit === undefined) return undefined;
  // moles x g/mol = grams, then to milligrams.
  return n * molPerUnit * mw * 1000;
}

/**
 * A molar concentration, in mg/mL.
 *
 * @returns {number | undefined}
 */
export function molarConcentrationToMgPerMl(value, unit, molecularWeightGPerMol) {
  const n = toOptionalNumber(value);
  const mw = toPositiveNumber(molecularWeightGPerMol);
  const molPerL = MOL_PER_L_PER_CONCENTRATION_UNIT[unit];
  if (n === undefined || mw === undefined || molPerL === undefined) return undefined;
  // 1 M = MW mg/mL, so mol/L x MW gives mg/mL directly.
  return n * molPerL * mw;
}

/**
 * mg/mL expressed as a molar concentration.
 *
 * @returns {number | undefined}
 */
export function mgPerMlToMolarConcentration(mgPerMl, unit, molecularWeightGPerMol) {
  const mw = toPositiveNumber(molecularWeightGPerMol);
  const molPerL = MOL_PER_L_PER_CONCENTRATION_UNIT[unit];
  if (!Number.isFinite(mgPerMl) || mw === undefined || molPerL === undefined) return undefined;
  return mgPerMl / mw / molPerL;
}

/**
 * A drug amount in milligrams, whether written as a mass or as moles.
 *
 * One entry point means callers do not have to know which kind of unit they
 * were handed, and cannot forget to handle one of them.
 *
 * @param {unknown} amount
 * @param {string} unit A mass unit (mg, ug, ...) or a molar one (mmol, umol, ...)
 * @param {unknown} [molecularWeightGPerMol] Required only for molar units.
 * @returns {number | undefined}
 */
export function drugAmountToMg(amount, unit, molecularWeightGPerMol) {
  if (isMolarAmountUnit(unit)) {
    return molarAmountToMg(amount, unit, molecularWeightGPerMol);
  }
  return massToMg(amount, unit);
}

/**
 * Milligrams expressed as an amount of substance.
 *
 * @returns {number | undefined}
 */
export function mgToMolarAmount(mg, unit, molecularWeightGPerMol) {
  const mw = toPositiveNumber(molecularWeightGPerMol);
  const molPerUnit = MOL_PER_AMOUNT_UNIT[unit];
  if (!Number.isFinite(mg) || mw === undefined || molPerUnit === undefined) return undefined;
  // mg to grams, grams to moles, then moles to the requested unit.
  return mg / 1000 / mw / molPerUnit;
}

/**
 * The inverse of `drugAmountToMg`: milligrams shown in whichever unit was asked
 * for, mass or molar. Read-back displays use this so a dose typed in µmol can
 * be checked in µmol.
 *
 * @returns {number | undefined}
 */
export function mgToDrugAmountUnit(mg, unit, molecularWeightGPerMol) {
  if (isMolarAmountUnit(unit)) {
    return mgToMolarAmount(mg, unit, molecularWeightGPerMol);
  }
  return mgToMassUnit(mg, unit);
}

/** Milligrams in one mL, for each mass-per-millilitre unit. */
const MG_PER_ML_PER_UNIT = {
  'g/ml': 1000,
  'mg/ml': 1,
  'ug/ml': 1e-3,
  'ng/ml': 1e-6,
};

/**
 * A concentration written either as mass per millilitre (mg/mL, µg/mL) or as a
 * molarity, in mg/mL.
 *
 * The in-vitro forms use this rather than the mass-plus-volume pair, because
 * "10 µM" and "5 µg/mL" are each a single choice and pairing them with a
 * separate volume unit would invite "µg per litre" and similar.
 *
 * @returns {number | undefined}
 */
export function anyConcentrationToMgPerMl(value, unit, molecularWeightGPerMol) {
  if (isMolarConcentrationUnit(unit)) {
    return molarConcentrationToMgPerMl(value, unit, molecularWeightGPerMol);
  }
  const n = toOptionalNumber(value);
  const factor = MG_PER_ML_PER_UNIT[unit];
  if (n === undefined || factor === undefined) return undefined;
  return n * factor;
}

/**
 * A concentration in mg/mL, whether written as mass-per-volume or as molarity.
 *
 * @param {unknown} value
 * @param {string} massOrMolarUnit
 * @param {string} volumeUnit Ignored for molar units, which carry their own.
 * @param {unknown} [molecularWeightGPerMol]
 * @returns {number | undefined}
 */
export function concentrationToMgPerMl(value, massOrMolarUnit, volumeUnit, molecularWeightGPerMol) {
  if (isMolarConcentrationUnit(massOrMolarUnit)) {
    return molarConcentrationToMgPerMl(value, massOrMolarUnit, molecularWeightGPerMol);
  }
  const massMg = massToMg(value, massOrMolarUnit);
  const perMl = volumeToMl(1, volumeUnit);
  if (massMg === undefined || perMl === undefined || perMl <= 0) return undefined;
  return massMg / perMl;
}
