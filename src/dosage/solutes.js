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
 *
 * The load prefix makes ids unique across page loads, not only within one.
 * Solutes are now remembered between visits, and the counter restarts at zero
 * on every load: without the prefix, a restored `solute-1` and the next one
 * added would share an id — and a vehicle row's concentration and a stock
 * entry, both keyed by that id, would silently attach to the wrong drug.
 */
const LOAD_PREFIX = Date.now().toString(36);
let nextSoluteNumber = 0;

/**
 * Rebuild remembered solutes into the current shape, or reject them.
 *
 * Passing each one back through makeSolute() means a field added since
 * someone's last visit arrives with its default instead of as undefined. The
 * stored id is kept — vehicle rows and stock entries refer to it.
 *
 * @returns {object[] | undefined} undefined when the stored value is unusable.
 */
export function restoreSolutes(stored) {
  if (!Array.isArray(stored) || stored.length === 0) return undefined;
  const usable = stored.every((s) => s && typeof s === 'object' && typeof s.id === 'string');
  return usable ? stored.map((s) => makeSolute(s)) : undefined;
}

/** @returns {object} A blank solute, or one seeded with `overrides`. */
export function makeSolute(overrides = {}) {
  nextSoluteNumber += 1;
  return {
    id: `solute-${LOAD_PREFIX}-${nextSoluteNumber}`,
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
    // In vitro: the concentration the vessel should end up at. Unused by the
    // in-vivo methods, which dose a mass rather than reach a concentration.
    targetConcentrationValue: '',
    targetConcentrationUnit: 'mg/ml',
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
