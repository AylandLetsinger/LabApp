/**
 * Dose per average subject — shared by every delivery method.
 *
 * This step is route-agnostic: how much drug one animal should receive does
 * not depend on whether it arrives by syringe or inside a mealworm.
 */
import { volumeToMl, weightToKg } from './unitConversions';
import { concentrationToMgPerMl, drugAmountToMg } from './molarUnits';
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
  molecularWeightGPerMol,
}) {
  // Reject negatives before any arithmetic: a negative dose must never reach
  // an output field looking like a real number.
  if (toNonNegativeNumber(doseAmount) === undefined) return undefined;
  if (toNonNegativeNumber(refBodyWeight) === undefined) return undefined;
  if (toNonNegativeNumber(avgBodyWeight) === undefined) return undefined;

  const doseMg = drugAmountToMg(doseAmount, doseUnit, molecularWeightGPerMol);
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
export function computeDosePerAvgSubjectFromPerSubject({ doseAmount, doseUnit, molecularWeightGPerMol }) {
  if (toNonNegativeNumber(doseAmount) === undefined) return undefined;
  return drugAmountToMg(doseAmount, doseUnit, molecularWeightGPerMol);
}

/**
 * A dose written as a volume of a solution: "200 uL of a 1 mM solution".
 *
 * Papers report doses this way constantly, particularly with molarities, and
 * it is a statement about the drug rather than about the route — the mass
 * delivered is just volume x concentration.
 *
 * @returns {number | undefined} Milligrams.
 */
export function computeDosePerAvgSubjectFromVolumeConcentration({
  doseVolume,
  doseVolumeUnit,
  doseConcentrationValue,
  doseConcentrationMassUnit,
  doseConcentrationVolumeUnit,
  molecularWeightGPerMol,
}) {
  if (toNonNegativeNumber(doseVolume) === undefined) return undefined;
  if (toNonNegativeNumber(doseConcentrationValue) === undefined) return undefined;

  const volumeMl = volumeToMl(doseVolume, doseVolumeUnit);
  const mgPerMl = concentrationToMgPerMl(
    doseConcentrationValue,
    doseConcentrationMassUnit,
    doseConcentrationVolumeUnit,
    molecularWeightGPerMol,
  );
  if (volumeMl === undefined || mgPerMl === undefined) return undefined;
  return volumeMl * mgPerMl;
}

/**
 * @param {object} p
 * @param {'per-subject' | 'by-body-weight' | 'by-volume-concentration'} p.dosageType
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
      molecularWeightGPerMol: p.molecularWeightGPerMol,
    });
  }
  if (p.dosageType === 'per-subject') {
    return computeDosePerAvgSubjectFromPerSubject({
      doseAmount: p.dosePerSubject,
      doseUnit: p.dosePerSubjectUnit,
      molecularWeightGPerMol: p.molecularWeightGPerMol,
    });
  }
  if (p.dosageType === 'by-volume-concentration') {
    return computeDosePerAvgSubjectFromVolumeConcentration({
      doseVolume: p.doseVolume,
      doseVolumeUnit: p.doseVolumeUnit,
      doseConcentrationValue: p.doseConcentrationValue,
      doseConcentrationMassUnit: p.doseConcentrationMassUnit,
      doseConcentrationVolumeUnit: p.doseConcentrationVolumeUnit,
      molecularWeightGPerMol: p.molecularWeightGPerMol,
    });
  }
  return undefined;
}

/**
 * Mass unit to show for "Dose per Avg Subject" (match the active dosage row).
 *
 * A volume-and-concentration dose names no mass unit of its own, so it falls
 * back to milligrams — the unit everything downstream is stored in.
 */
export function dosePerAvgSubjectDisplayUnit(dosageType, doseUnit, dosePerSubjectUnit) {
  if (dosageType === 'by-body-weight') return doseUnit;
  if (dosageType === 'by-volume-concentration') return 'mg';
  return dosePerSubjectUnit;
}
