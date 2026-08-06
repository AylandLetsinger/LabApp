/** Delivery-method entries for the Dosage nav dropdown and routes (`/dosage/:method`). */
export const DOSAGE_DELIVERY_METHODS = [
  { slug: 'stock-solution', label: 'Stock Solution' },
  { slug: 'direct-application', label: 'Direct Application' },
  { slug: 'intraperitoneal-injection', label: 'Intraperitoneal Injection' },
  { slug: 'subcutaneous-injection', label: 'Subcutaneous Injection' },
  { slug: 'intracranial-injection-infusion', label: 'Intracranial Injection/Infusion' },
  { slug: 'mealworm', label: 'Mealworm (oral)' },
  { slug: 'drinking-fluid', label: 'Drinking Fluid' },
  { slug: 'solid', label: 'Solid' },
  { slug: 'iv-infusion', label: 'IV Infusion' },
];

export function getDosageMethodLabel(slug) {
  return DOSAGE_DELIVERY_METHODS.find((m) => m.slug === slug)?.label;
}
