import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { MOUSE_WEIGHT_HINT, WEIGHT_UNITS } from '../../constants/doseUnits';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import { inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

export default function Step3StudyParametersSection({
  volPerInjMl,
  volPerInjWeight,
  volPerInjWeightUnit,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalInjections,
  wasteBufferPct,
  pipetteMinUl,
  maxVolumeRateMlPerG,
  setFieldValue,
  scheduleOutputFeedback,
  issues,
}) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        Step 3 — Study parameters
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Enter study parameters (all user inputs below).
      </Text>

      <Stack gap="md">
        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Volume per injection"
              placeholder="mL"
              min={0}
              decimalScale={6}
              value={volPerInjMl}
              onChange={(v) => setFieldValue('volPerInjMl', v)}
              onBlur={scheduleOutputFeedback}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              mL per
            </Text>
            <NumberInput
              label="Body weight"
              placeholder="e.g. 10"
              min={0}
              decimalScale={6}
              value={volPerInjWeight}
              onChange={(v) => setFieldValue('volPerInjWeight', v)}
              onBlur={scheduleOutputFeedback}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={WEIGHT_UNITS}
              value={volPerInjWeightUnit}
              onChange={(v) => setFieldValue('volPerInjWeightUnit', v ?? 'g')}
              onBlur={scheduleOutputFeedback}
              w={100}
            />
            <Text pb="sm" size="sm">
              body weight
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * mice tolerate about 0.1 mL per 10 g intraperitoneally
          </Text>
        </div>

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Average body weight per subject"
              placeholder="e.g. 25"
              min={0}
              decimalScale={6}
              value={avgBodyWeight}
              onChange={(v) => setFieldValue('avgBodyWeight', v)}
              onBlur={scheduleOutputFeedback}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={WEIGHT_UNITS}
              value={avgBodyWeightUnit}
              onChange={(v) => setFieldValue('avgBodyWeightUnit', v ?? 'g')}
              onBlur={scheduleOutputFeedback}
              w={100}
            />
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            {MOUSE_WEIGHT_HINT}
          </Text>
        </div>

        <NumberInput
          label="Total number of injections"
          placeholder="count"
          min={0}
          allowDecimal={false}
          value={totalInjections}
          onChange={(v) => setFieldValue('totalInjections', v)}
          onBlur={scheduleOutputFeedback}
          {...inputBlue}
        />

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Waste buffer"
              placeholder="e.g. 10"
              min={0}
              max={100}
              decimalScale={2}
              value={wasteBufferPct}
              onChange={(v) => setFieldValue('wasteBufferPct', v)}
              onBlur={scheduleOutputFeedback}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              %
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * how much extra do you want to make
          </Text>
        </div>

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Smallest volume your pipette can deliver"
              placeholder="e.g. 2"
              min={0}
              decimalScale={3}
              value={pipetteMinUl}
              onChange={(v) => setFieldValue('pipetteMinUl', v)}
              onBlur={scheduleOutputFeedback}
              w={280}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              µL
            </Text>
            <NumberInput
              label="Max injection volume"
              placeholder="0.01"
              min={0}
              decimalScale={5}
              value={maxVolumeRateMlPerG}
              onChange={(v) => setFieldValue('maxVolumeRateMlPerG', v)}
              onBlur={scheduleOutputFeedback}
              w={190}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              mL per g body weight
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * recipe volumes are rounded to your pipette; 0.01 mL/g is the usual mouse IP ceiling
          </Text>
        </div>
      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
