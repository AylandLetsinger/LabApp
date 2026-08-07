import { Group, NumberInput, Paper, Slider, Stack, Text } from '@mantine/core';
import { MOUSE_WEIGHT_HINT, WEIGHT_UNITS } from '../../constants/doseUnits';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import { inputFieldColor, navActiveColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

const CAPACITY_MARKS = [
  { value: 50, label: '50' },
  { value: 125, label: '125 (small)' },
  { value: 250, label: '250 (large)' },
  { value: 350, label: '350' },
];

/**
 * Mealworm loading parameters — the physical constraints of the session,
 * independent of whether the drug starts as powder, stock, or a finished
 * solution.
 */
export default function MealwormParametersSection({
  wormCapacityUl,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalDoses,
  wasteBufferPct,
  pipetteMinUl,
  syringeMinUl,
  setFieldValue,
  scheduleOutputFeedback,
  issues,
}) {
  // What the waste buffer actually buys, in the unit the user thinks in.
  // At zero it carries the recommendation instead — advice as light text beats
  // a warning about a field nobody has reached yet.
  const plannedDoses = Number(totalDoses);
  const wastePct = Number(wasteBufferPct);
  const bufferOff = !Number.isFinite(wastePct) || wastePct <= 0;
  const spareDoses =
    !bufferOff && Number.isFinite(plannedDoses) && plannedDoses > 0
      ? Math.floor(plannedDoses * (1 + wastePct / 100)) - plannedDoses
      : undefined;

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        Step 2 — Dosing Parameters
      </Text>
      <Stack gap="md">
        <div>
          <Group align="flex-end" wrap="wrap" gap="sm" mb={4}>
            <NumberInput
              label="Mealworm loading capacity"
              min={1}
              decimalScale={1}
              value={wormCapacityUl}
              onChange={(value) => setFieldValue('wormCapacityUl', value)}
              onBlur={scheduleOutputFeedback}
              w={200}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              µL
            </Text>
          </Group>
          {/* The slider is a quick way to reach the common sizes; the field
              above is there so an exact value can be typed and cannot be
              nudged by accident. Both edit the same number. */}
          <Slider
            min={25}
            max={400}
            step={25}
            value={Number(wormCapacityUl) || 0}
            onChange={(value) => setFieldValue('wormCapacityUl', value)}
            onChangeEnd={scheduleOutputFeedback}
            marks={CAPACITY_MARKS}
            color={navActiveColor}
            mb="xl"
            aria-label="Mealworm loading capacity in microlitres"
          />
          <Text size="xs" c="dimmed" className="no-print">
            * the most liquid a worm absorbs before it leaks
          </Text>
        </div>

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Syringe minimum (loading the worm)"
              placeholder="e.g. 25"
              min={0}
              decimalScale={3}
              value={syringeMinUl}
              onChange={(value) => setFieldValue('syringeMinUl', value)}
              onBlur={scheduleOutputFeedback}
              w={240}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              µL
            </Text>
            <NumberInput
              label="Pipette minimum (mixing the vehicle)"
              placeholder="e.g. 2"
              min={0}
              decimalScale={3}
              value={pipetteMinUl}
              onChange={(value) => setFieldValue('pipetteMinUl', value)}
              onBlur={scheduleOutputFeedback}
              w={240}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              µL
            </Text>
          </Group>
        </div>

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Average body weight per subject"
              placeholder="e.g. 25"
              min={0}
              decimalScale={6}
              value={avgBodyWeight}
              onChange={(value) => setFieldValue('avgBodyWeight', value)}
              onBlur={scheduleOutputFeedback}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={WEIGHT_UNITS}
              value={avgBodyWeightUnit}
              onChange={(value) => setFieldValue('avgBodyWeightUnit', value ?? 'g')}
              onBlur={scheduleOutputFeedback}
              w={100}
            />
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            {MOUSE_WEIGHT_HINT}
          </Text>
        </div>

        <NumberInput
          label="Total number of dosages to prepare"
          placeholder="count"
          min={0}
          allowDecimal={false}
          value={totalDoses}
          onChange={(value) => setFieldValue('totalDoses', value)}
          onBlur={scheduleOutputFeedback}
          w={260}
          {...inputBlue}
        />

        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Waste buffer"
            placeholder="e.g. 10"
            min={0}
            max={100}
            decimalScale={2}
            value={wasteBufferPct}
            onChange={(value) => setFieldValue('wasteBufferPct', value)}
            onBlur={scheduleOutputFeedback}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            %
          </Text>
          {bufferOff ? (
            <Text pb="sm" size="sm" c="dimmed">
              &rarr; 10% is recommended
            </Text>
          ) : (
            spareDoses !== undefined && (
              <Text pb="sm" size="sm" c="dimmed">
                &rarr; enough for <strong>{plannedDoses + spareDoses}</strong> dosages,{' '}
                {spareDoses} spare
              </Text>
            )
          )}
        </Group>

      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
