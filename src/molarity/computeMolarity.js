/**
 * The molarity relationship, solved for whichever term is missing.
 *
 * Four quantities, one equation:
 *
 *     mass = concentration x volume x molecular weight
 *
 * Give it any three and the fourth follows. That is the whole calculator, and
 * the reason it is worth writing carefully is that the same equation rearranged
 * three ways is three chances to divide by the wrong thing.
 *
 * CANONICAL UNITS, and a convenient identity
 * ------------------------------------------
 * Everything here works in mg, mL, mol/L and g/mol, and in those units the
 * equation needs no conversion factor at all:
 *
 *     mass (mg) = concentration (mol/L) x volume (mL) x molecular weight (g/mol)
 *
 * because the litres-to-millilitres and grams-to-milligrams factors are both
 * a thousand and cancel. 0.02 mol/L x 50 mL x 342.39 g/mol = 342.39 mg, which
 * is the same answer as 0.02 x 0.05 L x 342.39 = 0.34239 g by a longer road.
 */
import { toPositiveNumber } from '../dosage/numberUtils';

/** The four terms, in the order the form shows them. */
export const MOLARITY_TERMS = ['mass', 'concentration', 'volume', 'molecularWeight'];

/**
 * Which term a set of inputs can solve for.
 *
 * @param {object} values Canonical values; undefined means "not given".
 * @returns {{ status: 'solved'|'incomplete'|'overdetermined', missing: string[] }}
 */
export function classifyInputs({ massMg, concentrationMolPerL, volumeMl, molecularWeight }) {
  const given = {
    mass: toPositiveNumber(massMg) !== undefined,
    concentration: toPositiveNumber(concentrationMolPerL) !== undefined,
    volume: toPositiveNumber(volumeMl) !== undefined,
    molecularWeight: toPositiveNumber(molecularWeight) !== undefined,
  };
  const missing = MOLARITY_TERMS.filter((t) => !given[t]);
  if (missing.length === 1) return { status: 'solved', missing };
  if (missing.length === 0) return { status: 'overdetermined', missing };
  return { status: 'incomplete', missing };
}

/**
 * Solve for the one missing term.
 *
 * Zero is deliberately not accepted as an input: a zero volume or a zero
 * molecular weight makes the rearrangement divide by it, and a zero mass or
 * concentration makes the answer trivially zero without saying anything. All
 * four are treated as "not given" instead, which is what an empty field means.
 *
 * @returns {{ term: string, value: number } | undefined}
 */
export function solveMolarity({ massMg, concentrationMolPerL, volumeMl, molecularWeight }) {
  const mass = toPositiveNumber(massMg);
  const c = toPositiveNumber(concentrationMolPerL);
  const volume = toPositiveNumber(volumeMl);
  const mw = toPositiveNumber(molecularWeight);

  const { status, missing } = classifyInputs({
    massMg,
    concentrationMolPerL,
    volumeMl,
    molecularWeight,
  });
  if (status !== 'solved') return undefined;

  switch (missing[0]) {
    case 'mass':
      return { term: 'mass', value: c * volume * mw };
    case 'concentration':
      return { term: 'concentration', value: mass / (volume * mw) };
    case 'volume':
      return { term: 'volume', value: mass / (c * mw) };
    case 'molecularWeight':
      return { term: 'molecularWeight', value: mass / (c * volume) };
    default:
      return undefined;
  }
}

/**
 * How far four given values are from satisfying the equation.
 *
 * When nothing is missing there is nothing to solve, but there is still
 * something worth saying: whether the numbers agree. Returned as a relative
 * difference so it can be judged without knowing the scale.
 *
 * @returns {{ expectedMassMg: number, relativeError: number } | undefined}
 */
export function checkConsistency({ massMg, concentrationMolPerL, volumeMl, molecularWeight }) {
  const mass = toPositiveNumber(massMg);
  const c = toPositiveNumber(concentrationMolPerL);
  const volume = toPositiveNumber(volumeMl);
  const mw = toPositiveNumber(molecularWeight);
  if (mass === undefined || c === undefined || volume === undefined || mw === undefined) {
    return undefined;
  }
  const expectedMassMg = c * volume * mw;
  return { expectedMassMg, relativeError: Math.abs(expectedMassMg - mass) / mass };
}

/** The equation, rearranged for each term, for display above the working. */
export const REARRANGEMENTS = {
  mass: 'mass = concentration × volume × molecular weight',
  concentration: 'concentration = mass ÷ (volume × molecular weight)',
  volume: 'volume = mass ÷ (concentration × molecular weight)',
  molecularWeight: 'molecular weight = mass ÷ (concentration × volume)',
};

/** What each term is called on screen. */
export const TERM_LABELS = {
  mass: 'Mass',
  concentration: 'Concentration',
  volume: 'Volume',
  molecularWeight: 'Molecular weight',
};
