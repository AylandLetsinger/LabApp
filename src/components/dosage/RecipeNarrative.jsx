import { Group, Text } from '@mantine/core';
import LabSelect from '../LabSelect';
import { DOSE_UNITS, VOLUME_UNITS } from '../../constants/doseUnits';
import { mlToVolumeUnit, volumeToMl } from '../../dosage/unitConversions';
import {
  MOLAR_AMOUNT_UNITS,
  MOLAR_CONCENTRATION_UNITS,
  isMolarConcentrationUnit,
  mgPerMlToMolarConcentration,
  mgToDrugAmountUnit,
} from '../../dosage/molarUnits';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';

/**
 * One sentence stating what a single dose actually is.
 *
 * The tables above give a reader everything they need and no way to check they
 * have understood it. Reading the whole thing back as a sentence is how you
 * notice that a number is off by a thousand — which is the failure this
 * calculator exists to prevent.
 *
 * Units are switchable inline, because the number that looks wrong is often
 * only unfamiliar: 0.0005 g and 0.5 mg read very differently.
 */
export default function RecipeNarrative({
  volumePerDoseMl,
  dosePerSubjectMg,
  concentrationMgPerMl,
  doseRateMgPerKg,
  molecularWeight,
  units,
  setUnit,
  perSoluteFooter,
}) {
  const ready =
    Number.isFinite(volumePerDoseMl) &&
    Number.isFinite(dosePerSubjectMg) &&
    Number.isFinite(concentrationMgPerMl);
  if (!ready) return null;

  // Molar read-back needs a molecular weight, so those units are only offered
  // once one is given — the same gate as everywhere else.
  const hasMolecularWeight = toPositiveNumber(molecularWeight) !== undefined;
  const doseUnits = hasMolecularWeight ? [...DOSE_UNITS, ...MOLAR_AMOUNT_UNITS] : DOSE_UNITS;
  const concUnits = hasMolecularWeight
    ? [...DOSE_UNITS, ...MOLAR_CONCENTRATION_UNITS]
    : DOSE_UNITS;

  const volume = mlToVolumeUnit(volumePerDoseMl, units.narrativeVolume);
  const dose = mgToDrugAmountUnit(dosePerSubjectMg, units.narrativeDose, molecularWeight);

  // A molarity already says "per litre", so it takes no volume unit. Otherwise
  // the concentration is stored per mL and switching the volume unit scales it
  // by how many mL that unit is.
  const concIsMolar = isMolarConcentrationUnit(units.narrativeConcMass);
  const concentration = concIsMolar
    ? mgPerMlToMolarConcentration(concentrationMgPerMl, units.narrativeConcMass, molecularWeight)
    : mgToDrugAmountUnit(concentrationMgPerMl, units.narrativeConcMass, molecularWeight) *
      volumeToMl(1, units.narrativeConcVolume);

  /**
   * A unit, switchable on screen and printed as plain text.
   *
   * The dropdown itself is hidden on paper, so without the text beside it the
   * sentence prints as "Each dose of 5 delivers 0.5 of a 100 per solution" —
   * every number stripped of what it measures. On a bench sheet that is worse
   * than printing nothing at all.
   */
  const unitPicker = (key, data, ariaLabel) => (
    <>
      <LabSelect
        data={data}
        value={units[key]}
        onChange={(value) => setUnit(key, value ?? data[0].value)}
        aria-label={ariaLabel}
        size="xs"
        w={72}
        className="no-print"
      />
      <Text component="span" size="sm" fw={700} className="print-only">
        {data.find((d) => d.value === units[key])?.label ?? units[key]}
      </Text>
    </>
  );

  return (
    <>
    <Group gap={6} align="center" wrap="wrap" mt="md">
      <Text size="sm">Each dose of</Text>
      <Text size="sm" fw={700} ff="monospace">
        {roundTo(volume, 4)}
      </Text>
      {unitPicker('narrativeVolume', VOLUME_UNITS, 'Unit for the dose volume')}

      <Text size="sm">delivers</Text>
      <Text size="sm" fw={700} ff="monospace">
        {roundTo(dose, 6)}
      </Text>
      {unitPicker('narrativeDose', doseUnits, 'Unit for the dose')}

      <Text size="sm">of a</Text>
      <Text size="sm" fw={700} ff="monospace">
        {roundTo(concentration, 6)}
      </Text>
      {unitPicker('narrativeConcMass', concUnits, 'Concentration unit')}
      {!concIsMolar && (
        <>
          <Text size="sm">per</Text>
          {unitPicker('narrativeConcVolume', VOLUME_UNITS, 'Concentration volume unit')}
        </>
      )}
      <Text size="sm">solution</Text>

      <Text size="sm">.</Text>
    </Group>

    {Number.isFinite(doseRateMgPerKg) && (
      <Text size="sm" mt={6}>
        A <strong>{roundTo(doseRateMgPerKg, 4)} mg/kg</strong> dose on average.
      </Text>
    )}
    {perSoluteFooter}
    </>
  );
}
