/**
 * Dose per average subject — shared by every delivery method.
 *
 * This step is route-agnostic: how much drug one animal should receive does
 * not depend on whether it arrives by syringe or inside a mealworm.
 */
import { massToMg, weightToKg } from './unitConversions';
import { toNonNegativeNumber } from './numberUtils';

/**
 * Dose per average subject from dose-by-body-weight inputs.
 *
 * rate = dose / reference body weight, then result = rate x average weight.
 *
 * @returns {number | undefined} Milligrams, or undefined if any input is
 *   missing, negative, or would divide by zero.
 */
export function computeDosePerAvgSubjectByBodyWeight({
  doseAmount,
  doseUnit,
  refBodyWeight,
  refBodyWeightUnit,
  avgBodyWeight,
  avgBodyWeightUnit,
}) {
  // Reject negatives before any arithmetic: a negative dose must never reach
  // an output field looking like a real number.
  if (toNonNegativeNumber(doseAmount) === undefined) return undefined;
  if (toNonNegativeNumber(refBodyWeight) === undefined) return undefined;
  if (toNonNegativeNumber(avgBodyWeight) === undefined) return undefined;

  const doseMg = massToMg(doseAmount, doseUnit);
  const refKg = weightToKg(refBodyWeight, refBodyWeightUnit);
  const avgKg = weightToKg(avgBodyWeight, avgBodyWeightUnit);
  if (doseMg === undefined || refKg === undefined || avgKg === undefined) return undefined;
  if (refKg <= 0) return undefined;

  const rateMgPerKg = doseMg / refKg;
  return rateMgPerKg * avgKg;
}

/**
 * When dose is entered directly per subject, that dose is the answer.
 *
 * @returns {number | undefined} Milligrams.
 */
export function computeDosePerAvgSubjectFromPerSubject({ doseAmount, doseUnit }) {
  if (toNonNegativeNumber(doseAmount) === undefined) return undefined;
  return massToMg(doseAmount, doseUnit);
}

/**
 * @param {object} p
 * @param {'per-subject' | 'by-body-weight'} p.dosageType
 * @returns {number | undefined} Dose per average subject in milligrams.
 */
export function computeDosePerAvgSubjectMg(p) {
  if (p.dosageType === 'by-body-weight') {
    return computeDosePerAvgSubjectByBodyWeight({
      doseAmount: p.doseAmount,
      doseUnit: p.doseUnit,
      refBodyWeight: p.refBodyWeight,
      refBodyWeightUnit: p.refBodyWeightUnit,
      avgBodyWeight: p.avgBodyWeight,
      avgBodyWeightUnit: p.avgBodyWeightUnit,
    });
  }
  if (p.dosageType === 'per-subject') {
    return computeDosePerAvgSubjectFromPerSubject({
      doseAmount: p.dosePerSubject,
      doseUnit: p.dosePerSubjectUnit,
    });
  }
  return undefined;
}

/** Mass unit to show for "Dose per Avg Subject" (match the active dosage row). */
export function dosePerAvgSubjectDisplayUnit(dosageType, doseUnit, dosePerSubjectUnit) {
  return dosageType === 'by-body-weight' ? doseUnit : dosePerSubjectUnit;
}
