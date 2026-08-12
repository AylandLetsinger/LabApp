import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { WEIGHT_UNITS } from '../../constants/doseUnits';
import { roundTo } from '../../dosage/numberUtils';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import BodyMassFields from './BodyMassFields';
import WasteBufferField from './WasteBufferField';
import { inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * Parameters for a liquid dose given by volume per unit of body mass.
 *
 * The counterpart of CarrierParametersSection. Where a carrier has a capacity
 * and a loading instrument, a measured liquid dose has a volume rate written
 * per unit of body mass, so it scales with the animal rather than being fixed.
 * How much volume is reasonable depends on the route, which is why the label
 * and the guidance under it come from the route rather than being written in.
 *
 * Body mass and the waste buffer are the same controls the carrier methods use,
 * because they are the same questions.
 */
export default function LiquidDoseParametersSection({
  route,
  stepLabel = 'Step 2 — Dosing Parameters',
  volPerInjMl,
  volPerInjWeight,
  volPerInjWeightUnit,
  bodyMassMode,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalBodyMass,
  subjectCount,
  derivedAverage,
  totalInjections,
  wasteBufferPct,
  pipetteMinUl,
  showInjectionVolume = true,
  sitesPerSubject,
  volumePerSiteUl,
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
        {/*
          In working mode the concentration is fixed, so dose and concentration
          decide the volume between them and a rate typed here would be quietly
          ignored. It is hidden rather than left to contradict the output.
        */}
        {showInjectionVolume && (
          <div>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label={route.volumeLabel}
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
            {route.hasSites && (
              <Group align="flex-end" wrap="wrap" gap="sm" mt="sm">
                <NumberInput
                  label="Split across how many sites?"
                  placeholder="e.g. 1"
                  min={1}
                  allowDecimal={false}
                  value={sitesPerSubject}
                  onChange={(v) => setFieldValue('sitesPerSubject', v)}
                  onBlur={scheduleOutputFeedback}
                  w={220}
                  {...inputBlue}
                />
                {volumePerSiteUl !== undefined && (
                  <Text pb="sm" size="sm" c="dimmed">
                    &rarr; <strong>{roundTo(volumePerSiteUl, 2)} µL</strong> per site
                  </Text>
                )}
              </Group>
            )}
            <Text size="xs" c="dimmed" mt={6} className="no-print">
              {route.volumeHint}
            </Text>
          </div>
        )}

        {/*
          Directly under the volume it constrains. The pipette makes up the
          vehicle; nothing else in this step is about an instrument, so it has
          no business sitting at the bottom next to the body weights.
        */}
        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Pipette minimum (mixing)"
            placeholder="e.g. 2"
            min={0}
            decimalScale={3}
            value={pipetteMinUl}
            onChange={(v) => setFieldValue('pipetteMinUl', v)}
            onBlur={scheduleOutputFeedback}
            w={220}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            µL
          </Text>
        </Group>

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

        <NumberInput
          label={route.countLabel}
          placeholder="count"
          min={0}
          allowDecimal={false}
          value={totalInjections}
          onChange={(v) => setFieldValue('totalInjections', v)}
          onBlur={scheduleOutputFeedback}
          w={260}
          {...inputBlue}
        />

        <WasteBufferField
          wasteBufferPct={wasteBufferPct}
          plannedCount={totalInjections}
          countNoun={route.pluralNoun}
          setFieldValue={setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />

      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
