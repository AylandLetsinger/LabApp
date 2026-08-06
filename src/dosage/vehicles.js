/**
 * Catalogue of vehicle solvents with published tolerability limits.
 *
 * READ THIS BEFORE CHANGING A NUMBER
 * ----------------------------------
 * There is no authoritative universal table of vehicle limits. Institutional
 * IACUC policies disagree with each other, and the most complete tabulation
 * (Gad et al. 2016) is paywalled. Every limit below therefore travels with
 * three things that must never be stripped off it:
 *
 *   source     - where the number came from, so it can be checked
 *   endpoint   - what was actually measured. "No effect on locomotor
 *                activity" is NOT the same claim as "safe".
 *   confidence - how much weight the number can bear
 *
 * A limit of `null` means no published figure was found. That is recorded
 * honestly rather than filled with a plausible-looking guess, because a
 * fabricated ceiling on an animal-dosing tool is worse than no ceiling.
 *
 * These are guidelines. The governing authority is the user's own IACUC
 * protocol, and the UI says so wherever these numbers are displayed.
 */

/** Confidence in a published limit. */
export const CONFIDENCE = {
  moderate: 'moderate',
  low: 'low',
  none: 'none',
};

const CASTRO_1995 =
  'Castro et al. 1995, Pharmacol Biochem Behav (PMID 7617697) — locomotor activity, CD2F1 mice, i.p., % v/v in saline';

const CAMBRIDGE_MEDCHEM =
  'Cambridge MedChem Consulting, formulation excipient ranges — oral/i.v. formulation-development ranges, not i.p. safety limits';

const ORAL_PRACTITIONER =
  'Practitioner consensus (not peer-reviewed) — commonly cited oral gavage ceiling for healthy adult mice';

const NO_LIMIT_FOUND = 'No published quantitative limit found for this route.';

/**
 * A limit entry.
 * @typedef {object} VehicleLimit
 * @property {number | null} maxPercent Maximum %(v/v), or null if unknown.
 * @property {string} endpoint What was measured.
 * @property {string} source Citation.
 * @property {string} confidence One of CONFIDENCE.
 */

/** No published limit for this route. */
function unknownLimit() {
  return {
    maxPercent: null,
    endpoint: NO_LIMIT_FOUND,
    source: '—',
    confidence: CONFIDENCE.none,
  };
}

/** A solvent that forms the balance of the vehicle and needs no ceiling. */
function balanceSolvent() {
  return {
    maxPercent: null,
    endpoint: 'Aqueous balance of the vehicle — no ceiling applies.',
    source: '—',
    confidence: CONFIDENCE.none,
  };
}

/**
 * @typedef {object} Vehicle
 * @property {string} id
 * @property {string} label
 * @property {{ ip: VehicleLimit, oral: VehicleLimit }} limits
 * @property {string} [note]
 */

/** @type {Vehicle[]} */
export const VEHICLES = [
  {
    id: 'saline',
    label: 'Saline (0.9% NaCl)',
    limits: { ip: balanceSolvent(), oral: balanceSolvent() },
  },
  {
    id: 'water',
    label: 'Water (sterile)',
    limits: { ip: balanceSolvent(), oral: balanceSolvent() },
  },
  {
    id: 'dmso',
    label: 'DMSO (Dimethyl Sulfoxide)',
    limits: {
      ip: {
        maxPercent: 16,
        endpoint: 'Highest concentration with no effect on locomotor activity (reduced activity seen at 32%).',
        source: CASTRO_1995,
        confidence: CONFIDENCE.moderate,
      },
      oral: {
        maxPercent: 10,
        endpoint: 'Commonly tolerated in healthy adult mice; 5% preferred, 2% or less for compromised or neonatal animals.',
        source: ORAL_PRACTITIONER,
        confidence: CONFIDENCE.low,
      },
    },
    note: 'Palatability in voluntary oral consumption is not established. A refused mealworm is a failed session, not a safety event — determine empirically.',
  },
  {
    id: 'ethanol',
    label: 'Ethanol',
    limits: {
      ip: {
        maxPercent: 8,
        endpoint: 'Biphasic: activity INCREASED at 16% and decreased at 32%. 8% is the highest concentration tested without an effect.',
        source: CASTRO_1995,
        confidence: CONFIDENCE.moderate,
      },
      oral: {
        maxPercent: 10,
        endpoint: 'Oral/i.v. formulation range, not an i.p. safety limit.',
        source: CAMBRIDGE_MEDCHEM,
        confidence: CONFIDENCE.low,
      },
    },
    note: 'Stimulation at 16% is a behavioural confound, not sedation — relevant if your endpoint is activity.',
  },
  {
    id: 'emulphor',
    label: 'Emulphor (Alkamuls EL-620)',
    limits: {
      ip: {
        maxPercent: 32,
        endpoint: 'No effect on locomotor activity at any concentration tested (2, 4, 8, 16, 32%). The true ceiling is above 32% and was not established.',
        source: CASTRO_1995,
        confidence: CONFIDENCE.moderate,
      },
      oral: unknownLimit(),
    },
  },
  {
    id: 'tween80',
    label: 'Tween-80 (Polysorbate 80)',
    limits: {
      ip: {
        maxPercent: 16,
        endpoint: 'Highest concentration with no effect on locomotor activity (reduced activity seen at 32%).',
        source: CASTRO_1995,
        confidence: CONFIDENCE.moderate,
      },
      oral: {
        maxPercent: 10,
        endpoint: 'Oral/i.v. formulation range, not an i.p. safety limit.',
        source: CAMBRIDGE_MEDCHEM,
        confidence: CONFIDENCE.low,
      },
    },
  },
  {
    id: 'tween20',
    label: 'Tween-20 (Polysorbate 20)',
    limits: {
      ip: {
        maxPercent: 8,
        endpoint: 'Highest concentration with no effect on locomotor activity (reduced activity seen at 16%).',
        source: CASTRO_1995,
        confidence: CONFIDENCE.moderate,
      },
      oral: unknownLimit(),
    },
  },
  {
    id: 'peg400',
    label: 'PEG 400 (Polyethylene glycol 400)',
    limits: {
      ip: {
        maxPercent: 35,
        endpoint: 'Reported tolerated at 35% given at 10 mL/kg i.p. for 3 days. Widely described as among the safest co-solvents.',
        source: 'Secondary sources compiling preclinical practice; primary study not verified.',
        confidence: CONFIDENCE.low,
      },
      oral: unknownLimit(),
    },
    note: 'PEG is more dangerous i.p. than its reputation suggests: PEG 200 at 8 mL/kg i.p. required euthanising half the animals (Thiele et al. 2020). Do not assume PEG grades are interchangeable.',
  },
  {
    id: 'peg300',
    label: 'PEG 300 (Polyethylene glycol 300)',
    limits: {
      ip: {
        maxPercent: 40,
        endpoint: 'Used at 40% in the widely published 10% DMSO / 40% PEG300 / 5% Tween-80 / 45% saline vehicle. Common practice, not a measured ceiling.',
        source: 'Common preclinical formulation; no controlled tolerability study located.',
        confidence: CONFIDENCE.low,
      },
      oral: unknownLimit(),
    },
    note: 'See the PEG 400 warning — PEG grades differ in toxicity.',
  },
  {
    id: 'propylene-glycol',
    label: 'Propylene glycol',
    limits: {
      ip: unknownLimit(),
      oral: {
        maxPercent: 60,
        endpoint: 'Oral/i.v. formulation range, not an i.p. safety limit.',
        source: CAMBRIDGE_MEDCHEM,
        confidence: CONFIDENCE.low,
      },
    },
  },
  {
    id: 'cremophor',
    label: 'Cremophor EL',
    limits: {
      ip: unknownLimit(),
      oral: {
        maxPercent: 10,
        endpoint: 'Oral/i.v. formulation range, not an i.p. safety limit.',
        source: CAMBRIDGE_MEDCHEM,
        confidence: CONFIDENCE.low,
      },
    },
  },
  {
    id: 'sesame-oil',
    label: 'Sesame oil',
    limits: { ip: unknownLimit(), oral: unknownLimit() },
    note: 'Widely used as a vehicle for lipophilic compounds, especially steroids, but no quantitative percentage limit was found in the literature searched. Verify with your IACUC.',
  },
  {
    id: 'corn-oil',
    label: 'Corn oil',
    limits: { ip: unknownLimit(), oral: unknownLimit() },
    note: 'Common lipophilic vehicle; no quantitative percentage limit found. Verify with your IACUC.',
  },
];

/** @param {string} id */
export function getVehicle(id) {
  return VEHICLES.find((v) => v.id === id);
}

/**
 * Look up the limit for a vehicle on a given route.
 *
 * @param {string} id
 * @param {'ip' | 'oral'} route
 * @returns {VehicleLimit | undefined}
 */
export function getVehicleLimit(id, route) {
  return getVehicle(id)?.limits?.[route];
}

/** Options for a solvent picker. */
export const VEHICLE_OPTIONS = VEHICLES.map((v) => ({ value: v.id, label: v.label }));

/** The 1:1:18 ethanol : Emulphor : saline vehicle, as parts. */
export const DEFAULT_IP_VEHICLE_ROWS = [
  { vehicleId: 'ethanol', parts: '1' },
  { vehicleId: 'emulphor', parts: '1' },
  { vehicleId: 'saline', parts: '18' },
];

/** A plain saline starting point for oral delivery. */
export const DEFAULT_ORAL_VEHICLE_ROWS = [
  { vehicleId: 'dmso', parts: '1' },
  { vehicleId: 'saline', parts: '19' },
];
