import { massToMg, weightToKg } from './unitConversions';

/**
 * Dose per average subject from dose-by-body-weight inputs.
 * rate (mass/kg) = dose / reference body weight; result = rate × average body weight (in kg).
 */
export function computeDosePerAvgSubjectByBodyWeight({
  doseAmount,
  doseUnit,
  refBodyWeight,
  refBodyWeightUnit,
  avgBodyWeight,
  /** Step 3 field is grams today; pass another unit when the UI supports it. */
  avgBodyWeightUnit = 'g',
}) {
  const doseMg = massToMg(doseAmount, doseUnit);
  const refKg = weightToKg(refBodyWeight, refBodyWeightUnit);
  const avgKg = weightToKg(avgBodyWeight, avgBodyWeightUnit);
  if (doseMg === undefined || refKg === undefined || avgKg === undefined) return undefined;
  if (refKg <= 0) return undefined;
  const rateMgPerKg = doseMg / refKg;
  return rateMgPerKg * avgKg;
}

/**
 * When dose is entered directly per subject, dose per average subject is that dose (as mass in mg).
 */
export function computeDosePerAvgSubjectFromPerSubject({ doseAmount, doseUnit }) {
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
      avgBodyWeightUnit: p.avgBodyWeightUnit ?? 'g',
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

/** Mass unit to show for “Dose per Avg Subject” (match the active dosage row). */
export function dosePerAvgSubjectDisplayUnit(dosageType, doseUnit, dosePerSubjectUnit) {
  return dosageType === 'by-body-weight' ? doseUnit : dosePerSubjectUnit;
}
