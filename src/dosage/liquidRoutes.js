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
import { DEFAULT_IP_VEHICLE_ROWS, DEFAULT_ORAL_VEHICLE_ROWS } from './vehicles';

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
  defaultVehicleRows: DEFAULT_ORAL_VEHICLE_ROWS,
};

export const LIQUID_ROUTES = {
  'intraperitoneal-injection': INTRAPERITONEAL,
  'oral-gavage': ORAL_GAVAGE,
};
