import { Group, NumberInput, Paper, SegmentedControl, Slider, Stack, Text } from '@mantine/core';
import { MOUSE_WEIGHT_HINT, WEIGHT_UNITS } from '../../constants/doseUnits';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import { inputFieldColor, navActiveColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

const CAPACITY_MARKS = [
  { value: 25, label: '25' },
  { value: 50, label: '50 (small)' },
  { value: 100, label: '100 (large)' },
  { value: 150, label: '150' },
];

/**
 * Mealworm loading parameters.
 *
 * The mode toggle is the important control: it selects which quantity you
 * hold fixed and which one the calculator solves for. Those correspond to the
 * two ways a dosing session actually runs.
 */
export default function MealwormParametersSection({
  mode,
  wormCapacityUl,
  loadVolumeUl,
  stockConcentrationMgPerMl,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalDoses,
  wasteBufferPct,
  pipetteMinUl,
  setFieldValue,
  scheduleOutputFeedback,
  issues,
}) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        Step 3 — Mealworm loading
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        One loaded mealworm per mouse. Choose what you want to hold fixed; the calculator solves for
        the other.
      </Text>

      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} mb={6}>
            What should the calculator solve for?
          </Text>
          <SegmentedControl
            color={navActiveColor}
            value={mode}
            onChange={(value) => {
              setFieldValue('mode', value);
              scheduleOutputFeedback();
            }}
            data={[
              { value: 'concentration', label: 'Concentration to mix' },
              { value: 'volume', label: 'Volume to load' },
            ]}
          />
          <Text size="xs" c="dimmed" mt={6}>
            {mode === 'concentration'
              ? '* every mouse gets the same absolute dose, so every worm gets the same volume'
              : '* dose scales with body mass: mix one stock, vary the volume per worm'}
          </Text>
        </div>

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
            min={5}
            max={150}
            step={5}
            value={Number(wormCapacityUl) || 0}
            onChange={(value) => setFieldValue('wormCapacityUl', value)}
            onChangeEnd={scheduleOutputFeedback}
            marks={CAPACITY_MARKS}
            color={navActiveColor}
            mb="xl"
            aria-label="Mealworm loading capacity in microlitres"
          />
          <Text size="xs" c="dimmed">
            * the most liquid a worm absorbs before it leaks — depends on worm size
          </Text>
        </div>

        {mode === 'concentration' ? (
          <div>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Volume loaded per mealworm"
                placeholder="e.g. 50"
                min={0}
                decimalScale={3}
                value={loadVolumeUl}
                onChange={(value) => setFieldValue('loadVolumeUl', value)}
                onBlur={scheduleOutputFeedback}
                {...inputBlue}
              />
              <Text pb="sm" size="sm">
                µL
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={6}>
              * must not exceed the loading capacity above
            </Text>
          </div>
        ) : (
          <div>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Stock concentration you will make"
                placeholder="e.g. 10"
                min={0}
                decimalScale={6}
                value={stockConcentrationMgPerMl}
                onChange={(value) => setFieldValue('stockConcentrationMgPerMl', value)}
                onBlur={scheduleOutputFeedback}
                w={280}
                {...inputBlue}
              />
              <Text pb="sm" size="sm">
                mg per mL
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={6}>
              * see the workable range below before committing to a value
            </Text>
          </div>
        )}

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
          <Text size="xs" c="dimmed" mt={6}>
            {MOUSE_WEIGHT_HINT}
          </Text>
        </div>

        <NumberInput
          label="Total number of loaded worms to prepare"
          placeholder="count"
          min={0}
          allowDecimal={false}
          value={totalDoses}
          onChange={(value) => setFieldValue('totalDoses', value)}
          onBlur={scheduleOutputFeedback}
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
          <NumberInput
            label="Smallest volume your pipette can deliver"
            placeholder="e.g. 2"
            min={0}
            decimalScale={3}
            value={pipetteMinUl}
            onChange={(value) => setFieldValue('pipetteMinUl', value)}
            onBlur={scheduleOutputFeedback}
            w={280}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            µL
          </Text>
        </Group>
      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
