/**
 * Parsing helpers shared by every calculator.
 *
 * These are deliberately strict: a value that cannot be interpreted returns
 * `undefined` rather than NaN, 0, or a guess. Callers must handle `undefined`.
 */

/**
 * Parse anything into a finite number.
 * Blank, null, undefined, and non-numeric text all return `undefined`.
 *
 * @param {unknown} value
 * @returns {number | undefined}
 */
export function toOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parse a value that is physically not allowed to be negative — a mass, a
 * volume, a body weight, a count. Negatives return `undefined` instead of
 * flowing into the arithmetic and producing a negative dose.
 *
 * Zero is allowed; use `toPositiveNumber` when zero is also meaningless.
 *
 * @param {unknown} value
 * @returns {number | undefined}
 */
export function toNonNegativeNumber(value) {
  const n = toOptionalNumber(value);
  if (n === undefined || n < 0) return undefined;
  return n;
}

/**
 * Parse a value that must be strictly greater than zero — anything used as a
 * divisor, or a count of things that must actually exist.
 *
 * @param {unknown} value
 * @returns {number | undefined}
 */
export function toPositiveNumber(value) {
  const n = toOptionalNumber(value);
  if (n === undefined || n <= 0) return undefined;
  return n;
}

/**
 * Round to a fixed number of decimal places and drop trailing zeros, so
 * 0.10000000000000003 displays as 0.1 rather than as floating-point noise.
 *
 * @param {number} n
 * @param {number} decimals
 * @returns {number}
 */
export function roundTo(n, decimals) {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/**
 * Round a value to the nearest achievable step — used to snap volumes to what
 * a pipette can actually deliver. A step of 0 or less means "no snapping".
 *
 * @param {number} n
 * @param {number} step
 * @returns {number}
 */
export function roundToStep(n, step) {
  if (!Number.isFinite(step) || step <= 0) return n;
  return Math.round(n / step) * step;
}
