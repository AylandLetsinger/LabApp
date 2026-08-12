/**
 * Calculators that are not tied to a route of administration.
 *
 * A dosage calculator answers "how do I give this animal 20 mg/kg". These
 * answer questions that come up whatever you are dosing, or when you are not
 * dosing at all — which is why they are a separate menu rather than another
 * entry under Dosage.
 */
export const CALCULATORS = [
  { to: '/molarity', label: 'Molarity' },
  { to: '/dilutions', label: 'Dilutions' },
  { to: '/antibodies', label: 'Antibodies' },
  { to: '/viral-mixes', label: 'Viral Mixes' },
  { to: '/stock-solution', label: 'Stock Solution' },
];
