import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { WEIGHT_UNITS } from '../../constants/doseUnits';
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
 * Injection parameters — the physical constraints of the session.
 *
 * The counterpart of CarrierParametersSection. Where a carrier has a capacity
 * and a loading instrument, an injection has a volume rate and a tolerated
 * ceiling, both written per unit of body mass: mice take about 0.1 mL per 10 g
 * intraperitoneally, so both scale with the animal rather than being fixed.
 *
 * Body mass and the waste buffer are the same controls the carrier methods use,
 * because they are the same questions.
 */
export default function InjectionParametersSection({
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
  maxVolumeRateMlPerG,
  showInjectionVolume = true,
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
        )}

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
          label="Total number of injections to prepare"
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
          countNoun="injections"
          setFieldValue={setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Pipette minimum (mixing the vehicle)"
              placeholder="e.g. 2"
              min={0}
              decimalScale={3}
              value={pipetteMinUl}
              onChange={(v) => setFieldValue('pipetteMinUl', v)}
              onBlur={scheduleOutputFeedback}
              w={260}
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
            * 0.01 mL/g is the usual mouse intraperitoneal ceiling
          </Text>
        </div>
      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
