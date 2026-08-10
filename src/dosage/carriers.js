/**
 * What a dose is loaded into.
 *
 * A mealworm and a lump of peanut butter differ in almost nothing that matters
 * to the chemistry: the drug is dissolved in a vehicle, a volume of that
 * vehicle goes into a carrier, and the animal eats the carrier. What differs is
 * the physical envelope — how much liquid the carrier holds, what instrument
 * puts it there, and therefore what the smallest deliverable volume is.
 *
 * Those differences live here as data, so both delivery methods run the same
 * calculator. The alternative was a second copy of a 350-line form, which is
 * how the intraperitoneal calculator ended up several rounds behind this one.
 */

/**
 * @typedef {object} Carrier
 * @property {string} noun What one unit of it is called, in prose.
 * @property {string} capacityLabel
 * @property {string} capacityHint
 * @property {object} capacitySlider min/max/step/marks for the capacity slider.
 * @property {number} defaultCapacityUl
 * @property {boolean} usesSyringe Whether a syringe, not the pipette, delivers the dose.
 * @property {number} [defaultSyringeMinUl]
 * @property {boolean} namable Whether the carrier itself gets a name field.
 * @property {boolean} weighed Whether an amount of carrier per subject is recorded.
 * @property {string} volumeLabel
 * @property {string} loadColumnLabel Heading in the dosing table.
 */

/** @type {Carrier} */
const MEALWORM = {
  noun: 'worm',
  capacityLabel: 'Mealworm loading capacity',
  capacityHint: '* the most liquid a worm absorbs before it leaks',
  capacitySlider: {
    min: 25,
    max: 400,
    step: 25,
    marks: [
      { value: 25, label: '25' },
      { value: 125, label: '125 (small)' },
      { value: 250, label: '250 (large)' },
      { value: 375, label: '375' },
    ],
  },
  defaultCapacityUl: 100,
  usesSyringe: true,
  defaultSyringeMinUl: 25,
  namable: false,
  weighed: false,
  volumeLabel: 'Volume loaded per worm',
  loadColumnLabel: 'Load into worm',
  printTitle: 'mealworm oral dosing calculator',
};

/**
 * Peanut butter, gelatin, jelly, transgenic cookie dough.
 *
 * No syringe: the solution is pipetted onto the portion, so the smallest dose
 * volume is whatever the pipette can deliver — which in some labs is 0.1 uL,
 * two hundred times finer than an insulin syringe. The slider therefore has to
 * reach the pipette minimum rather than stopping at a worm-sized floor.
 *
 * The ceiling is not a property of the substance the way a worm's is. It is
 * whatever the lab has decided a subject will reliably finish, so it has no
 * sensible default beyond a starting point.
 */
/** @type {Carrier} */
const SOLID = {
  noun: 'portion',
  substanceNoun: 'solid',
  capacityLabel: 'Most solution the portion will hold',
  capacityHint:
    '* how much your lab has decided a portion carries without running or being refused',
  capacitySlider: {
    min: 0,
    max: 500,
    step: 0.1,
    marks: [
      { value: 0, label: '0' },
      { value: 100, label: '100' },
      { value: 250, label: '250' },
      { value: 500, label: '500' },
    ],
  },
  defaultCapacityUl: 100,
  usesSyringe: false,
  namable: true,
  weighed: true,
  volumeLabel: 'Volume loaded per portion',
  loadColumnLabel: 'Load into portion',
  printTitle: 'solid oral dosing calculator',
};

export const CARRIERS = { mealworm: MEALWORM, solid: SOLID };
