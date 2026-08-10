import { Group, NumberInput, Paper, Text } from '@mantine/core';
import { DOSE_UNITS, WEIGHT_UNITS } from '../../constants/doseUnits';
import { MOLAR_AMOUNT_UNITS } from '../../dosage/molarUnits';
import { toPositiveNumber } from '../../dosage/numberUtils';
import LabSelect from '../LabSelect';
import { inputFieldColor } from '../../theme';

const DOSAGE_TYPE_OPTIONS = [
  { value: 'per-subject', label: 'Dose per subject' },
  { value: 'by-body-weight', label: 'Dose by body weight' },
];

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

export default function Step2DosageTypeSection({
  stepLabel = 'Step 1 — Dosage type',
  dosageType,
  dosePerSubject,
  dosePerSubjectUnit,
  doseAmount,
  doseUnit,
  bodyWeightAmount,
  bodyWeightUnit,
  molecularWeight,
  setFieldValue,
  scheduleOutputFeedback,
  footer,
}) {
  // Molar units stay hidden until there is a molecular weight to convert with.
  // A molar figure interpreted with the wrong weight is wrong by an arbitrary
  // factor and looks entirely reasonable, so it is not offered as a default.
  const massUnits = toPositiveNumber(molecularWeight)
    ? [...DOSE_UNITS, ...MOLAR_AMOUNT_UNITS]
    : DOSE_UNITS;
  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Choose how dose is specified, then enter the values (highlighted fields).
      </Text>

      <LabSelect
        label="Dosage type"
        data={DOSAGE_TYPE_OPTIONS}
        value={dosageType}
        onChange={(v) => setFieldValue('dosageType', v ?? 'by-body-weight')}
        onBlur={scheduleOutputFeedback}
        mb="md"
      />

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

      <Group align="flex-end" wrap="wrap" gap="sm" mt="md">
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
        <Text pb="sm" size="sm" c="dimmed">
          {toPositiveNumber(molecularWeight)
            ? 'molar units available below'
            : '→ enter one to dose or mix in molar units'}
        </Text>
      </Group>

      {footer}
    </Paper>
  );
}
