/**
 * How a dose can be specified, and the concentration units that go with it.
 *
 * These live apart from the component that renders them because two other
 * forms choose which of them to offer, and a module that exports both a
 * component and its constants cannot be hot-reloaded.
 */

/** The in-vivo ways of saying how much drug an animal gets. */
export const DOSAGE_TYPE_OPTIONS = [
  { value: 'per-subject', label: 'Dose per subject' },
  { value: 'by-body-weight', label: 'Dose by body weight' },
  { value: 'by-volume-concentration', label: 'Dose by volume × concentration' },
];

/**
 * In vitro there is nothing to dose per kilogram of. What you choose is the
 * concentration the preparation ends up at, and the volume comes from the
 * vessel rather than from the animal.
 */
export const TARGET_CONCENTRATION_ONLY = [
  { value: 'target-concentration', label: 'Target concentration' },
];

/**
 * Concentration units that carry their own volume, so no "per mL" selector.
 *
 * "10 µM" and "5 µg/mL" are each one choice. Pairing a mass unit with a
 * separate volume unit invites "µg per litre" and similar, which is correct
 * arithmetic and almost never what anyone meant.
 */
export const MASS_PER_ML_UNITS = [
  { value: 'g/ml', label: 'g/mL' },
  { value: 'mg/ml', label: 'mg/mL' },
  { value: 'ug/ml', label: 'µg/mL' },
  { value: 'ng/ml', label: 'ng/mL' },
];
