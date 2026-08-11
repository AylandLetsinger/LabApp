/**
 * Delivery-method entries for the Dosage nav dropdown and routes (`/dosage/:method`).
 *
 * Ordered by route rather than alphabetically: injections together, then the
 * things an animal eats or drinks, then infusion. Someone looking for a method
 * usually knows which kind it is before they know its name.
 *
 * Stock Solution used to live here. It is not a delivery method — nothing is
 * dosed by stock solution — so it sits with the other calculators instead.
 */
export const DOSAGE_DELIVERY_METHODS = [
  { slug: 'direct-application', label: 'Direct Application' },
  { slug: 'intraperitoneal-injection', label: 'Intraperitoneal Injection' },
  { slug: 'subcutaneous-injection', label: 'Subcutaneous Injection' },
  { slug: 'intracranial-injection-infusion', label: 'Intracranial Injection/Infusion' },
  { slug: 'oral-gavage', label: 'Oral Gavage' },
  { slug: 'solid', label: 'Edible Solid' },
  { slug: 'mealworm', label: 'Mealworm' },
  { slug: 'drinking-fluid', label: 'Drinking Fluid' },
  { slug: 'iv-infusion', label: 'IV Infusion' },
];

export function getDosageMethodLabel(slug) {
  return DOSAGE_DELIVERY_METHODS.find((m) => m.slug === slug)?.label;
}
