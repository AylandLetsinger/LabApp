/*
 * Unit lists are ordered largest to smallest, always. A dropdown that jumps
 * mg -> µg -> g makes the reader check every entry; one that descends lets
 * them stop as soon as they pass what they wanted.
 */

/** Mass units for drug amount (dose). */
export const DOSE_UNITS = [
  { value: 'g', label: 'g' },
  { value: 'mg', label: 'mg' },
  { value: 'ug', label: 'µg' },
  { value: 'ng', label: 'ng' },
  { value: 'pg', label: 'pg' },
];

/** Mass units for subject body weight, paired with dose fields. */
export const WEIGHT_UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
];

/** Volume units for solution outputs. */
export const VOLUME_UNITS = [
  { value: 'l', label: 'L' },
  { value: 'ml', label: 'mL' },
  { value: 'ul', label: 'µL' },
  { value: 'nl', label: 'nL' },
];

/**
 * Typical mouse body weights, shown as a hint under body-weight inputs.
 * Not enforced — the app is also usable for other species.
 */
export const MOUSE_WEIGHT_HINT = '* typical mouse: 25 g male, 20 g female';

/** Intraperitoneal volume ceiling for mice: 0.1 mL per 10 g body mass. */
export const MOUSE_IP_MAX_VOLUME_ML_PER_G = 0.01;
