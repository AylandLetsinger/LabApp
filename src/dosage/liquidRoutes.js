/**
 * Routes that deliver a measured volume of liquid, scaled to the animal.
 *
 * An intraperitoneal injection and an oral gavage pose the same question: a
 * dose in mg/kg, a volume in mL/kg, and a vehicle whose solvents the animal has
 * to tolerate. They differ in the noun, in how much volume is reasonable, and —
 * the part that matters — in which published tolerability figures apply.
 *
 * That last one is why `route` is here rather than assumed. Judging an oral
 * vehicle against intraperitoneal numbers is exactly the conflation this app
 * had to have taken out of it once already.
 */
import {
  DEFAULT_IP_VEHICLE_ROWS,
  DEFAULT_SALINE_VEHICLE_ROWS,
  hasObservationsForRoute,
} from './vehicles';

/**
 * @typedef {object} LiquidRoute
 * @property {'ip'|'oral'} route Which published observations apply.
 * @property {string} noun One administration, in prose.
 * @property {string} pluralNoun
 * @property {string} volumeLabel
 * @property {string} volumeHint
 * @property {string} countLabel
 * @property {string} printTitle
 * @property {Array} defaultVehicleRows
 */

/** @type {LiquidRoute} */
const INTRAPERITONEAL = {
  route: 'ip',
  noun: 'injection',
  pluralNoun: 'injections',
  volumeLabel: 'Volume per injection',
  volumeHint: '* mice tolerate about 0.1 mL per 10 g intraperitoneally',
  countLabel: 'Total number of injections to prepare',
  printTitle: 'intraperitoneal injection calculator',
  defaultVehicleRows: DEFAULT_IP_VEHICLE_ROWS,
};

/**
 * @type {LiquidRoute}
 *
 * A gavage is more often a suspension than a solution — methylcellulose and
 * CMC are in the catalogue for that reason — so the solubility column is
 * frequently left blank here, and correctly so.
 */
const ORAL_GAVAGE = {
  route: 'oral',
  noun: 'gavage',
  pluralNoun: 'gavages',
  volumeLabel: 'Volume per gavage',
  volumeHint:
    '* 10 mL/kg is the usual mouse gavage volume, with up to 20 mL/kg cited for a single ' +
    'dose. Your IACUC protocol governs.',
  countLabel: 'Total number of gavages to prepare',
  printTitle: 'oral gavage calculator',
  defaultVehicleRows: DEFAULT_SALINE_VEHICLE_ROWS,
};

/**
 * @type {LiquidRoute}
 *
 * Subcutaneous is the route where a dose is routinely split between sites, so
 * it is the only one that asks how many. Splitting changes what goes under the
 * skin in one place; it does not change what the animal receives, so nothing
 * downstream of the per-subject volume depends on it.
 */
const SUBCUTANEOUS = {
  route: 'sc',
  noun: 'injection',
  pluralNoun: 'injections',
  volumeLabel: 'Volume per injection',
  volumeHint:
    '* mice are commonly given up to about 5 mL/kg per subcutaneous site, with larger totals ' +
    'split between sites. Your IACUC protocol governs.',
  countLabel: 'Total number of injections to prepare',
  printTitle: 'subcutaneous injection calculator',
  defaultVehicleRows: DEFAULT_SALINE_VEHICLE_ROWS,
  hasSites: true,
};

export const LIQUID_ROUTES = {
  'intraperitoneal-injection': INTRAPERITONEAL,
  'subcutaneous-injection': SUBCUTANEOUS,
  'oral-gavage': ORAL_GAVAGE,
};

/**
 * Whether this app can say anything about solvent tolerability for a route.
 *
 * False means no warning will ever appear on that page, and a reader who has
 * seen warnings on the intraperitoneal page could easily take that silence for
 * approval. Pages use this to say so plainly instead.
 */
export function routeHasTolerabilityData(route) {
  return hasObservationsForRoute(route.route);
}
