import { toOptionalNumber } from './numberUtils';

/** 10% waste → 1.1. Missing percent → 0% (multiplier 1). */
export function wasteBufferMultiplier(percentRaw) {
  const p = toOptionalNumber(percentRaw);
  return 1 + (p === undefined ? 0 : p) / 100;
}

/**
 * Solute required (mg) = dose per avg subject (mg) × #injections × (1 + waste%).
 */
export function computeSoluteRequiredMg(dosePerAvgSubjectMg, totalInjections, wasteBufferPct) {
  if (dosePerAvgSubjectMg === undefined) return undefined;
  const n = toOptionalNumber(totalInjections);
  if (n === undefined || n < 0) return undefined;
  const mult = wasteBufferMultiplier(wasteBufferPct);
  return dosePerAvgSubjectMg * n * mult;
}

/**
 * Volume per average subject (mL) = (mL per injection / reference g) × average body weight (g).
 */
export function computeVolumePerAvgSubjectMl(volPerInjMl, volPerInjG, avgBodyWeightG) {
  const ml = toOptionalNumber(volPerInjMl);
  const refG = toOptionalNumber(volPerInjG);
  const avgG = toOptionalNumber(avgBodyWeightG);
  if (ml === undefined || refG === undefined || avgG === undefined) return undefined;
  if (refG <= 0) return undefined;
  return (ml / refG) * avgG;
}

/**
 * Total volume (mL) = volume per avg subject (mL) × #injections × (1 + waste%).
 */
export function computeTotalVolumeMl(volumePerAvgSubjectMl, totalInjections, wasteBufferPct) {
  if (volumePerAvgSubjectMl === undefined) return undefined;
  const n = toOptionalNumber(totalInjections);
  if (n === undefined || n < 0) return undefined;
  const mult = wasteBufferMultiplier(wasteBufferPct);
  return volumePerAvgSubjectMl * n * mult;
}

/**
 * Concentration (mg per 1 mL) = solute required (mg) / total volume (mL).
 */
export function computeConcentrationMgPerMl(soluteRequiredMg, totalVolumeMl) {
  if (soluteRequiredMg === undefined || totalVolumeMl === undefined) return undefined;
  if (totalVolumeMl <= 0) return undefined;
  return soluteRequiredMg / totalVolumeMl;
}

/**
 * Bundled Step 4 values for IP-style calculators (reusable from hooks/tests).
 */
export function computeIpSolutionStep4({
  dosePerAvgSubjectMg,
  volPerInjMl,
  volPerInjG,
  avgBodyWeightG,
  totalInjections,
  wasteBufferPct,
}) {
  const volumePerAvgSubjectMl = computeVolumePerAvgSubjectMl(
    volPerInjMl,
    volPerInjG,
    avgBodyWeightG,
  );
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

  return {
    soluteRequiredMg,
    volumePerAvgSubjectMl,
    totalVolumeMl,
    concentrationMgPerMl,
  };
}
