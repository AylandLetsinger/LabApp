import { Group, NumberInput, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { roundTo } from '../../dosage/numberUtils';
import IssueList from './IssueList';
import BodyMassFields from './BodyMassFields';
import WasteBufferField from './WasteBufferField';
import { inputFieldColor, navActiveColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * What the animals drink, and how the bottles are run.
 *
 * The intake field is the single most consequential number on the page — every
 * dose figure is proportional to it — so it has no default and says why. An
 * assumed intake would produce a confident dose from a number nobody measured.
 */
export default function DrinkingParametersSection({
  stepLabel = 'Step 2 — Drinking Parameters',
  direction,
  intakeMlPerDay,
  animalsPerBottle,
  daysBetweenChanges,
  bottleCount,
  bottleVolumeMl,
  bodyMassMode,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalBodyMass,
  subjectCount,
  derivedAverage,
  wasteBufferPct,
  setFieldValue,
  scheduleOutputFeedback,
  issues,
}) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>

      <Stack gap="md">
        <div>
          <SegmentedControl
            size="xs"
            color={navActiveColor}
            value={direction}
            onChange={(value) => {
              setFieldValue('direction', value);
              scheduleOutputFeedback();
            }}
            data={[
              { value: 'target', label: 'I want a dose' },
              { value: 'concentration', label: 'I have a concentration' },
            ]}
          />
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * work forwards to the concentration to make, or backwards from a bottle already made up
          </Text>
        </div>

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Each subject drinks"
              placeholder="measure this"
              min={0}
              decimalScale={4}
              value={intakeMlPerDay}
              onChange={(v) => setFieldValue('intakeMlPerDay', v)}
              onBlur={scheduleOutputFeedback}
              w={200}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              mL per day
            </Text>
          </Group>
          {/*
            No default, and the reason matters. Every dose on this page is
            directly proportional to this number, so a plausible-looking
            default would manufacture a confident dose out of nothing.
          */}
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * no default on purpose — every dose below is proportional to this. Measure it on the
            fluid you are actually using: drugs change how much an animal drinks, and sipper tubes
            lose fluid to evaporation and spillage that reads as consumption.
          </Text>
        </div>

        <BodyMassFields
          bodyMassMode={bodyMassMode}
          avgBodyWeight={avgBodyWeight}
          avgBodyWeightUnit={avgBodyWeightUnit}
          totalBodyMass={totalBodyMass}
          subjectCount={subjectCount}
          derivedAverage={derivedAverage}
          setFieldValue={setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Subjects per bottle"
              placeholder="e.g. 1"
              min={1}
              allowDecimal={false}
              value={animalsPerBottle}
              onChange={(v) => setFieldValue('animalsPerBottle', v)}
              onBlur={scheduleOutputFeedback}
              w={170}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              ×
            </Text>
            <NumberInput
              label="Days between changes"
              placeholder="e.g. 3"
              min={0}
              decimalScale={2}
              value={daysBetweenChanges}
              onChange={(v) => setFieldValue('daysBetweenChanges', v)}
              onBlur={scheduleOutputFeedback}
              w={190}
              {...inputBlue}
            />
            {bottleVolumeMl !== undefined && (
              <Text pb="sm" size="sm" c="dimmed">
                &rarr; <strong>{roundTo(bottleVolumeMl, 3)} mL</strong> per bottle
              </Text>
            )}
          </Group>
          {/*
            Next to the control that causes it, not in the issue list — that
            panel collapses when it holds only warnings, and this one
            invalidates every per-subject figure on the page.
          */}
          {Number(animalsPerBottle) > 1 && (
            <Text size="sm" c="orange.7" mt={6}>
              <strong>Sharing a bottle makes individual intake unmeasurable.</strong> The figure
              above becomes a cage average, and every per-subject dose below inherits that. Single
              housing, or a lickometer, is the only way to do better.
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * how long the fluid stays on the cage, not how long the study runs. Compounds degrade
            in water and in light.
          </Text>
        </div>

        <NumberInput
          label="Number of bottles to prepare"
          placeholder="count"
          min={0}
          allowDecimal={false}
          value={bottleCount}
          onChange={(v) => setFieldValue('bottleCount', v)}
          onBlur={scheduleOutputFeedback}
          w={260}
          {...inputBlue}
        />

        <WasteBufferField
          wasteBufferPct={wasteBufferPct}
          plannedCount={bottleCount}
          countNoun="bottles"
          setFieldValue={setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />
      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
