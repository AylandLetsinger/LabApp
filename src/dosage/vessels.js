/**
 * What the drug is going into, when it is not going into an animal.
 *
 * A 200 uL well and a 50 mL recording chamber pose the same question — reach
 * concentration C in a fixed volume V by adding a little stock, without the
 * stock's solvent reaching a fraction the preparation will not tolerate. They
 * differ in vocabulary and in scale, not in arithmetic, so they share one
 * calculator the way the mealworm and the edible solid do.
 */

/**
 * @typedef {object} Vessel
 * @property {string} noun One of them, in prose.
 * @property {string} pluralNoun
 * @property {string} volumeLabel
 * @property {string} countLabel
 * @property {number} defaultVolume In `defaultVolumeUnit`.
 * @property {string} defaultVolumeUnit
 * @property {boolean} hasReplicates Whether a count is multiplied by replicates.
 * @property {string} volumeHint
 */

/** @type {Vessel} */
const WELL_PLATE = {
  noun: 'well',
  pluralNoun: 'wells',
  volumeLabel: 'Final volume per well',
  countLabel: 'Number of conditions',
  defaultVolume: 200,
  defaultVolumeUnit: 'ul',
  hasReplicates: true,
  volumeHint: '* the volume in the well AFTER the stock goes in, not before',
};

/** @type {Vessel} */
const BATH = {
  noun: 'bath',
  pluralNoun: 'baths',
  volumeLabel: 'Final volume in the bath',
  countLabel: 'Number of baths',
  defaultVolume: 20,
  defaultVolumeUnit: 'ml',
  hasReplicates: false,
  volumeHint:
    '* the working volume of the chamber or reservoir. Continuous perfusion at a ' +
    'changing concentration is a different problem — this assumes one made-up volume.',
};

export const VESSELS = { 'well-plate': WELL_PLATE, bath: BATH };

export const VESSEL_OPTIONS = [
  { value: 'well-plate', label: 'Well plate' },
  { value: 'bath', label: 'Bath / recording chamber' },
];
