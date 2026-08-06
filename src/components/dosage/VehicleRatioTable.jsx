import { ActionIcon, Button, Group, NumberInput, Paper, Table, Text, Tooltip } from '@mantine/core';
import { IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import {
  VEHICLE_OPTIONS,
  checkMiscibility,
  computeSolventBurdenMgPerKg,
  getVehicle,
  observationBurdenMgPerKg,
  relevantObservations,
  tightestToleratedBurdenMgPerKg,
} from '../../dosage/vehicles';
import { computeVehiclePercents } from '../../dosage/computeVehicleVolumes';
import { roundTo } from '../../dosage/numberUtils';
import { errorColor } from '../../theme';

/**
 * Vehicle composition: pick solvents, set ratio parts, and compare what the
 * mixture would actually deliver against what has been published.
 *
 * The comparison is in mg/kg rather than %v/v, because that is the form the
 * source data supports. Two rows quoting different concentrations at different
 * volumes are only comparable once both are multiplied out.
 *
 * @param {object} props
 * @param {Array<{vehicleId: string, parts: string}>} props.rows
 * @param {(rows: Array<{vehicleId: string, parts: string}>) => void} props.onRowsChange
 * @param {'ip' | 'oral'} props.route
 * @param {number} [props.volumePerSubjectMl] Enables the mg/kg column.
 * @param {number} [props.bodyWeightKg]
 */
export default function VehicleRatioTable({
  rows,
  onRowsChange,
  route,
  stepLabel,
  onBlur,
  volumePerSubjectMl,
  bodyWeightKg,
}) {
  const percents = computeVehiclePercents(rows.map((r) => r.parts));
  const canComputeBurden =
    Number.isFinite(volumePerSubjectMl) && Number.isFinite(bodyWeightKg) && bodyWeightKg > 0;

  const setRow = (index, patch) => {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const used = new Set(rows.map((r) => r.vehicleId));
    const next = VEHICLE_OPTIONS.find((o) => !used.has(o.value));
    onRowsChange([...rows, { vehicleId: next ? next.value : VEHICLE_OPTIONS[0].value, parts: '' }]);
  };

  const removeRow = (index) => onRowsChange(rows.filter((_, i) => i !== index));

  const issues = [];

  if (percents) {
    rows.forEach((row, i) => {
      const vehicle = getVehicle(row.vehicleId);
      const reference = tightestToleratedBurdenMgPerKg(row.vehicleId, { route });
      if (!vehicle || !reference || !canComputeBurden) return;

      const burden = computeSolventBurdenMgPerKg({
        vehicleId: row.vehicleId,
        percentVv: percents[i],
        volumePerSubjectMl,
        bodyWeightKg,
      });
      if (burden === undefined || burden <= reference.mgPerKg) return;

      issues.push({
        level: 'error',
        message:
          `${vehicle.label} would deliver ${roundTo(burden, 1)} mg/kg. The tightest tolerated ` +
          `figure published for a mouse by this route is ${roundTo(reference.mgPerKg, 1)} mg/kg ` +
          `(${reference.observation.duration}, ${reference.observation.outcome}). ` +
          'Reduce it, or justify it in your protocol.',
      });
    });

    issues.push(
      ...checkMiscibility(rows.map((r, i) => ({ vehicleId: r.vehicleId, percentVv: percents[i] }))),
    );
  }

  if (rows.length !== new Set(rows.map((r) => r.vehicleId)).size) {
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
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Enter ratio parts per solvent — 1 : 1 : 18 gives 5% / 5% / 90%. The{' '}
        <strong>delivers</strong> column is what one subject would actually receive, in mg/kg;{' '}
        <strong>published</strong> is the tightest tolerated figure found for a mouse by the{' '}
        {route === 'ip' ? 'intraperitoneal' : 'oral'} route. Hover it for the study.{' '}
        <strong>Your IACUC protocol governs, not this table.</strong>
      </Text>

      <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th ta="left">SOLVENT</Table.Th>
            <Table.Th ta="left" w={110}>ratio</Table.Th>
            <Table.Th ta="left" w={90}>%(v/v)</Table.Th>
            <Table.Th ta="left" w={110}>delivers</Table.Th>
            <Table.Th ta="left" w={130}>published</Table.Th>
            <Table.Th w={44} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, index) => {
            const vehicle = getVehicle(row.vehicleId);
            const percent = percents ? percents[index] : undefined;
            const reference = tightestToleratedBurdenMgPerKg(row.vehicleId, { route });
            const burden =
              canComputeBurden && percent !== undefined
                ? computeSolventBurdenMgPerKg({
                    vehicleId: row.vehicleId,
                    percentVv: percent,
                    volumePerSubjectMl,
                    bodyWeightKg,
                  })
                : undefined;
            const over =
              burden !== undefined && reference !== undefined && burden > reference.mgPerKg;

            const allObs = relevantObservations(row.vehicleId, { route });
            const tooltip =
              allObs.length === 0
                ? 'No published tolerability data found for this solvent.'
                : allObs
                    .slice(0, 4)
                    .map((o) => {
                      const mg = observationBurdenMgPerKg(o, vehicle.densityGPerMl);
                      const amount = mg === undefined ? '—' : `${roundTo(mg, 1)} mg/kg`;
                      const conc = o.percentVv !== undefined ? `${o.percentVv}%` : '';
                      const vol = o.volumeMlPerKg !== undefined ? ` at ${o.volumeMlPerKg} mL/kg` : '';
                      return `${o.species} ${o.route.toUpperCase()} ${conc}${vol} = ${amount} — ${o.duration}, ${o.outcome} [${o.source}]`;
                    })
                    .join('\n\n');

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
                  <Text size="sm" fw={500} c={over ? errorColor : undefined}>
                    {percent === undefined ? '—' : `${roundTo(percent, 2)}%`}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600} ff="monospace" c={over ? errorColor : undefined}>
                    {burden === undefined ? '—' : `${roundTo(burden, 1)}`}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Tooltip label={tooltip} multiline w={420} withArrow>
                    <Group gap={4} wrap="nowrap" style={{ cursor: 'help' }}>
                      <Text size="sm" fw={500} c={over ? errorColor : undefined}>
                        {reference === undefined
                          ? 'none published'
                          : `${roundTo(reference.mgPerKg, 1)} mg/kg`}
                      </Text>
                      <IconInfoCircle size={14} opacity={0.5} />
                    </Group>
                  </Tooltip>
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

      {!canComputeBurden && (
        <Text size="xs" c="dimmed" mt="sm" className="no-print">
          Fill in dose volume and body weight above to see what each solvent delivers in mg/kg.
        </Text>
      )}

      <IssueList issues={issues} />

      {notes.length > 0 && (
        <div style={{ marginTop: 'var(--mantine-spacing-sm)' }}>
          {notes.map(({ label, note }) => (
            <Text key={label} size="xs" c="dimmed" mt={4} className="no-print">
              <strong>{label}:</strong> {note}
            </Text>
          ))}
        </div>
      )}
    </Paper>
  );
}
