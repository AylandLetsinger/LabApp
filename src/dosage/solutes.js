/**
 * A dose specification for one substance.
 *
 * A formulation can carry more than one drug — a co-administered pair, or an
 * anaesthetic cocktail — and each one has its own dose, its own molecular
 * weight, and its own solubility. Those belong together in one record rather
 * than as parallel arrays, so adding or removing a substance is a single
 * splice and nothing can fall out of step.
 *
 * The vehicle itself does not change: ratio still sets every volume, and the
 * batch is still the per-dose vehicle scaled up. What changes is that there are
 * now several masses to weigh out, and several solubility floors to clear.
 */
import { computeDosePerAvgSubjectMg } from './computeDosePerAvgSubject';

/**
 * Stable identity for a solute, so a vehicle row's solubility stays attached to
 * the right substance when one above it is removed. An index would not.
 */
let nextSoluteNumber = 0;

/** @returns {object} A blank solute, or one seeded with `overrides`. */
export function makeSolute(overrides = {}) {
  nextSoluteNumber += 1;
  return {
    id: `solute-${nextSoluteNumber}`,
    name: '',
    dosageType: 'by-body-weight',
    dosePerSubject: '',
    dosePerSubjectUnit: 'mg',
    doseAmount: '',
    doseUnit: 'mg',
    bodyWeightAmount: '',
    bodyWeightUnit: 'kg',
    molecularWeight: '',
    doseVolume: '',
    doseVolumeUnit: 'ul',
    doseConcentrationValue: '',
    doseConcentrationMassUnit: 'mg',
    doseConcentrationVolumeUnit: 'ml',
    ...overrides,
  };
}

/**
 * What to call a solute in messages and column headings.
 *
 * Naming is optional — most runs are one unnamed drug — so there is always a
 * fallback. "Solute 2" is worse than "xylazine" but far better than blank.
 */
export function soluteDisplayName(solute, index) {
  const named = (solute?.name ?? '').trim();
  return named === '' ? `Solute ${index + 1}` : named;
}

/**
 * Dose per average subject, in milligrams, for one solute.
 *
 * @returns {number | undefined} undefined while the solute is incomplete.
 */
export function soluteDoseMg(solute, { avgBodyWeight, avgBodyWeightUnit }) {
  return computeDosePerAvgSubjectMg({
    dosageType: solute.dosageType,
    doseAmount: solute.doseAmount,
    doseUnit: solute.doseUnit,
    refBodyWeight: solute.bodyWeightAmount,
    refBodyWeightUnit: solute.bodyWeightUnit,
    avgBodyWeight,
    avgBodyWeightUnit,
    dosePerSubject: solute.dosePerSubject,
    dosePerSubjectUnit: solute.dosePerSubjectUnit,
    molecularWeightGPerMol: solute.molecularWeight,
    doseVolume: solute.doseVolume,
    doseVolumeUnit: solute.doseVolumeUnit,
    doseConcentrationValue: solute.doseConcentrationValue,
    doseConcentrationMassUnit: solute.doseConcentrationMassUnit,
    doseConcentrationVolumeUnit: solute.doseConcentrationVolumeUnit,
  });
}

/** Dose per average subject for every solute, in order. */
export function soluteDosesMg(solutes, bodyWeight) {
  return solutes.map((solute) => soluteDoseMg(solute, bodyWeight));
}

/**
 * The combined mass of drug in one dose.
 *
 * Undefined unless every solute is complete: a partial total would read as a
 * smaller dose rather than as an unfinished form, which is the kind of quiet
 * wrongness this app exists to avoid.
 */
export function totalDoseMg(dosesMg) {
  if (dosesMg.length === 0) return undefined;
  if (dosesMg.some((mg) => mg === undefined)) return undefined;
  return dosesMg.reduce((sum, mg) => sum + mg, 0);
}
