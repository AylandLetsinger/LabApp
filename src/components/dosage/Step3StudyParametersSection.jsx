import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { WEIGHT_UNITS } from '../../constants/doseUnits';
import LabSelect from '../LabSelect';
import { inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

export default function Step3StudyParametersSection({
  volPerInjMl,
  volPerInjG,
  avgBodyWeightG,
  avgBodyWeightUnit,
  totalInjections,
  wasteBufferPct,
  setFieldValue,
  scheduleOutputFeedback,
}) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        Step 3 — Study parameters
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Enter study parameters (all user inputs below).
      </Text>

      <Stack gap="md">
        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Volume per injection (mL)"
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
              label="Body weight (g)"
              placeholder="g"
              min={0}
              decimalScale={6}
              value={volPerInjG}
              onChange={(v) => setFieldValue('volPerInjG', v)}
              onBlur={scheduleOutputFeedback}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              g body weight
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={6}>
            * recommended for mice
          </Text>
        </div>

        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Average body weight per subject"
            placeholder="g"
            min={0}
            decimalScale={6}
            value={avgBodyWeightG}
            onChange={(v) => setFieldValue('avgBodyWeightG', v)}
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
          <Text size="xs" c="dimmed" mt={6}>
            * how much extra do you want to make
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}
