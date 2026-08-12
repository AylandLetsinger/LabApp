/**
 * Into the bloodstream, by bolus or by line.
 *
 * Two practices, sharing a page because they share a catheter.
 *
 *   A BOLUS is a volume scaled to the animal, as an intraperitoneal dose is —
 *   5 mL/kg means a bigger mouse gets more. Where it differs is that the same
 *   line is often used repeatedly within a session, which is what an operant
 *   self-administration study is: one dose per infusion, many infusions, and a
 *   total that only exists at the end.
 *
 *   A CONTINUOUS INFUSION is rate times duration, and that arithmetic is not
 *   specific to a vein, so it comes from computeInfusion.js.
 *
 * The reason a repeat count belongs in the maths rather than in the display is
 * the total: at 0.5 mg/kg per infusion, thirty infusions is 15 mg/kg, and that
 * is the number a protocol is judged against.
 */
import { toNonNegativeNumber, toPositiveNumber } from './numberUtils';

export {
  infusionVolumeMl,
  totalDoseFromDaily,
  dailyDoseFromTotal,
  checkReservoir,
  durationToHours,
  concentrationForDose,
  DURATION_UNITS,
} from './computeInfusion';

/**
 * Volume of one bolus, from a rate written per unit of body mass.
 *
 * @param {number} rateMl Volume per `refKg` of body mass.
 * @param {number} refKg The body mass that rate is written against.
 * @param {number} bodyWeightKg
 * @returns {number | undefined} Millilitres.
 */
export function bolusVolumeMl(rateMl, refKg, bodyWeightKg) {
  const rate = toPositiveNumber(rateMl);
  const ref = toPositiveNumber(refKg);
  const kg = toPositiveNumber(bodyWeightKg);
  if (rate === undefined || ref === undefined || kg === undefined) return undefined;
  return (rate / ref) * kg;
}

/**
 * Everything one subject receives across a session of repeated boluses.
 *
 * @param {number} perInfusionMl
 * @param {unknown} infusions
 * @returns {number | undefined} Millilitres.
 */
export function sessionVolumeMl(perInfusionMl, infusions) {
  const perInfusion = toPositiveNumber(perInfusionMl);
  const n = toPositiveNumber(infusions);
  if (perInfusion === undefined || n === undefined) return undefined;
  return perInfusion * n;
}

/**
 * The dose a whole session comes to, from the dose of one infusion.
 *
 * Self-administration protocols state the unit dose — what a single lever
 * press earns — and the exposure that matters is the sum. Thirty infusions of
 * 0.5 mg/kg is 15 mg/kg, which is a different conversation from 0.5.
 *
 * @returns {number | undefined}
 */
export function sessionDose(dosePerInfusion, infusions) {
  const dose = toNonNegativeNumber(dosePerInfusion);
  const n = toNonNegativeNumber(infusions);
  if (dose === undefined || n === undefined) return undefined;
  return dose * n;
}

/**
 * How long one bolus takes to go in, in seconds.
 *
 * An intravenous bolus given too fast is its own hazard, independent of the
 * drug, so the delivery time is worth seeing next to the volume.
 *
 * @returns {number | undefined}
 */
export function bolusSeconds(volumeMl, rateMlPerSecond) {
  const volume = toPositiveNumber(volumeMl);
  const rate = toPositiveNumber(rateMlPerSecond);
  if (volume === undefined || rate === undefined) return undefined;
  return volume / rate;
}
