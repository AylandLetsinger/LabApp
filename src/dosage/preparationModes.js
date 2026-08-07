/**
 * What the drug is starting as, which decides how much of the calculator
 * applies. Each answer removes work rather than adding it.
 *
 *   none    — powder. Vehicle, dilution, and recipe all apply.
 *   stock   — a concentrate to dilute. The vehicle table's first row is the
 *             stock, and its concentration plays the part solubility plays for
 *             powder: volume required = dose / concentration.
 *   working — the finished solution. Dose and concentration fully determine
 *             the volume per subject, so there is nothing left to formulate.
 */
export const PREPARATION_MODES = {
  none: 'none',
  stock: 'stock',
  working: 'working',
};
