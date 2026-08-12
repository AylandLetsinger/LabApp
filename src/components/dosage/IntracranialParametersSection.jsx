import { Group, NumberInput, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { VOLUME_UNITS } from '../../constants/doseUnits';
import { DURATION_UNITS } from '../../dosage/computeIntracranial';
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

/** Volume in whichever unit keeps it readable. */
function volumeText(ml) {
  if (ml === undefined) return '—';
  if (ml < 1) return `${roundTo(ml * 1000, 4)} µL`;
  return `${roundTo(ml, 4)} mL`;
}

/**
 * Where the dose goes, and over how long.
 *
 * The one thing this step does NOT ask is how much volume per kilogram. A
 * ventricle holds what it holds; the volume is a property of the target, not
 * of the animal, so scaling it by body mass would be wrong rather than merely
 * unnecessary. Body mass is still here because a dose may be written per
 * kilogram even when the volume is not.
 */
export default function IntracranialParametersSection({
  stepLabel = 'Step 2 — Delivery Parameters',
  deliveryMode,
  volumePerSite,
  volumePerSiteUnit,
  sitesPerSubject,
  bolusRate,
  bolusRateUnit,
  minutesPerSite,
  infusionRate,
  infusionRateUnit,
  durationValue,
  durationUnit,
  reservoirVolume,
  reservoirVolumeUnit,
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
              { value: 'bolus', label: 'Bolus injection' },
              { value: 'infusion', label: 'Infusion (pump)' },
            ]}
          />
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * a bolus places a fixed volume at a site; an infusion runs at a rate for a duration
          </Text>
        </div>

        {isBolus ? (
          <>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Volume per site"
                placeholder="e.g. 1"
                min={0}
                decimalScale={6}
                value={volumePerSite}
                onChange={(v) => setFieldValue('volumePerSite', v)}
                onBlur={scheduleOutputFeedback}
                w={160}
                {...inputBlue}
              />
              <LabSelect
                label="Unit"
                data={VOLUME_UNITS}
                value={volumePerSiteUnit}
                onChange={(v) => setFieldValue('volumePerSiteUnit', v ?? 'ul')}
                onBlur={scheduleOutputFeedback}
                w={100}
              />
              <Text pb="sm" size="sm">
                ×
              </Text>
              <NumberInput
                label="Sites per subject"
                placeholder="1 or 2"
                min={1}
                allowDecimal={false}
                value={sitesPerSubject}
                onChange={(v) => setFieldValue('sitesPerSubject', v)}
                onBlur={scheduleOutputFeedback}
                w={150}
                {...inputBlue}
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
                  label="Injection rate"
                  placeholder="optional, e.g. 0.2"
                  min={0}
                  decimalScale={6}
                  value={bolusRate}
                  onChange={(v) => setFieldValue('bolusRate', v)}
                  onBlur={scheduleOutputFeedback}
                  w={210}
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
                  per minute
                </Text>
                {minutesPerSite !== undefined && (
                  <Text pb="sm" size="sm" c="dimmed">
                    &rarr; <strong>{roundTo(minutesPerSite, 2)} min</strong> delivering, per site
                  </Text>
                )}
              </Group>
              <Text size="xs" c="dimmed" mt={6} className="no-print">
                * delivery time only. How long the needle then stays in before it moves is a
                protocol decision, not arithmetic.
              </Text>
            </div>
          </>
        ) : (
          <>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Flow rate"
                placeholder="e.g. 0.25"
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
                placeholder="e.g. 14"
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
                onChange={(v) => setFieldValue('durationUnit', v ?? 'day')}
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
                  label="Reservoir capacity"
                  placeholder="optional, e.g. 100"
                  min={0}
                  decimalScale={4}
                  value={reservoirVolume}
                  onChange={(v) => setFieldValue('reservoirVolume', v)}
                  onBlur={scheduleOutputFeedback}
                  w={220}
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
                * a pump that empties early stops dosing without showing it — the animal carries
                on looking dosed. Worth checking before implantation.
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
