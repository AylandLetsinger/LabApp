import { Group, NumberInput, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { VOLUME_UNITS, WEIGHT_UNITS } from '../../constants/doseUnits';
import { DURATION_UNITS } from '../../dosage/computeInfusion';
import { roundTo } from '../../dosage/numberUtils';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import BodyMassFields from './BodyMassFields';
import WasteBufferField from './WasteBufferField';
import { inputFieldColor, navActiveColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

function volumeText(ml) {
  if (ml === undefined) return '—';
  if (ml < 1) return `${roundTo(ml * 1000, 4)} µL`;
  return `${roundTo(ml, 4)} mL`;
}

/**
 * How the line is used: a bolus scaled to the animal, or a rate over time.
 *
 * The bolus half is deliberately the same shape as the intraperitoneal page —
 * a volume per unit of body mass — because that is what an intravenous bolus
 * is. What it adds is a repeat count, since the same catheter is often used
 * many times in a session.
 */
export default function IvParametersSection({
  stepLabel = 'Step 2 — Delivery Parameters',
  deliveryMode,
  volPerInjMl,
  volPerInjWeight,
  volPerInjWeightUnit,
  infusionsPerSubject,
  bolusRate,
  bolusRateUnit,
  bolusSecondsValue,
  infusionRate,
  infusionRateUnit,
  durationValue,
  durationUnit,
  reservoirVolume,
  reservoirVolumeUnit,
  volumePerInfusionMl,
  totalVolumePerSubjectMl,
  bodyMassMode,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalBodyMass,
  subjectCount,
  derivedAverage,
  totalSubjects,
  wasteBufferPct,
  pipetteMinUl,
  setFieldValue,
  scheduleOutputFeedback,
  issues,
}) {
  const isBolus = deliveryMode === 'bolus';
  const repeated = Number(infusionsPerSubject) > 1;

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
            value={deliveryMode}
            onChange={(value) => {
              setFieldValue('deliveryMode', value);
              scheduleOutputFeedback();
            }}
            data={[
              { value: 'bolus', label: 'Bolus / repeated infusions' },
              { value: 'continuous', label: 'Continuous infusion' },
            ]}
          />
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * a bolus is a measured volume pushed through the line; set the count above one for a
            self-administration session
          </Text>
        </div>

        {isBolus ? (
          <>
            <div>
              <Group align="flex-end" wrap="wrap" gap="sm">
                <NumberInput
                  label="Volume per infusion"
                  placeholder="mL"
                  min={0}
                  decimalScale={6}
                  value={volPerInjMl}
                  onChange={(v) => setFieldValue('volPerInjMl', v)}
                  onBlur={scheduleOutputFeedback}
                  w={170}
                  {...inputBlue}
                />
                <Text pb="sm" size="sm">
                  mL per
                </Text>
                <NumberInput
                  label="Body weight"
                  placeholder="e.g. 1"
                  min={0}
                  decimalScale={6}
                  value={volPerInjWeight}
                  onChange={(v) => setFieldValue('volPerInjWeight', v)}
                  onBlur={scheduleOutputFeedback}
                  w={130}
                  {...inputBlue}
                />
                <LabSelect
                  label="Unit"
                  data={WEIGHT_UNITS}
                  value={volPerInjWeightUnit}
                  onChange={(v) => setFieldValue('volPerInjWeightUnit', v ?? 'kg')}
                  onBlur={scheduleOutputFeedback}
                  w={100}
                />
                {volumePerInfusionMl !== undefined && (
                  <Text pb="sm" size="sm" c="dimmed">
                    &rarr; <strong>{volumeText(volumePerInfusionMl)}</strong> each
                  </Text>
                )}
              </Group>
              <Text size="xs" c="dimmed" mt={6} className="no-print">
                * mice are commonly given up to about 5 mL/kg as a slow intravenous bolus. Your
                IACUC protocol governs.
              </Text>
            </div>

            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Infusions per subject"
                placeholder="1, or a session count"
                min={1}
                allowDecimal={false}
                value={infusionsPerSubject}
                onChange={(v) => setFieldValue('infusionsPerSubject', v)}
                onBlur={scheduleOutputFeedback}
                w={230}
                {...inputBlue}
              />
              {repeated && totalVolumePerSubjectMl !== undefined && (
                <Text pb="sm" size="sm" c="dimmed">
                  &rarr; <strong>{volumeText(totalVolumePerSubjectMl)}</strong> over the session
                </Text>
              )}
            </Group>

            <div>
              <Group align="flex-end" wrap="wrap" gap="sm">
                <NumberInput
                  label="Push rate"
                  placeholder="optional, e.g. 25"
                  min={0}
                  decimalScale={6}
                  value={bolusRate}
                  onChange={(v) => setFieldValue('bolusRate', v)}
                  onBlur={scheduleOutputFeedback}
                  w={200}
                  {...inputBlue}
                />
                <LabSelect
                  label="Unit"
                  data={VOLUME_UNITS}
                  value={bolusRateUnit}
                  onChange={(v) => setFieldValue('bolusRateUnit', v ?? 'ul')}
                  onBlur={scheduleOutputFeedback}
                  w={100}
                />
                <Text pb="sm" size="sm">
                  per second
                </Text>
                {bolusSecondsValue !== undefined && (
                  <Text pb="sm" size="sm" c="dimmed">
                    &rarr; <strong>{roundTo(bolusSecondsValue, 2)} s</strong> per infusion
                  </Text>
                )}
              </Group>
              <Text size="xs" c="dimmed" mt={6} className="no-print">
                * an intravenous bolus given too fast is a hazard in its own right, whatever is in
                it
              </Text>
            </div>
          </>
        ) : (
          <>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Flow rate"
                placeholder="e.g. 10"
                min={0}
                decimalScale={6}
                value={infusionRate}
                onChange={(v) => setFieldValue('infusionRate', v)}
                onBlur={scheduleOutputFeedback}
                w={160}
                {...inputBlue}
              />
              <LabSelect
                label="Unit"
                data={VOLUME_UNITS}
                value={infusionRateUnit}
                onChange={(v) => setFieldValue('infusionRateUnit', v ?? 'ul')}
                onBlur={scheduleOutputFeedback}
                w={100}
              />
              <Text pb="sm" size="sm">
                per hour, for
              </Text>
              <NumberInput
                label="Duration"
                placeholder="e.g. 6"
                min={0}
                decimalScale={4}
                value={durationValue}
                onChange={(v) => setFieldValue('durationValue', v)}
                onBlur={scheduleOutputFeedback}
                w={130}
                {...inputBlue}
              />
              <LabSelect
                label="Unit"
                data={DURATION_UNITS}
                value={durationUnit}
                onChange={(v) => setFieldValue('durationUnit', v ?? 'hour')}
                onBlur={scheduleOutputFeedback}
                w={120}
              />
              {totalVolumePerSubjectMl !== undefined && (
                <Text pb="sm" size="sm" c="dimmed">
                  &rarr; <strong>{volumeText(totalVolumePerSubjectMl)}</strong> per subject
                </Text>
              )}
            </Group>

            <div>
              <Group align="flex-end" wrap="wrap" gap="sm">
                <NumberInput
                  label="Syringe or reservoir capacity"
                  placeholder="optional, e.g. 500"
                  min={0}
                  decimalScale={4}
                  value={reservoirVolume}
                  onChange={(v) => setFieldValue('reservoirVolume', v)}
                  onBlur={scheduleOutputFeedback}
                  w={260}
                  {...inputBlue}
                />
                <LabSelect
                  label="Unit"
                  data={VOLUME_UNITS}
                  value={reservoirVolumeUnit}
                  onChange={(v) => setFieldValue('reservoirVolumeUnit', v ?? 'ul')}
                  onBlur={scheduleOutputFeedback}
                  w={100}
                />
              </Group>
              <Text size="xs" c="dimmed" mt={6} className="no-print">
                * a line that empties early stops dosing without showing it — the animal carries on
                looking dosed
              </Text>
            </div>
          </>
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
          label="Total number of subjects to prepare for"
          placeholder="count"
          min={0}
          allowDecimal={false}
          value={totalSubjects}
          onChange={(v) => setFieldValue('totalSubjects', v)}
          onBlur={scheduleOutputFeedback}
          w={300}
          {...inputBlue}
        />

        <WasteBufferField
          wasteBufferPct={wasteBufferPct}
          plannedCount={totalSubjects}
          countNoun="subjects"
          setFieldValue={setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />

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
      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
