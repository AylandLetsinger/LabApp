import { Group, Loader, NumberInput, Paper, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

const outputGray = {
  variant: 'filled',
  color: 'gray',
  readOnly: true,
  styles: { input: { cursor: 'default' } },
};

const outputUnitGray = {
  ...outputGray,
  w: 96,
};

const outputUnitYellow = {
  variant: 'filled',
  color: 'yellow',
  readOnly: true,
  styles: { input: { cursor: 'default' } },
  w: 96,
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
  dosePerAvgDisplayValue,
  dosePerAvgDisplayUnit,
  soluteDisplayValue,
  volumePerAvgSubjectMl,
  totalVolumeMl,
  concentrationMgPerMl,
}) {
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
      <Text size="sm" c="dimmed" mb="md">
        Calculated results (grey fields). When you finish editing a Step 2 or Step 3 field (click or tab
        away), a short update state runs, then a green check shows that Step 4 reflects your latest
        inputs. Concentration uses yellow unit cells like the spreadsheet.
      </Text>

      <Stack gap="md">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Dose per Avg Subject"
              placeholder="—"
              value={dosePerAvgDisplayValue ?? ''}
              decimalScale={8}
              hideControls
              {...outputGray}
            />
            <TextInput
              label="Unit"
              placeholder="—"
              value={dosePerAvgDisplayValue !== undefined ? dosePerAvgDisplayUnit : ''}
              {...outputUnitGray}
            />
          </Group>
          <OutputCheck outputFeedback={outputFeedback} />
        </Group>

        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Solute Required"
              placeholder="—"
              value={soluteDisplayValue ?? ''}
              decimalScale={8}
              hideControls
              {...outputGray}
            />
            <TextInput
              label="Unit"
              placeholder="—"
              value={soluteDisplayValue !== undefined ? dosePerAvgDisplayUnit : ''}
              {...outputUnitGray}
            />
          </Group>
          <OutputCheck outputFeedback={outputFeedback} />
        </Group>

        <div>
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Volume per Avg Subject"
                placeholder="—"
                value={volumePerAvgSubjectMl ?? ''}
                decimalScale={8}
                hideControls
                {...outputGray}
              />
              <TextInput
                label="Unit"
                placeholder="—"
                value={volumePerAvgSubjectMl !== undefined ? 'mL' : ''}
                {...outputUnitGray}
              />
            </Group>
            <OutputCheck outputFeedback={outputFeedback} />
          </Group>
          <Text size="xs" c="dimmed" mt={6}>
            ! User warning if too high based on Injection Maxes table (to be implemented).
          </Text>
        </div>

        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Total Volume"
              placeholder="—"
              value={totalVolumeMl ?? ''}
              decimalScale={8}
              hideControls
              {...outputGray}
            />
            <TextInput
              label="Unit"
              placeholder="—"
              value={totalVolumeMl !== undefined ? 'mL' : ''}
              {...outputUnitGray}
            />
          </Group>
          <OutputCheck outputFeedback={outputFeedback} />
        </Group>

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
                value={concentrationMgPerMl ?? ''}
                decimalScale={8}
                hideControls
                {...outputGray}
              />
              <TextInput
                label="Unit"
                placeholder="—"
                value={concentrationMgPerMl !== undefined ? 'mg' : ''}
                aria-label="Concentration: mass unit"
                {...outputUnitYellow}
              />
              <Text pb="sm" size="sm">
                per
              </Text>
              <NumberInput
                label="Volume"
                placeholder="—"
                aria-label="Concentration: volume amount"
                value={concentrationMgPerMl !== undefined ? 1 : ''}
                decimalScale={8}
                hideControls
                {...outputGray}
              />
              <TextInput
                label="Unit"
                placeholder="—"
                value={concentrationMgPerMl !== undefined ? 'mL' : ''}
                aria-label="Concentration: volume unit"
                {...outputUnitYellow}
              />
            </Group>
            <OutputCheck outputFeedback={outputFeedback} />
          </Group>
        </div>
      </Stack>
    </Paper>
  );
}
