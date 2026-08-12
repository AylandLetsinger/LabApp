/**
 * Catalogue of vehicle solvents and their published tolerability data.
 *
 * WHY THIS FILE LOOKS THE WAY IT DOES
 * -----------------------------------
 * An earlier version stored one number per solvent — `maxPercent`. That is a
 * simplification the source data does not support. Gad et al. never publish a
 * bare maximum percentage; every row is a (concentration, volume, duration)
 * triple for a named species and route, because what an animal experiences is
 * the total solvent DOSE:
 *
 *     solvent dose (mg/kg) = %v/v x volume (mL/kg) x density (g/mL)
 *
 * A 15% solution given at 10 mL/kg and a 30% solution given at 5 mL/kg deliver
 * the same solvent burden. Storing only "15%" throws away the half of the
 * measurement that makes rows comparable.
 *
 * So each vehicle carries a list of observations, and the app derives mg/kg
 * from them. Where no published figure exists the list is empty — that is
 * recorded honestly rather than filled with a plausible-looking guess. A
 * fabricated ceiling on an animal-dosing tool is worse than no ceiling.
 *
 * These are guidelines. The governing authority is the user's IACUC protocol,
 * and the UI says so wherever these numbers appear.
 */

/** How much weight a published figure can bear. */
export const CONFIDENCE = {
  high: 'high',
  moderate: 'moderate',
  low: 'low',
};

const GAD_2016 = 'Gad et al. 2016, Int J Toxicol, doi:10.1177/1091581815622442';
const CASTRO_1995 = 'Castro et al. 1995, Pharmacol Biochem Behav (PMID 7617697)';
const CAMBRIDGE = 'Cambridge MedChem Consulting — formulation ranges, not safety limits';

/**
 * @typedef {object} Observation
 * @property {'mouse'|'rat'|'other'} species
 * @property {'ip'|'oral'|'iv'|'sc'} route
 * @property {number} [percentVv] Concentration administered, %v/v.
 * @property {number} [volumeMlPerKg] Dose volume.
 * @property {number} [doseMgPerKg] Stated directly when the source gives mass.
 * @property {string} duration
 * @property {string} outcome
 * @property {'tolerated'|'adverse'|'lethal'} verdict
 * @property {string} source
 * @property {string} confidence
 */

/**
 * @typedef {object} Vehicle
 * @property {string} id
 * @property {string} label
 * @property {number} densityGPerMl
 * @property {boolean} [isSurfactant] Can hold immiscible phases together.
 * @property {boolean} [isOil]
 * @property {Observation[]} observations
 * @property {string} [note]
 */

/** @type {Vehicle[]} */
export const VEHICLES = [
  {
    id: 'saline',
    label: 'Saline (0.9% NaCl)',
    densityGPerMl: 1.005,
    isAqueous: true,
    observations: [],
    note: 'Aqueous balance of the vehicle. No ceiling applies.',
  },
  {
    id: 'water',
    label: 'Water (sterile)',
    densityGPerMl: 1.0,
    isAqueous: true,
    observations: [],
    note: 'Aqueous balance of the vehicle. No ceiling applies.',
  },
  {
    id: 'acsf',
    label: 'ACSF (artificial cerebrospinal fluid)',
    densityGPerMl: 1.005,
    isAqueous: true,
    observations: [],
    note:
      'Aqueous balance of the vehicle, matched to CSF ionic composition. No ' +
      'solvent ceiling applies. Recipes vary between labs — the app treats it ' +
      'as saline-like and does not model its salts.',
  },
  /*
   * Suspending agents, not solvents. The point of them is that the drug does
   * NOT dissolve: it stays evenly dispersed long enough to be drawn up and
   * given. So leave the solubility box empty for these — a suspension has no
   * solubility floor to clear, and putting a number there would impose one
   * that does not exist.
   */
  {
    id: 'methylcellulose',
    label: 'Methylcellulose (aqueous, e.g. 0.5%)',
    densityGPerMl: 1.0,
    isAqueous: true,
    observations: [],
    note:
      'A suspending agent for oral gavage, not a solvent — the drug is dispersed, not ' +
      'dissolved, so leave solubility blank. The percentage refers to methylcellulose in ' +
      'water; this app treats the made-up vehicle as the aqueous balance and does not model ' +
      'its viscosity. Shake or vortex immediately before each dose.',
  },
  {
    id: 'cmc',
    label: 'Carboxymethylcellulose (CMC, aqueous, e.g. 0.5%)',
    densityGPerMl: 1.0,
    isAqueous: true,
    observations: [],
    note:
      'A suspending agent for oral gavage, not a solvent — as for methylcellulose, leave ' +
      'solubility blank and resuspend before each dose.',
  },
  {
    id: 'dmso',
    label: 'DMSO (Dimethyl Sulfoxide)',
    densityGPerMl: 1.1,
    observations: [
      {
        species: 'mouse', route: 'ip', percentVv: 15, volumeMlPerKg: 10,
        duration: '3 days', outcome: 'Well tolerated', verdict: 'tolerated',
        source: `${GAD_2016}, Table 36`, confidence: CONFIDENCE.high,
      },
      {
        species: 'mouse', route: 'ip', doseMgPerKg: 100,
        duration: '1 month', outcome: 'Well tolerated', verdict: 'tolerated',
        source: `${GAD_2016}, Table 36`, confidence: CONFIDENCE.high,
      },
      {
        species: 'mouse', route: 'oral', volumeMlPerKg: 5,
        duration: 'not stated', outcome: 'No adverse effect reported',
        verdict: 'tolerated',
        source: `${GAD_2016}, Table 36`, confidence: CONFIDENCE.moderate,
      },
      {
        species: 'mouse', route: 'oral', percentVv: 100, doseMgPerKg: 7900,
        duration: 'acute', outcome: 'LD50 (lowest of 7.9-22 g/kg range)',
        verdict: 'lethal',
        source: `${GAD_2016}, Table 36`, confidence: CONFIDENCE.high,
      },
      {
        species: 'mouse', route: 'ip', percentVv: 16,
        duration: 'acute', outcome: 'Highest concentration with no effect on locomotor activity; reduced activity at 32%',
        verdict: 'tolerated',
        source: CASTRO_1995, confidence: CONFIDENCE.moderate,
      },
    ],
    note: 'Palatability in voluntary oral consumption is not established. A refused mealworm is a failed session, not a safety event — determine empirically.',
    miscibility: {
      poorlyMiscibleWith: ['oil'],
      maxPercentInOil: 10,
      message:
        'DMSO and vegetable oils separate. Practice keeps DMSO at or below ~10% in oil, ' +
        'or adds a surfactant (Tween-80, Cremophor, Emulphor) to hold the phases together. ' +
        'A separated batch produces unequal doses that the numbers on screen will not reveal.',
    },
  },
  {
    id: 'ethanol',
    label: 'Ethanol',
    densityGPerMl: 0.789,
    observations: [
      {
        species: 'mouse', route: 'ip', percentVv: 5, volumeMlPerKg: 5,
        duration: 'acute', outcome: 'Well tolerated', verdict: 'tolerated',
        source: `${GAD_2016}, Table 39`, confidence: CONFIDENCE.high,
      },
      {
        species: 'mouse', route: 'oral', percentVv: 5, volumeMlPerKg: 2.5,
        duration: '1 month', outcome: 'Well tolerated', verdict: 'tolerated',
        source: `${GAD_2016}, Table 39`, confidence: CONFIDENCE.high,
      },
      {
        species: 'mouse', route: 'ip', percentVv: 8,
        duration: 'acute', outcome: 'Highest concentration with no locomotor effect; activity INCREASED at 16%, decreased at 32%',
        verdict: 'tolerated',
        source: CASTRO_1995, confidence: CONFIDENCE.moderate,
      },
    ],
    note: 'Stimulation at 16% is a behavioural confound, not sedation — relevant if your endpoint is activity.',
  },
  {
    id: 'emulphor',
    label: 'Emulphor (Alkamuls EL-620)',
    densityGPerMl: 1.06,
    isSurfactant: true,
    observations: [
      {
        species: 'mouse', route: 'ip', percentVv: 32,
        duration: 'acute', outcome: 'No effect on locomotor activity at any concentration tested (2-32%). True ceiling above 32%, not established.',
        verdict: 'tolerated',
        source: CASTRO_1995, confidence: CONFIDENCE.moderate,
      },
    ],
    note:
      'Polyoxyethylated (ethoxylated) castor oil — the ethoxylation is what makes it a '
      + 'water-dispersible surfactant rather than an oil. Same class as Cremophor EL, which is '
      + 'why they substitute for each other. Keeps lipophilic compounds emulsified instead of '
      + 'precipitating when they meet an aqueous phase. Density is approximate.',
  },
  {
    id: 'tween80',
    label: 'Tween-80 (Polysorbate 80)',
    densityGPerMl: 1.064,
    isSurfactant: true,
    observations: [
      {
        species: 'mouse', route: 'ip', percentVv: 16,
        duration: 'acute', outcome: 'Highest concentration with no locomotor effect; reduced activity at 32%',
        verdict: 'tolerated',
        source: CASTRO_1995, confidence: CONFIDENCE.moderate,
      },
    ],
    note: 'A surfactant. Commonly used to stop DMSO and oil separating.',
  },
  {
    id: 'tween20',
    label: 'Tween-20 (Polysorbate 20)',
    densityGPerMl: 1.095,
    isSurfactant: true,
    observations: [
      {
        species: 'mouse', route: 'ip', percentVv: 8,
        duration: 'acute', outcome: 'Highest concentration with no locomotor effect; reduced activity at 16%',
        verdict: 'tolerated',
        source: CASTRO_1995, confidence: CONFIDENCE.moderate,
      },
    ],
  },
  {
    id: 'peg400',
    label: 'PEG 400 (Polyethylene glycol 400)',
    densityGPerMl: 1.128,
    observations: [
      {
        species: 'mouse', route: 'ip', percentVv: 35, volumeMlPerKg: 10,
        duration: '3 days', outcome: 'Reported tolerated',
        verdict: 'tolerated',
        source: 'Secondary sources compiling preclinical practice; primary study not verified',
        confidence: CONFIDENCE.low,
      },
    ],
    note: 'PEG is more dangerous i.p. than its reputation suggests: PEG 200 at 8 mL/kg i.p. required euthanising half the animals (Thiele et al. 2020). Do not assume PEG grades are interchangeable.',
  },
  {
    id: 'peg300',
    label: 'PEG 300 (Polyethylene glycol 300)',
    densityGPerMl: 1.125,
    observations: [
      {
        species: 'mouse', route: 'ip', percentVv: 40,
        duration: 'common practice', outcome: 'Used at 40% in the published 10% DMSO / 40% PEG300 / 5% Tween-80 / 45% saline vehicle. Common practice, not a measured ceiling.',
        verdict: 'tolerated',
        source: 'Common preclinical formulation; no controlled tolerability study located',
        confidence: CONFIDENCE.low,
      },
    ],
    note: 'See the PEG 400 warning — PEG grades differ in toxicity.',
  },
  {
    id: 'propylene-glycol',
    label: 'Propylene glycol',
    densityGPerMl: 1.036,
    observations: [
      {
        species: 'other', route: 'oral', percentVv: 60,
        duration: 'not stated', outcome: 'Formulation range for oral/i.v., not an i.p. safety limit',
        verdict: 'tolerated', source: CAMBRIDGE, confidence: CONFIDENCE.low,
      },
    ],
  },
  {
    id: 'cremophor',
    label: 'Cremophor EL',
    densityGPerMl: 1.05,
    isSurfactant: true,
    observations: [
      {
        species: 'other', route: 'oral', percentVv: 10,
        duration: 'not stated', outcome: 'Formulation range for oral/i.v., not an i.p. safety limit',
        verdict: 'tolerated', source: CAMBRIDGE, confidence: CONFIDENCE.low,
      },
    ],
    note: 'A surfactant. Commonly used to stop DMSO and oil separating.',
  },
  {
    id: 'sesame-oil',
    label: 'Sesame oil',
    densityGPerMl: 0.92,
    isOil: true,
    observations: [],
    note:
      'No quantitative tolerability limit found in the literature searched. Widely used for ' +
      'lipophilic compounds — dronabinol (oral THC) is formulated in sesame oil, so it is a ' +
      'plausible single vehicle for a lipophilic drug with no DMSO at all. Not a surfactant: ' +
      'it will not hold a DMSO/oil mixture together.',
  },
  {
    id: 'corn-oil',
    label: 'Corn oil',
    densityGPerMl: 0.92,
    isOil: true,
    observations: [],
    note:
      'No quantitative tolerability limit found. The documented in vivo route for the GAT211 ' +
      'compound family is a DMSO master stock diluted into corn oil. Not a surfactant.',
  },
];

/** @param {string} id */
export function getVehicle(id) {
  return VEHICLES.find((v) => v.id === id);
}

/** Options for a solvent picker. */
export const VEHICLE_OPTIONS = VEHICLES.map((v) => ({ value: v.id, label: v.label }));

/**
 * Solvent dose implied by one published observation, in mg/kg.
 *
 * Rows that state a mass directly are used as-is. Rows that state a
 * concentration and a volume are multiplied out through the density, which is
 * what makes otherwise incomparable rows comparable.
 *
 * @param {Observation} observation
 * @param {number} densityGPerMl
 * @returns {number | undefined}
 */
export function observationBurdenMgPerKg(observation, densityGPerMl) {
  if (observation.doseMgPerKg !== undefined) return observation.doseMgPerKg;
  if (observation.percentVv === undefined || observation.volumeMlPerKg === undefined) {
    return undefined;
  }
  const solventMlPerKg = observation.volumeMlPerKg * (observation.percentVv / 100);
  return solventMlPerKg * densityGPerMl * 1000;
}

/**
 * Solvent dose a proposed formulation would deliver, in mg/kg.
 *
 * @param {object} p
 * @param {string} p.vehicleId
 * @param {number} p.percentVv Share of the dosed volume that is this solvent.
 * @param {number} p.volumePerSubjectMl Total volume the subject receives.
 * @param {number} p.bodyWeightKg
 * @returns {number | undefined}
 */
export function computeSolventBurdenMgPerKg({
  vehicleId,
  percentVv,
  volumePerSubjectMl,
  bodyWeightKg,
}) {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return undefined;
  if (![percentVv, volumePerSubjectMl, bodyWeightKg].every(Number.isFinite)) return undefined;
  if (bodyWeightKg <= 0) return undefined;

  const solventMl = volumePerSubjectMl * (percentVv / 100);
  const solventMg = solventMl * vehicle.densityGPerMl * 1000;
  return solventMg / bodyWeightKg;
}

/**
 * Observations worth comparing against, most relevant first: same species and
 * route, then same species, then everything else. Lethal rows sort last so a
 * tolerated figure is what the user sees first.
 */
export function relevantObservations(vehicleId, { species = 'mouse', route = 'ip' } = {}) {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return [];
  const score = (o) => {
    let s = 0;
    if (o.species === species) s += 2;
    if (o.route === route) s += 2;
    if (o.verdict === 'lethal') s -= 3;
    return s;
  };
  return [...vehicle.observations].sort((a, b) => score(b) - score(a));
}

/**
 * Every tolerated burden published for a species and route, ascending.
 *
 * Route-strict by design. An earlier version fell back to another route when
 * the one asked for had nothing, which meant an oral formulation was being
 * judged against intraperitoneal figures — two different exposures, and not
 * comparable. Where a route has no published figure the honest answer is
 * silence, and the tooltip still shows what exists for other routes, labelled.
 */
export function toleratedBurdenRange(vehicleId, { species = 'mouse', route = 'ip' } = {}) {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return undefined;

  // Published practice is context, not evidence of a limit. Including it lets
  // a vehicle in common use become its own justification, which showed up as
  // a row reporting "delivers 424, published 424".
  const collect = (filter) =>
    vehicle.observations
      .filter((o) => o.verdict === 'tolerated' && o.kind !== 'practice' && filter(o))
      .map((o) => ({ observation: o, mgPerKg: observationBurdenMgPerKg(o, vehicle.densityGPerMl) }))
      .filter((x) => x.mgPerKg !== undefined)
      .sort((a, b) => a.mgPerKg - b.mgPerKg);

  const entries = collect((o) => o.species === species && o.route === route);
  if (entries.length === 0) return undefined;

  return { lowest: entries[0], highest: entries[entries.length - 1], entries };
}

/**
 * Where a proposed burden sits against the published range.
 *
 * Three tiers rather than one threshold, because the published figures span
 * more than an order of magnitude and differ mostly in study duration. A
 * one-month repeated-dose figure should not condemn a single acute dose, but
 * the user should still be told they are above it.
 *
 * @returns {'ok'|'above-lowest'|'above-highest'|'unknown'}
 */
export function classifyBurden(burdenMgPerKg, range) {
  if (burdenMgPerKg === undefined || !range) return 'unknown';
  if (burdenMgPerKg <= range.lowest.mgPerKg) return 'ok';
  if (burdenMgPerKg <= range.highest.mgPerKg) return 'above-lowest';
  return 'above-highest';
}

/**
 * Maximum drug concentration achievable in a finished vehicle.
 *
 * A drug dissolved in a primary solvent cannot be more concentrated in the
 * final mix than (its solubility in that solvent) x (the fraction of the mix
 * that solvent is allowed to be). This ceiling is what sets the minimum
 * volume each subject must receive, and it does not depend on batch size.
 */
export function maxAchievableConcentrationMgPerMl(solubilityMgPerMl, maxSolventFraction) {
  if (!Number.isFinite(solubilityMgPerMl) || !Number.isFinite(maxSolventFraction)) return undefined;
  if (solubilityMgPerMl <= 0 || maxSolventFraction <= 0) return undefined;
  return solubilityMgPerMl * maxSolventFraction;
}

/**
 * Warn when a mixture pairs a poorly miscible solvent with an oil and has no
 * surfactant to hold it together.
 *
 * @param {Array<{vehicleId: string, percentVv: number}>} rows
 * @returns {Array<{level: 'error'|'warning', message: string}>}
 */
export function checkMiscibility(rows) {
  const issues = [];
  const present = rows.map((r) => ({ ...r, vehicle: getVehicle(r.vehicleId) })).filter((r) => r.vehicle);
  const hasOil = present.some((r) => r.vehicle.isOil && r.percentVv > 0);
  const hasSurfactant = present.some((r) => r.vehicle.isSurfactant && r.percentVv > 0);
  if (!hasOil) return issues;

  present.forEach((r) => {
    const limit = r.vehicle.miscibility;
    if (!limit?.poorlyMiscibleWith?.includes('oil')) return;
    if (r.percentVv <= 0) return;
    if (r.percentVv > limit.maxPercentInOil && !hasSurfactant) {
      issues.push({
        level: 'error',
        message:
          `${r.vehicle.label} is ${Math.round(r.percentVv * 100) / 100}% of a mixture containing oil, ` +
          `above the ~${limit.maxPercentInOil}% where the phases usually stay together. ${limit.message}`,
      });
    }
  });
  return issues;
}

/** The 1:1:18 ethanol : Emulphor : saline vehicle, as parts. */
export const DEFAULT_IP_VEHICLE_ROWS = [
  { vehicleId: 'ethanol', parts: '1' },
  { vehicleId: 'emulphor', parts: '1' },
  { vehicleId: 'saline', parts: '18' },
];

/**
 * One solvent to begin with. A drug that dissolves in saline needs nothing
 * else, and anyone who needs a co-solvent will add it — starting with a guess
 * about their chemistry only invites them to accept it.
 */
export const DEFAULT_ORAL_VEHICLE_ROWS = [{ vehicleId: 'saline', parts: '1' }];
