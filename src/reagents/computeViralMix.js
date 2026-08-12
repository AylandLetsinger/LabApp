/**
 * Mixing viral agents to a ratio.
 *
 * A ratio of GCaMP to tdTomato can mean two things, and they are not the same
 * mixture: ten parts by VOLUME, or ten times as many genome COPIES. Which one
 * was meant depends on the titres, and getting it wrong is a silent tenfold
 * error in an experiment that will look like it worked.
 *
 * This shared a module with antibody dilution while the two shared a page.
 * They no longer do, and they never shared any arithmetic.
 */
import { toPositiveNumber } from '../dosage/numberUtils';

/** Titres are quoted as a mantissa and a power of ten, so that is how they are entered. */
export const TITER_UNITS = [
  { value: 'e14', label: '×10¹⁴ /mL', factor: 1e14 },
  { value: 'e13', label: '×10¹³ /mL', factor: 1e13 },
  { value: 'e12', label: '×10¹² /mL', factor: 1e12 },
  { value: 'e11', label: '×10¹¹ /mL', factor: 1e11 },
  { value: 'e10', label: '×10¹⁰ /mL', factor: 1e10 },
  { value: 'e9', label: '×10⁹ /mL', factor: 1e9 },
  { value: 'raw', label: '/mL', factor: 1 },
];

const TITER_FACTOR = Object.fromEntries(TITER_UNITS.map((u) => [u.value, u.factor]));

/** A titre in genome copies per millilitre. */
export function titerPerMl(value, unit) {
  const n = toPositiveNumber(value);
  const factor = TITER_FACTOR[unit];
  if (n === undefined || factor === undefined) return undefined;
  return n * factor;
}

/**
 * Split a volume between agents in a ratio.
 *
 * BY VOLUME the parts are volumes directly: 9:1 is nine parts of one and one
 * of the other, whatever they contain.
 *
 * BY COPIES the parts are genome copies, and the volumes have to be worked
 * backwards through the titres — a part of a weak virus takes more volume than
 * a part of a strong one. For agent i wanting p_i copies, volume goes as
 * p_i / titre_i, normalised to the volume available.
 *
 * Those two give the same answer only when every titre is equal, which is
 * exactly the case nobody has.
 *
 * @param {object} p
 * @param {Array<{titerPerMl?: number, parts?: unknown}>} p.agents
 * @param {'volume'|'copies'} p.basis
 * @param {number} p.virusVolumeMl Volume the agents share, after any diluent.
 * @returns {Array<number> | undefined} Millilitres per agent, in order.
 */
export function splitByRatio({ agents, basis, virusVolumeMl }) {
  const total = toPositiveNumber(virusVolumeMl);
  if (total === undefined || agents.length === 0) return undefined;

  const parts = agents.map((a) => toPositiveNumber(a.parts));
  if (parts.some((p) => p === undefined)) return undefined;

  let weights;
  if (basis === 'copies') {
    const titres = agents.map((a) => toPositiveNumber(a.titerPerMl));
    if (titres.some((t) => t === undefined)) return undefined;
    weights = parts.map((p, i) => p / titres[i]);
  } else {
    weights = parts;
  }

  const sum = weights.reduce((acc, w) => acc + w, 0);
  if (!(sum > 0)) return undefined;
  return weights.map((w) => (w / sum) * total);
}

/**
 * What one agent comes to in the finished mix.
 *
 * @returns {{ copies: number, finalTiterPerMl: number } | undefined}
 */
export function agentInMix({ titerPerMl: titre, volumeMl, finalVolumeMl }) {
  const t = toPositiveNumber(titre);
  const v = toPositiveNumber(volumeMl);
  const final = toPositiveNumber(finalVolumeMl);
  if (t === undefined || v === undefined || final === undefined) return undefined;
  const copies = t * v;
  return { copies, finalTiterPerMl: copies / final };
}

/**
 * How many injections a volume yields, and what each one carries.
 *
 * The number people actually want from a syringe: 10 uL at 500 nL a mouse is
 * twenty mice, and the count is floored because a partial injection is not one.
 *
 * @returns {{ injections: number, leftoverMl: number } | undefined}
 */
export function injectionsFrom(finalVolumeMl, perInjectionMl) {
  const total = toPositiveNumber(finalVolumeMl);
  const each = toPositiveNumber(perInjectionMl);
  if (total === undefined || each === undefined) return undefined;
  const injections = Math.floor(total / each + 1e-9);
  return { injections, leftoverMl: total - injections * each };
}

/** Copies delivered per injection, from the finished titre. */
export function copiesPerInjection(finalTiterPerMl, perInjectionMl) {
  const t = toPositiveNumber(finalTiterPerMl);
  const v = toPositiveNumber(perInjectionMl);
  if (t === undefined || v === undefined) return undefined;
  return t * v;
}

/** The achieved ratio of copies, normalised so the smallest agent is 1. */
export function copiesRatio(copiesList) {
  const values = copiesList.filter((c) => toPositiveNumber(c) !== undefined);
  if (values.length !== copiesList.length || values.length === 0) return undefined;
  const smallest = Math.min(...values);
  if (!(smallest > 0)) return undefined;
  return values.map((c) => c / smallest);
}
