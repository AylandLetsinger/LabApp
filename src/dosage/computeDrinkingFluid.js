/**
 * Drug in the drinking water.
 *
 * WHAT MAKES THIS DIFFERENT FROM EVERY OTHER PAGE
 * -----------------------------------------------
 * Everywhere else in this app the dose is administered: someone decides it and
 * delivers it. Here the animal decides. What is controlled is a concentration;
 * what is received is that concentration multiplied by however much the animal
 * chose to drink. The dose is therefore INFERRED, and it is exactly as accurate
 * as the intake figure it was inferred from.
 *
 * That is not a reason to avoid the method — it is standard in ethanol,
 * sucrose-preference and DREADD work — but it does mean the honest output is a
 * range rather than a number, which is why `doseAcrossIntakes` exists.
 *
 * The identity, in both directions:
 *
 *     delivered (mg/kg/day) = concentration (mg/mL) x intake (mL/day) / mass (kg)
 *     concentration (mg/mL) = target (mg/kg/day) x mass (kg) / intake (mL/day)
 *
 * INTAKE IS NOT A CONSTANT. Adding a drug changes how much an animal drinks —
 * CNO and ethanol are both aversive at concentration, which is why sweeteners
 * appear in so many protocols — and sipper tubes lose fluid to evaporation and
 * spillage that reads as consumption. So nothing here supplies a default
 * intake. It has to be measured, ideally on the fluid actually being used.
 */
import { toNonNegativeNumber, toPositiveNumber } from './numberUtils';

/**
 * Concentration that delivers a target dose rate, given what the animal drinks.
 *
 * @param {number} targetMgPerKgPerDay
 * @param {number} bodyWeightKg
 * @param {number} intakeMlPerDay
 * @returns {number | undefined} mg/mL.
 */
export function concentrationForTarget(targetMgPerKgPerDay, bodyWeightKg, intakeMlPerDay) {
  const target = toNonNegativeNumber(targetMgPerKgPerDay);
  const kg = toPositiveNumber(bodyWeightKg);
  if (target === undefined || kg === undefined) return undefined;
  return concentrationForDosePerDay(target * kg, intakeMlPerDay);
}

/**
 * The same thing from the other end: a dose already expressed as a mass per
 * day, rather than a rate per kilogram.
 *
 * Both entry points exist because both are natural — "10 mg/kg/day" and
 * "0.25 mg a day" — and they share one implementation so they cannot disagree.
 *
 * @returns {number | undefined} mg/mL.
 */
export function concentrationForDosePerDay(doseMgPerDay, intakeMlPerDay) {
  const dose = toNonNegativeNumber(doseMgPerDay);
  const intake = toPositiveNumber(intakeMlPerDay);
  if (dose === undefined || intake === undefined) return undefined;
  return dose / intake;
}

/**
 * Dose rate a given concentration actually delivers.
 *
 * The direction people reach for second: the bottle is already made up at
 * 20 mg/L and the question is what that comes to.
 *
 * @returns {number | undefined} mg/kg/day.
 */
export function deliveredDoseMgPerKgPerDay(concentrationMgPerMl, intakeMlPerDay, bodyWeightKg) {
  const c = toNonNegativeNumber(concentrationMgPerMl);
  const intake = toNonNegativeNumber(intakeMlPerDay);
  const kg = toPositiveNumber(bodyWeightKg);
  if (c === undefined || intake === undefined || kg === undefined) return undefined;
  return (c * intake) / kg;
}

/** Absolute drug taken per animal per day, in milligrams. */
export function deliveredDoseMgPerDay(concentrationMgPerMl, intakeMlPerDay) {
  const c = toNonNegativeNumber(concentrationMgPerMl);
  const intake = toNonNegativeNumber(intakeMlPerDay);
  if (c === undefined || intake === undefined) return undefined;
  return c * intake;
}

/**
 * How much fluid one bottle has to hold between changes.
 *
 * Group-housed animals share a bottle, so the bottle empties n times faster —
 * and individual intake becomes unknowable, which the UI says rather than this
 * function pretending otherwise.
 *
 * @returns {number | undefined} Millilitres.
 */
export function bottleVolumeMl(intakeMlPerDay, animalsPerBottle, daysBetweenChanges) {
  const intake = toPositiveNumber(intakeMlPerDay);
  const animals = toPositiveNumber(animalsPerBottle);
  const days = toPositiveNumber(daysBetweenChanges);
  if (intake === undefined || animals === undefined || days === undefined) return undefined;
  return intake * animals * days;
}

/** Guard against a range that would generate an unusable number of rows. */
const MAX_SERIES_ROWS = 200;

/**
 * What the dose becomes across a range of daily intakes.
 *
 * The counterpart of the dosing table by body mass, and the most honest output
 * on the page: it shows how far the delivered dose moves when the animals
 * drink more or less than the figure everything above was calculated from.
 * A 30% swing in intake is a 30% swing in dose, and seeing that as a table is
 * different from being told it.
 *
 * @returns {Array<object> | null} null when the inputs cannot make a series.
 */
export function doseAcrossIntakes({
  fromMlPerDay,
  toMlPerDay,
  stepMlPerDay,
  concentrationMgPerMl,
  bodyWeightKg,
  targetMgPerKgPerDay,
}) {
  const from = toPositiveNumber(fromMlPerDay);
  const to = toPositiveNumber(toMlPerDay);
  const step = toPositiveNumber(stepMlPerDay);
  if (from === undefined || to === undefined || step === undefined) return null;
  if (to < from) return null;
  if ((to - from) / step + 1 > MAX_SERIES_ROWS) return null;

  const rows = [];
  const count = Math.floor((to - from) / step + 1e-9) + 1;
  for (let i = 0; i < count; i += 1) {
    // Computed from the start rather than accumulated, so a row that should
    // land exactly on the reference intake does.
    const intake = from + step * i;
    const mgPerKgPerDay = deliveredDoseMgPerKgPerDay(concentrationMgPerMl, intake, bodyWeightKg);
    const target = toPositiveNumber(targetMgPerKgPerDay);
    rows.push({
      intakeMlPerDay: intake,
      mgPerDay: deliveredDoseMgPerDay(concentrationMgPerMl, intake),
      mgPerKgPerDay,
      percentOfTarget:
        target !== undefined && mgPerKgPerDay !== undefined
          ? (mgPerKgPerDay / target) * 100
          : undefined,
    });
  }
  return rows.length > 0 ? rows : null;
}
