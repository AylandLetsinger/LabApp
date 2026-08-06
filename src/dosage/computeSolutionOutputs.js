/**
 * Working-solution outputs: how much solute, how much volume, what strength.
 *
 * Only `computeVolumePerAvgSubjectMl` is injection-specific. Solute required,
 * total volume, and concentration apply to any delivery method, which is why
 * this file is no longer named after intraperitoneal injection.
 */
import { toNonNegativeNumber, toOptionalNumber } from './numberUtils';
import { weightToG } from './unitConversions';

/** 10% waste -> 1.1. A blank percent means 0%, which the UI flags as unusual. */
export function wasteBufferMultiplier(percentRaw) {
  const p = toNonNegativeNumber(percentRaw);
  return 1 + (p === undefined ? 0 : p) / 100;
}

/**
 * Solute required (mg) = dose per avg subject (mg) x doses x (1 + waste).
 */
export function computeSoluteRequiredMg(dosePerAvgSubjectMg, totalDoses, wasteBufferPct) {
  if (dosePerAvgSubjectMg === undefined || dosePerAvgSubjectMg < 0) return undefined;
  const n = toNonNegativeNumber(totalDoses);
  if (n === undefined) return undefined;
  return dosePerAvgSubjectMg * n * wasteBufferMultiplier(wasteBufferPct);
}

/**
 * Volume per average subject (mL), for methods that scale volume with body
 * weight: (mL per reference weight) x average weight.
 *
 * Both weights are converted to grams here. Passing a raw number and assuming
 * it is already grams is exactly the bug this signature exists to prevent —
 * the caller must state the unit.
 */
export function computeVolumePerAvgSubjectMl({
  volPerInjMl,
  refBodyWeight,
  refBodyWeightUnit,
  avgBodyWeight,
  avgBodyWeightUnit,
}) {
  const ml = toNonNegativeNumber(volPerInjMl);
  if (ml === undefined) return undefined;
  if (toNonNegativeNumber(refBodyWeight) === undefined) return undefined;
  if (toNonNegativeNumber(avgBodyWeight) === undefined) return undefined;

  const refG = weightToG(refBodyWeight, refBodyWeightUnit);
  const avgG = weightToG(avgBodyWeight, avgBodyWeightUnit);
  if (refG === undefined || avgG === undefined) return undefined;
  if (refG <= 0) return undefined;

  return (ml / refG) * avgG;
}

/**
 * Total volume (mL) = volume per avg subject (mL) x doses x (1 + waste).
 */
export function computeTotalVolumeMl(volumePerAvgSubjectMl, totalDoses, wasteBufferPct) {
  if (volumePerAvgSubjectMl === undefined || volumePerAvgSubjectMl < 0) return undefined;
  const n = toNonNegativeNumber(totalDoses);
  if (n === undefined) return undefined;
  return volumePerAvgSubjectMl * n * wasteBufferMultiplier(wasteBufferPct);
}

/**
 * Concentration (mg per mL) = solute required (mg) / total volume (mL).
 *
 * Note that the dose count and the waste buffer cancel out of this ratio, so
 * concentration depends only on dose per subject and volume per subject.
 */
export function computeConcentrationMgPerMl(soluteRequiredMg, totalVolumeMl) {
  if (soluteRequiredMg === undefined || totalVolumeMl === undefined) return undefined;
  if (totalVolumeMl <= 0) return undefined;
  return soluteRequiredMg / totalVolumeMl;
}

/**
 * Maximum volume one subject may receive, from a per-gram rate.
 *
 * Mice tolerate roughly 0.01 mL/g intraperitoneally (0.1 mL per 10 g). The
 * rate is a parameter because it differs by route and species.
 */
export function computeMaxVolumePerSubjectMl({
  avgBodyWeight,
  avgBodyWeightUnit,
  maxVolumeRateMlPerG,
}) {
  const avgG = weightToG(avgBodyWeight, avgBodyWeightUnit);
  const rate = toOptionalNumber(maxVolumeRateMlPerG);
  if (avgG === undefined || rate === undefined) return undefined;
  if (avgG <= 0 || rate <= 0) return undefined;
  return avgG * rate;
}

/**
 * Bundled outputs for injection-style calculators.
 */
export function computeInjectionSolutionOutputs({
  dosePerAvgSubjectMg,
  volPerInjMl,
  refBodyWeight,
  refBodyWeightUnit,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalInjections,
  wasteBufferPct,
  maxVolumeRateMlPerG,
}) {
  const volumePerAvgSubjectMl = computeVolumePerAvgSubjectMl({
    volPerInjMl,
    refBodyWeight,
    refBodyWeightUnit,
    avgBodyWeight,
    avgBodyWeightUnit,
  });
  const soluteRequiredMg = computeSoluteRequiredMg(
    dosePerAvgSubjectMg,
    totalInjections,
    wasteBufferPct,
  );
  const totalVolumeMl = computeTotalVolumeMl(
    volumePerAvgSubjectMl,
    totalInjections,
    wasteBufferPct,
  );
  const concentrationMgPerMl = computeConcentrationMgPerMl(soluteRequiredMg, totalVolumeMl);
  const maxVolumePerSubjectMl = computeMaxVolumePerSubjectMl({
    avgBodyWeight,
    avgBodyWeightUnit,
    maxVolumeRateMlPerG,
  });

  return {
    soluteRequiredMg,
    volumePerAvgSubjectMl,
    totalVolumeMl,
    concentrationMgPerMl,
    maxVolumePerSubjectMl,
  };
}
