import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { VOLUME_UNITS } from '../../constants/doseUnits';
import { VESSEL_OPTIONS } from '../../dosage/vessels';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import WasteBufferField from './WasteBufferField';
import { inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * The vessel, and how many of them.
 *
 * The counterpart of the parameters step in the animal calculators. There is no
 * body mass here, so what takes its place is the volume being dosed and the
 * number of times it is repeated.
 */
export default function VesselParametersSection({
  stepLabel = 'Step 2 — Vessel Parameters',
  vesselId,
  vessel,
  finalVolume,
  finalVolumeUnit,
  conditionCount,
  replicateCount,
  totalVessels,
  wasteBufferPct,
  pipetteMinUl,
  maxSolventPct,
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
        <LabSelect
          label="What are you dosing into?"
          data={VESSEL_OPTIONS}
          value={vesselId}
          onChange={(value) => setFieldValue('vesselId', value ?? 'well-plate')}
          onBlur={scheduleOutputFeedback}
          w={280}
        />

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label={vessel.volumeLabel}
              placeholder={String(vessel.defaultVolume)}
              min={0}
              decimalScale={6}
              value={finalVolume}
              onChange={(value) => setFieldValue('finalVolume', value)}
              onBlur={scheduleOutputFeedback}
              w={200}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={VOLUME_UNITS}
              value={finalVolumeUnit}
              onChange={(value) => setFieldValue('finalVolumeUnit', value ?? 'ul')}
              onBlur={scheduleOutputFeedback}
              w={100}
            />
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            {vessel.volumeHint}
          </Text>
        </div>

        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label={vessel.countLabel}
            placeholder="count"
            min={0}
            allowDecimal={false}
            value={conditionCount}
            onChange={(value) => setFieldValue('conditionCount', value)}
            onBlur={scheduleOutputFeedback}
            w={190}
            {...inputBlue}
          />
          {vessel.hasReplicates && (
            <>
              <Text pb="sm" size="sm">
                ×
              </Text>
              <NumberInput
                label="Replicates each"
                placeholder="e.g. 3"
                min={0}
                allowDecimal={false}
                value={replicateCount}
                onChange={(value) => setFieldValue('replicateCount', value)}
                onBlur={scheduleOutputFeedback}
                w={150}
                {...inputBlue}
              />
            </>
          )}
          {totalVessels !== undefined && (
            <Text pb="sm" size="sm" c="dimmed">
              &rarr; <strong>{totalVessels}</strong> {vessel.pluralNoun}
            </Text>
          )}
        </Group>

        <WasteBufferField
          wasteBufferPct={wasteBufferPct}
          plannedCount={totalVessels}
          countNoun={vessel.pluralNoun}
          setFieldValue={setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Pipette minimum"
              placeholder="e.g. 0.5"
              min={0}
              decimalScale={3}
              value={pipetteMinUl}
              onChange={(value) => setFieldValue('pipetteMinUl', value)}
              onBlur={scheduleOutputFeedback}
              w={180}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              µL
            </Text>
            <NumberInput
              label="Most solvent the preparation tolerates"
              placeholder="e.g. 0.1"
              min={0}
              max={100}
              decimalScale={4}
              value={maxSolventPct}
              onChange={(value) => setFieldValue('maxSolventPct', value)}
              onBlur={scheduleOutputFeedback}
              w={280}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              % v/v
            </Text>
          </Group>
          {/*
            Deliberately blank by default. Every tolerability figure this app
            holds is a mouse or a rat given an injection, and none of them says
            anything about cells. What a preparation tolerates depends on the
            line, the assay and the exposure, so the number is the user's.
          */}
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * no default — this depends on your cells, your assay and how long they are exposed.
            Leave it blank and nothing is checked.
          </Text>
        </div>
      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
