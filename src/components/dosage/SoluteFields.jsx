import { Group, NumberInput, Text, TextInput } from '@mantine/core';
import { DOSE_UNITS, VOLUME_UNITS, WEIGHT_UNITS } from '../../constants/doseUnits';
import {
  MOLAR_AMOUNT_UNITS,
  MOLAR_CONCENTRATION_UNITS,
  isMolarConcentrationUnit,
} from '../../dosage/molarUnits';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import LabSelect from '../LabSelect';
import { inputFieldColor } from '../../theme';

const DOSAGE_TYPE_OPTIONS = [
  { value: 'per-subject', label: 'Dose per subject' },
  { value: 'by-body-weight', label: 'Dose by body weight' },
  { value: 'by-volume-concentration', label: 'Dose by volume × concentration' },
];

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * How one substance is dosed: the type, the numbers, and its molecular weight.
 *
 * Every field belongs to a single solute, and `setFieldValue` is scoped to that
 * solute by the caller, so nothing here needs to know its own position in the
 * list. That is what lets the same component serve a lone drug and the third
 * member of a cocktail without a branch.
 *
 * The name is optional and always offered. It changes no arithmetic, but it
 * does change what the recipe says: "Dissolve 25 mg of ketamine" is a printed
 * page someone can follow at the bench, where "of your solute" is a page they
 * have to remember the rest of.
 */
export default function SoluteFields({ solute, setFieldValue, scheduleOutputFeedback }) {
  const {
    dosageType,
    dosePerSubject,
    dosePerSubjectUnit,
    doseAmount,
    doseUnit,
    bodyWeightAmount,
    bodyWeightUnit,
    molecularWeight,
    doseVolume,
    doseVolumeUnit,
    doseConcentrationValue,
    doseConcentrationMassUnit,
    doseConcentrationVolumeUnit,
  } = solute;

  // Molar units stay hidden until there is a molecular weight to convert with.
  // A molar figure interpreted with the wrong weight is wrong by an arbitrary
  // factor and looks entirely reasonable, so it is not offered as a default.
  const mw = toPositiveNumber(molecularWeight);
  const massUnits = mw ? [...DOSE_UNITS, ...MOLAR_AMOUNT_UNITS] : DOSE_UNITS;
  const concentrationUnits = mw ? [...DOSE_UNITS, ...MOLAR_CONCENTRATION_UNITS] : DOSE_UNITS;
  const concentrationIsMolar = isMolarConcentrationUnit(doseConcentrationMassUnit);

  return (
    <>
      <Group align="flex-end" wrap="wrap" gap="sm" mb="md">
        <TextInput
          label="Name"
          placeholder="optional, e.g. ketamine"
          value={solute.name}
          onChange={(event) => setFieldValue('name', event.currentTarget.value)}
          onBlur={scheduleOutputFeedback}
          w={200}
          {...inputBlue}
        />
        <LabSelect
          label="Dosage type"
          data={DOSAGE_TYPE_OPTIONS}
          value={dosageType}
          onChange={(v) => setFieldValue('dosageType', v ?? 'by-body-weight')}
          onBlur={scheduleOutputFeedback}
          w={250}
        />
      </Group>

      {/*
        Molecular weight comes before the dose, because it decides which units
        the dose can be written in. Below the dose row it read as an unexplained
        extra; above it, filling it in visibly adds mol and mM to the menus.
      */}
      <Group align="flex-end" wrap="wrap" gap="sm" mb="md">
        <NumberInput
          label="Molecular weight"
          placeholder="optional"
          min={0}
          decimalScale={4}
          value={molecularWeight}
          onChange={(value) => setFieldValue('molecularWeight', value)}
          onBlur={scheduleOutputFeedback}
          w={170}
          {...inputBlue}
        />
        <Text pb="sm" size="sm">
          g/mol
        </Text>
        {/* The conversion is a fact worth printing; the prompt to supply one
            is advice for someone still filling the form in. */}
        <Text pb="sm" size="sm" c="dimmed" className={mw ? undefined : 'no-print'}>
          {mw ? `→ 1 M = ${roundTo(mw, 4)} mg/mL` : '→ required if using molarity'}
        </Text>
      </Group>

      {dosageType === 'per-subject' && (
        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Dose"
            placeholder="e.g. 0.5"
            min={0}
            decimalScale={6}
            w={120}
            value={dosePerSubject}
            onChange={(v) => setFieldValue('dosePerSubject', v)}
            onBlur={scheduleOutputFeedback}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={massUnits}
            value={dosePerSubjectUnit}
            onChange={(v) => setFieldValue('dosePerSubjectUnit', v ?? 'mg')}
            onBlur={scheduleOutputFeedback}
            w={100}
          />
          <Text pb="sm" size="sm">
            per subject
          </Text>
        </Group>
      )}

      {dosageType === 'by-body-weight' && (
        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Dose"
            placeholder="e.g. 20"
            min={0}
            decimalScale={6}
            w={120}
            value={doseAmount}
            onChange={(v) => setFieldValue('doseAmount', v)}
            onBlur={scheduleOutputFeedback}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={massUnits}
            value={doseUnit}
            onChange={(v) => setFieldValue('doseUnit', v ?? 'mg')}
            onBlur={scheduleOutputFeedback}
            w={100}
          />
          <Text pb="sm" size="sm">
            per
          </Text>
          <NumberInput
            label="Body weight"
            placeholder="e.g. 1"
            min={0}
            decimalScale={6}
            w={120}
            value={bodyWeightAmount}
            onChange={(v) => setFieldValue('bodyWeightAmount', v)}
            onBlur={scheduleOutputFeedback}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={WEIGHT_UNITS}
            value={bodyWeightUnit}
            onChange={(v) => setFieldValue('bodyWeightUnit', v ?? 'kg')}
            onBlur={scheduleOutputFeedback}
            w={100}
          />
        </Group>
      )}

      {dosageType === 'by-volume-concentration' && (
        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Volume"
            placeholder="e.g. 200"
            min={0}
            decimalScale={6}
            w={120}
            value={doseVolume}
            onChange={(v) => setFieldValue('doseVolume', v)}
            onBlur={scheduleOutputFeedback}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={VOLUME_UNITS}
            value={doseVolumeUnit}
            onChange={(v) => setFieldValue('doseVolumeUnit', v ?? 'ul')}
            onBlur={scheduleOutputFeedback}
            w={100}
          />
          <Text pb="sm" size="sm">
            of a
          </Text>
          <NumberInput
            label="Concentration"
            placeholder="e.g. 1"
            min={0}
            decimalScale={6}
            w={120}
            value={doseConcentrationValue}
            onChange={(v) => setFieldValue('doseConcentrationValue', v)}
            onBlur={scheduleOutputFeedback}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={concentrationUnits}
            value={doseConcentrationMassUnit}
            onChange={(v) => setFieldValue('doseConcentrationMassUnit', v ?? 'mg')}
            onBlur={scheduleOutputFeedback}
            w={100}
          />
          {/* A molarity already says "per litre", so it takes no volume unit. */}
          {!concentrationIsMolar && (
            <>
              <Text pb="sm" size="sm">
                per
              </Text>
              <LabSelect
                label="Unit"
                data={VOLUME_UNITS}
                value={doseConcentrationVolumeUnit}
                onChange={(v) => setFieldValue('doseConcentrationVolumeUnit', v ?? 'ml')}
                onBlur={scheduleOutputFeedback}
                w={100}
              />
            </>
          )}
          <Text pb="sm" size="sm">
            solution
          </Text>
        </Group>
      )}
    </>
  );
}
