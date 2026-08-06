import { ActionIcon, Button, Group, NumberInput, Paper, Table, Text, Tooltip } from '@mantine/core';
import { IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import { VEHICLE_OPTIONS, getVehicle, getVehicleLimit } from '../../dosage/vehicles';
import { computeVehiclePercents } from '../../dosage/computeVehicleVolumes';
import { roundTo } from '../../dosage/numberUtils';
import { errorColor } from '../../theme';

/**
 * Vehicle composition: pick solvents, set ratio parts, see %(v/v) against
 * published limits.
 *
 * The limits shown are guidelines with wildly varying provenance, so each one
 * carries its source and what was actually measured. Hover the limit to see
 * both. The governing authority is the user's IACUC protocol, and the table
 * says so.
 *
 * @param {object} props
 * @param {Array<{vehicleId: string, parts: string}>} props.rows
 * @param {(rows: Array<{vehicleId: string, parts: string}>) => void} props.onRowsChange
 * @param {'ip' | 'oral'} props.route
 * @param {string} props.stepLabel
 */
export default function VehicleRatioTable({ rows, onRowsChange, route, stepLabel, onBlur }) {
  const percents = computeVehiclePercents(rows.map((r) => r.parts));

  const setRow = (index, patch) => {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const used = new Set(rows.map((r) => r.vehicleId));
    const next = VEHICLE_OPTIONS.find((o) => !used.has(o.value));
    onRowsChange([...rows, { vehicleId: next ? next.value : VEHICLE_OPTIONS[0].value, parts: '' }]);
  };

  const removeRow = (index) => {
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  // Anything above a published ceiling is an error, not a nudge.
  const issues = [];
  if (percents) {
    rows.forEach((row, i) => {
      const limit = getVehicleLimit(row.vehicleId, route);
      const vehicle = getVehicle(row.vehicleId);
      if (limit?.maxPercent != null && percents[i] > limit.maxPercent) {
        issues.push({
          level: 'error',
          message:
            `${vehicle.label} is at ${roundTo(percents[i], 2)}% but the published guideline is ` +
            `${limit.maxPercent}% (${limit.endpoint}). Reduce it or justify it in your protocol.`,
        });
      }
    });
  }
  const duplicates = rows.length - new Set(rows.map((r) => r.vehicleId)).size;
  if (duplicates > 0) {
    issues.push({ level: 'error', message: 'The same solvent is listed more than once.' });
  }

  const notes = rows
    .map((r) => getVehicle(r.vehicleId))
    .filter((v) => v?.note)
    .map((v) => ({ label: v.label, note: v.note }));

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Enter ratio parts per solvent — 1 : 1 : 18 gives 5% / 5% / 90%. %(v/v) is each part divided
        by the sum of parts. Limits are published guidelines for the{' '}
        <strong>{route === 'ip' ? 'intraperitoneal' : 'oral'}</strong> route; hover one to see its
        source. <strong>Your IACUC protocol governs, not this table.</strong>
      </Text>

      <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th ta="left">SOLVENT</Table.Th>
            <Table.Th ta="left" w={120}>
              ratio
            </Table.Th>
            <Table.Th ta="left" w={110}>
              %(v/v)
            </Table.Th>
            <Table.Th ta="left" w={130}>
              guideline max
            </Table.Th>
            <Table.Th w={50} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, index) => {
            const limit = getVehicleLimit(row.vehicleId, route);
            const percent = percents ? percents[index] : undefined;
            const overLimit =
              limit?.maxPercent != null && percent !== undefined && percent > limit.maxPercent;

            return (
              <Table.Tr key={`${row.vehicleId}-${index}`}>
                <Table.Td>
                  <LabSelect
                    data={VEHICLE_OPTIONS}
                    value={row.vehicleId}
                    onChange={(v) => setRow(index, { vehicleId: v ?? row.vehicleId })}
                    onBlur={onBlur}
                    aria-label={`Solvent ${index + 1}`}
                    searchable
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    placeholder="-"
                    min={0}
                    decimalScale={4}
                    value={row.parts}
                    onChange={(v) => setRow(index, { parts: v })}
                    onBlur={onBlur}
                    aria-label={`Ratio parts for solvent ${index + 1}`}
                    hideControls
                  />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} c={overLimit ? errorColor : undefined}>
                    {percent === undefined ? '—' : `${roundTo(percent, 2)}%`}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {limit?.maxPercent == null ? (
                    <Tooltip label={limit?.endpoint ?? 'No data'} multiline w={280} withArrow>
                      <Text size="sm" c="dimmed" style={{ cursor: 'help' }}>
                        none published
                      </Text>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      label={`${limit.endpoint} — ${limit.source} (confidence: ${limit.confidence})`}
                      multiline
                      w={320}
                      withArrow
                    >
                      <Group gap={4} wrap="nowrap" style={{ cursor: 'help' }}>
                        <Text size="sm" fw={500} c={overLimit ? errorColor : undefined}>
                          {limit.maxPercent}%
                        </Text>
                        <IconInfoCircle size={14} opacity={0.5} />
                      </Group>
                    </Tooltip>
                  )}
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={`Remove solvent ${index + 1}`}
                    onClick={() => removeRow(index)}
                    disabled={rows.length <= 1}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Button
        variant="subtle"
        size="compact-sm"
        leftSection={<IconPlus size={14} />}
        mt="sm"
        onClick={addRow}
        disabled={rows.length >= VEHICLE_OPTIONS.length}
      >
        Add solvent
      </Button>

      <IssueList issues={issues} />

      {notes.length > 0 && (
        <div style={{ marginTop: 'var(--mantine-spacing-sm)' }}>
          {notes.map(({ label, note }) => (
            <Text key={label} size="xs" c="dimmed" mt={4}>
              <strong>{label}:</strong> {note}
            </Text>
          ))}
        </div>
      )}
    </Paper>
  );
}
