/**
 * Delivery-method entries for the Dosage nav dropdown and routes (`/dosage/:method`).
 *
 * Ordered by route rather than alphabetically: injections together, then the
 * things an animal eats or drinks, then infusion. Someone looking for a method
 * usually knows which kind it is before they know its name.
 *
 * The `blurb` is what the home page shows. It lives here so the card and the
 * menu entry cannot drift apart, and so a new method is one edit rather than
 * two.
 *
 * Stock Solution used to live here. It is not a delivery method — nothing is
 * dosed by stock solution — so it sits with the other calculators instead.
 */
export const DOSAGE_DELIVERY_METHODS = [
  {
    slug: 'direct-application',
    label: 'Direct Application',
    blurb: 'A target concentration in a well or a bath, and what to add to reach it.',
  },
  {
    slug: 'intraperitoneal-injection',
    label: 'Intraperitoneal Injection',
    blurb: 'Dose by body mass, volume by mL/kg, and a vehicle judged against published figures.',
  },
  {
    slug: 'subcutaneous-injection',
    label: 'Subcutaneous Injection',
    blurb: 'The same, split across as many sites as you use.',
  },
  {
    slug: 'intracranial-injection-infusion',
    label: 'Intracranial Injection/Infusion',
    blurb: 'Bolus or pump, in volumes a ventricle holds rather than ones scaled to the animal.',
  },
  {
    slug: 'oral-gavage',
    label: 'Oral Gavage',
    blurb: 'Solutions and suspensions for gavage, checked against oral figures, never injected ones.',
  },
  {
    slug: 'solid',
    label: 'Edible Solid',
    blurb: 'Peanut butter, gelatin, cookie dough — how much solution a portion will carry.',
  },
  {
    slug: 'mealworm',
    label: 'Mealworm',
    blurb: 'One worm per mouse, bounded by how much liquid it absorbs before it leaks.',
  },
  {
    slug: 'drinking-fluid',
    label: 'Drinking Fluid',
    blurb: 'What to put in the bottle, and how far the dose moves when they drink more or less.',
  },
  {
    slug: 'iv-infusion',
    label: 'IV Infusion',
    blurb: 'One slow bolus, a self-administration session, or a line running for hours.',
  },
];

export function getDosageMethodLabel(slug) {
  return DOSAGE_DELIVERY_METHODS.find((m) => m.slug === slug)?.label;
}
