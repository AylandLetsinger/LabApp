/** Mass units for drug amount (dose) — reuse across calculators. */
export const DOSE_UNITS = [
  { value: 'mg', label: 'mg' },
  { value: 'ug', label: 'µg' },
  { value: 'g', label: 'g' },
];

/** Mass units for subject body weight, paired with dose fields. */
export const WEIGHT_UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
];

/** Volume units for solution outputs. */
export const VOLUME_UNITS = [
  { value: 'ml', label: 'mL' },
  { value: 'ul', label: 'µL' },
  { value: 'l', label: 'L' },
];

/**
 * Typical mouse body weights, shown as a hint under body-weight inputs.
 * Not enforced — the app is also usable for other species.
 */
export const MOUSE_WEIGHT_HINT = '* typical mouse: 25 g male, 20 g female';

/** Intraperitoneal volume ceiling for mice: 0.1 mL per 10 g body mass. */
export const MOUSE_IP_MAX_VOLUME_ML_PER_G = 0.01;
