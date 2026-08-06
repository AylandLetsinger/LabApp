import { Group, Loader, NumberInput, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import DosageOutputRow from './DosageOutputRow';
import IssueList from './IssueList';
import LabSelect from '../LabSelect';
import { DOSE_UNITS, VOLUME_UNITS } from '../../constants/doseUnits';
import { mgToMassUnit, volumeToMl } from '../../dosage/unitConversions';
import { roundTo } from '../../dosage/numberUtils';

const outputGray = {
  variant: 'filled',
  color: 'gray',
  readOnly: true,
  styles: { input: { cursor: 'default' } },
};

function OutputCheck({ outputFeedback }) {
  if (outputFeedback !== 'ok') return null;
  return (
    <ThemeIcon color="green" variant="light" size="lg" radius="xl" aria-hidden>
      <IconCheck size={18} stroke={2.5} />
    </ThemeIcon>
  );
}

export default function Step4Outputs({
  outputFeedback,
  dosePerAvgSubjectMg,
  soluteRequiredMg,
  volumePerAvgSubjectMl,
  totalVolumeMl,
  concentrationMgPerMl,
  units,
  setUnit,
  issues,
}) {
  // Concentration is stored as mg per mL. Rendering it in another unit pair
  // scales the mass and then scales by how many mL the chosen volume unit is.
  const concentrationDisplay =
    concentrationMgPerMl === undefined
      ? ''
      : roundTo(
          mgToMassUnit(concentrationMgPerMl, units.concentrationMass) *
            volumeToMl(1, units.concentrationVolume),
          6,
        );

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="sm">
        <Text fw={600}>Step 4 — Output</Text>
        {outputFeedback === 'loading' && (
          <Group gap={8} wrap="nowrap" align="center" role="status" aria-live="polite">
            <Loader type="oval" size="sm" color="yellow" />
            <Text size="xs" c="dimmed">
              Updating…
            </Text>
          </Group>
        )}
        {outputFeedback === 'ok' && (
          <Group gap={8} wrap="nowrap" align="center" role="status" aria-live="polite">
            <ThemeIcon color="green" variant="light" size="md" radius="xl" aria-hidden>
              <IconCheck size={18} stroke={2.5} />
            </ThemeIcon>
            <Text size="xs" c="green" fw={600}>
              Outputs updated
            </Text>
          </Group>
        )}
      </Group>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Calculated results (grey fields). Change any unit to suit your balance or pipette — the
        underlying calculation is unaffected.
      </Text>

      <Stack gap="md">
        <DosageOutputRow
          label="Dose per Avg Subject"
          canonicalValue={dosePerAvgSubjectMg}
          kind="mass"
          unit={units.dosePerSubject}
          onUnitChange={(u) => setUnit('dosePerSubject', u)}
          rightSection={<OutputCheck outputFeedback={outputFeedback} />}
        />

        <DosageOutputRow
          label="Solute Required"
          canonicalValue={soluteRequiredMg}
          kind="mass"
          unit={units.solute}
          onUnitChange={(u) => setUnit('solute', u)}
          rightSection={<OutputCheck outputFeedback={outputFeedback} />}
        />

        <DosageOutputRow
          label="Volume per Avg Subject"
          canonicalValue={volumePerAvgSubjectMl}
          kind="volume"
          unit={units.volumePerSubject}
          onUnitChange={(u) => setUnit('volumePerSubject', u)}
          rightSection={<OutputCheck outputFeedback={outputFeedback} />}
        />

        <DosageOutputRow
          label="Total Volume"
          canonicalValue={totalVolumeMl}
          kind="volume"
          unit={units.totalVolume}
          onUnitChange={(u) => setUnit('totalVolume', u)}
          rightSection={<OutputCheck outputFeedback={outputFeedback} />}
        />

        <div>
          <Text size="sm" fw={500} mb={6}>
            Concentration
          </Text>
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Mass"
                placeholder="—"
                aria-label="Concentration: mass amount"
                value={concentrationDisplay}
                decimalScale={6}
                hideControls
                {...outputGray}
              />
              <LabSelect
                label="Unit"
                data={DOSE_UNITS}
                value={units.concentrationMass}
                onChange={(v) => setUnit('concentrationMass', v ?? 'mg')}
                w={96}
                aria-label="Concentration: mass unit"
              />
              <Text pb="sm" size="sm">
                per
              </Text>
              <NumberInput
                label="Volume"
                placeholder="—"
                aria-label="Concentration: volume amount"
                value={concentrationMgPerMl !== undefined ? 1 : ''}
                hideControls
                {...outputGray}
              />
              <LabSelect
                label="Unit"
                data={VOLUME_UNITS}
                value={units.concentrationVolume}
                onChange={(v) => setUnit('concentrationVolume', v ?? 'ml')}
                w={96}
                aria-label="Concentration: volume unit"
              />
            </Group>
            <OutputCheck outputFeedback={outputFeedback} />
          </Group>
        </div>
      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
