/**
 * C1 V1 = C2 V2, solved for whichever term is missing.
 *
 * Take V1 of something at C1, make it up to V2, and it is now at C2. Four
 * quantities, one equation, same shape as the molarity page.
 *
 * WHY THE UNITS ARE FUSSIER HERE THAN THEY LOOK
 * ---------------------------------------------
 * The equation only ever uses the RATIO of the two concentrations, so their
 * unit cancels — a 10 mM stock diluted to 1 mM is the same tenfold step as
 * 10 mg/mL to 1 mg/mL, and neither needs a molecular weight. That is worth
 * exploiting, because it means this calculator works for compounds nobody has
 * looked up.
 *
 * It stops being true the moment the two are written in different KINDS of
 * unit. mg/mL to uM is a real conversion and needs the molecular weight; %v/v
 * to anything is not a conversion at all, because a volume fraction is not a
 * mass in a volume. So concentrations carry a kind, same kinds pass straight
 * through, and a mismatch is either gated behind a molecular weight or
 * refused.
 */
import { toPositiveNumber } from '../dosage/numberUtils';

/**
 * The kinds of concentration this calculator understands.
 *
 * `base` is what one unit of it comes to in that kind's own canonical unit:
 * mg/mL for a mass in a volume, mol/L for a molarity, and a plain fraction for
 * a volume fraction.
 */
export const CONCENTRATION_UNITS = [
  { value: 'g/ml', label: 'g/mL', kind: 'mass', base: 1000 },
  { value: 'mg/ml', label: 'mg/mL', kind: 'mass', base: 1 },
  { value: 'ug/ml', label: 'µg/mL', kind: 'mass', base: 1e-3 },
  { value: 'ng/ml', label: 'ng/mL', kind: 'mass', base: 1e-6 },
  // 1% w/v is 1 g in 100 mL, which is 10 mg/mL.
  { value: 'percent-wv', label: '% w/v', kind: 'mass', base: 10 },
  { value: 'M', label: 'M', kind: 'molar', base: 1 },
  { value: 'mM', label: 'mM', kind: 'molar', base: 1e-3 },
  { value: 'uM', label: 'µM', kind: 'molar', base: 1e-6 },
  { value: 'nM', label: 'nM', kind: 'molar', base: 1e-9 },
  // A volume fraction is its own kind: 20% ethanol is not a mass in a volume.
  { value: 'percent-vv', label: '% v/v', kind: 'fraction', base: 0.01 },
  { value: 'fold', label: '× (fold)', kind: 'fraction', base: 1 },
];

const UNIT_BY_VALUE = Object.fromEntries(CONCENTRATION_UNITS.map((u) => [u.value, u]));

/** @returns {'mass'|'molar'|'fraction'|undefined} */
export function concentrationKind(unit) {
  return UNIT_BY_VALUE[unit]?.kind;
}

export function concentrationUnitLabel(unit) {
  return UNIT_BY_VALUE[unit]?.label ?? unit;
}

/** A concentration in its own kind's canonical unit. */
export function toBase(value, unit) {
  const n = toPositiveNumber(value);
  const u = UNIT_BY_VALUE[unit];
  if (n === undefined || u === undefined) return undefined;
  return n * u.base;
}

/** The canonical unit each kind reduces to, for showing the working. */
export const BASE_UNIT_LABEL = { mass: 'mg/mL', molar: 'mol/L', fraction: 'fraction' };

/**
 * Whether two concentration units can be compared, and what it would take.
 *
 * @returns {{ ok: true } | { ok: false, reason: string, needsMolecularWeight: boolean }}
 */
export function unitsComparable(unitA, unitB, molecularWeight) {
  const a = concentrationKind(unitA);
  const b = concentrationKind(unitB);
  if (a === undefined || b === undefined) {
    return { ok: false, reason: 'unknown unit', needsMolecularWeight: false };
  }
  if (a === b) return { ok: true };
  if (a === 'fraction' || b === 'fraction') {
    return {
      ok: false,
      reason:
        'A volume fraction (% v/v or fold) cannot be converted to a mass or a molarity — it ' +
        'says nothing about how much substance is present. Put both concentrations in the ' +
        'same kind of unit.',
      needsMolecularWeight: false,
    };
  }
  // mass against molar: a real conversion, and it needs the molecular weight.
  if (toPositiveNumber(molecularWeight) === undefined) {
    return {
      ok: false,
      reason:
        'One concentration is a mass per volume and the other is a molarity. Converting ' +
        'between them needs the molecular weight.',
      needsMolecularWeight: true,
    };
  }
  return { ok: true };
}

/**
 * Both concentrations on one scale, so their ratio means something.
 *
 * Where the kinds match this is a no-op beyond the unit prefix, which is the
 * common case and the reason no molecular weight is asked for.
 *
 * @returns {{ c1: number, c2: number } | undefined}
 */
export function alignConcentrations({ c1, unit1, c2, unit2, molecularWeight }) {
  const kind1 = concentrationKind(unit1);
  const kind2 = concentrationKind(unit2);
  const base1 = toBase(c1, unit1);
  const base2 = toBase(c2, unit2);
  const mw = toPositiveNumber(molecularWeight);

  // One side may legitimately be missing — it is the term being solved for.
  if (kind1 === undefined || kind2 === undefined) return undefined;
  if (kind1 === kind2) return { c1: base1, c2: base2 };
  if (kind1 === 'fraction' || kind2 === 'fraction' || mw === undefined) return undefined;

  // Bring molar to mg/mL: 1 mol/L of a compound at MW g/mol is MW mg/mL.
  const asMassPerMl = (base, kind) => (base === undefined ? undefined : kind === 'molar' ? base * mw : base);
  return { c1: asMassPerMl(base1, kind1), c2: asMassPerMl(base2, kind2) };
}

export const DILUTION_TERMS = ['c1', 'v1', 'c2', 'v2'];

/**
 * Solve for the one missing term, all values already on a common scale.
 *
 * @returns {{ term: string, value: number } | undefined}
 */
export function solveDilution({ c1, v1, c2, v2 }) {
  const values = { c1: toPositiveNumber(c1), v1: toPositiveNumber(v1), c2: toPositiveNumber(c2), v2: toPositiveNumber(v2) };
  const missing = DILUTION_TERMS.filter((t) => values[t] === undefined);
  if (missing.length !== 1) return undefined;

  switch (missing[0]) {
    case 'c1':
      return { term: 'c1', value: (values.c2 * values.v2) / values.v1 };
    case 'v1':
      return { term: 'v1', value: (values.c2 * values.v2) / values.c1 };
    case 'c2':
      return { term: 'c2', value: (values.c1 * values.v1) / values.v2 };
    case 'v2':
      return { term: 'v2', value: (values.c1 * values.v1) / values.c2 };
    default:
      return undefined;
  }
}

/**
 * How much diluent to add: the difference between what you end with and what
 * you started with.
 *
 * This is the number people actually want. "Take 1 mL of stock and make up to
 * 10 mL" is a sentence you have to translate at the bench; "take 1 mL and add
 * 9 mL" is one you can follow.
 *
 * Negative means the final volume is smaller than the sample, which is not a
 * dilution at all, so it is reported rather than shown as a volume to add.
 *
 * @returns {{ diluentMl: number, impossible: boolean } | undefined}
 */
export function diluentVolumeMl(v1Ml, v2Ml) {
  const v1 = toPositiveNumber(v1Ml);
  const v2 = toPositiveNumber(v2Ml);
  if (v1 === undefined || v2 === undefined) return undefined;
  return { diluentMl: v2 - v1, impossible: v2 < v1 };
}

/**
 * The dilution as a fold and as a ratio.
 *
 * @returns {{ fold: number, ratio: string } | undefined}
 */
export function dilutionFactor(c1Base, c2Base) {
  const a = toPositiveNumber(c1Base);
  const b = toPositiveNumber(c2Base);
  if (a === undefined || b === undefined) return undefined;
  const fold = a / b;
  return { fold, ratio: `1:${fold}` };
}

/** The equation, rearranged for each term. */
export const REARRANGEMENTS = {
  c1: 'C₁ = (C₂ × V₂) ÷ V₁',
  v1: 'V₁ = (C₂ × V₂) ÷ C₁',
  c2: 'C₂ = (C₁ × V₁) ÷ V₂',
  v2: 'V₂ = (C₁ × V₁) ÷ C₂',
};
