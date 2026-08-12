/**
 * Calculators that are not tied to a route of administration.
 *
 * A dosage calculator answers "how do I give this animal 20 mg/kg". These
 * answer questions that come up whatever you are dosing, or when you are not
 * dosing at all — which is why they are a separate menu rather than another
 * entry under Dosage.
 *
 * The `blurb` was what the home page cards showed. The cards are names only
 * for now, so nothing reads it — it is kept because the descriptions are
 * meant to return, and it lives here so a card and its menu entry cannot
 * drift apart when they do.
 */
export const CALCULATORS = [
  {
    to: '/molarity',
    label: 'Molarity',
    blurb: 'Mass, concentration, volume, molecular weight. Fill in three and the fourth follows.',
  },
  {
    to: '/dilutions',
    label: 'Dilutions',
    blurb: 'C₁V₁ = C₂V₂, and how much diluent to actually add rather than make up to.',
  },
  {
    to: '/antibodies',
    label: 'Antibodies',
    blurb: 'Primary and secondary solutions, with several antibodies sharing one diluent.',
  },
  {
    to: '/viral-mixes',
    label: 'Viral Mixes',
    blurb: 'Agents to a ratio — by volume, by genome copies, or from the dose you want injected.',
  },
  {
    to: '/stock-solution',
    label: 'Stock Solution',
    blurb: 'From a tube of powder to a working solution far too dilute to weigh.',
  },
];
