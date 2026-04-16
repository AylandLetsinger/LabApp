import { Group, Loader, Paper, Table, Text, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

const cellValueBg = { backgroundColor: 'var(--mantine-color-yellow-1)' };
const cellUnitBg = { backgroundColor: 'var(--mantine-color-gray-2)' };

const fallbackSteps = [
  { lead: 'Dissolve', value: '—', unit: 'mg', tail: 'of your solute' },
  { lead: 'in', value: '—', unit: 'µL', tail: 'in DMSO' },
  { lead: 'in', value: '—', unit: 'µL', tail: 'in Ethanol' },
  { lead: 'in', value: '—', unit: 'µL', tail: 'in Emulphor' },
  { lead: 'in', value: '—', unit: 'mL', tail: 'in Saline' },
];

export default function Step6DissolutionTable({ outputFeedback, dissolutionSteps }) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="sm">
        <Text fw={600}>Step 6 — Dissolution & vehicle volumes</Text>
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
              Volumes updated
            </Text>
          </Group>
        )}
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Uses <strong>Total volume</strong> from Step 4 and <strong>ratio parts</strong> from Step 5 to split
        the working solution across solvents (last row is the remainder in mL). Solute mass is
        <strong> Solute required</strong> from Step 4 (mg).
      </Text>

      <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder withColumnBorders>
        <Table.Tbody>
          {(dissolutionSteps ?? fallbackSteps).map((step, idx) => (
            <Table.Tr key={`${step.lead}-${step.tail}-${idx}`}>
              <Table.Td miw={90}>
                <Text size="sm" fw={500}>
                  {step.lead}
                </Text>
              </Table.Td>
              <Table.Td style={cellValueBg} ta="right" maw={160}>
                <Text size="sm" fw={500} ff="monospace">
                  {step.value}
                </Text>
              </Table.Td>
              <Table.Td style={cellUnitBg} miw={56}>
                <Text size="sm" fw={500}>
                  {step.unit}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {step.tail}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {!dissolutionSteps && (
        <Text size="xs" c="dimmed" mt="sm">
          Complete Step 4 outputs and fill all ratio parts in Step 5 to populate this table.
        </Text>
      )}
    </Paper>
  );
}
