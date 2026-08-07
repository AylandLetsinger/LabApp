import { ActionIcon, Button, Group, NumberInput, Paper, Table, Text, Tooltip } from '@mantine/core';
import { IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import {
  VEHICLE_OPTIONS,
  checkMiscibility,
  classifyBurden,
  computeSolventBurdenMgPerKg,
  getVehicle,
  observationBurdenMgPerKg,
  relevantObservations,
  toleratedBurdenRange,
} from '../../dosage/vehicles';
import { computeVehicleVolumes, primarySolventVolumeMl } from '../../dosage/computeVehicleVolumes';
import { roundTo } from '../../dosage/numberUtils';
import { errorColor } from '../../theme';

/**
 * Vehicle composition.
 *
 * A solvent with a solubility figure is one the drug is dissolved IN: its
 * volume is mass / solubility and no ratio can change it. Every other row is
 * diluent and shares what is left, by ratio parts. Leave solubility blank on
 * every row and this is an ordinary ratio table, which is what someone
 * transcribing an existing recipe wants.
 *
 * Percentages and burdens are therefore outputs. They used to be the input,
 * which had the chemistry backwards.
 *
 * @param {object} props
 * @param {Array<{vehicleId: string, parts: string, solubilityMgPerMl?: string}>} props.rows
 * @param {number} [props.dosePerSubjectMg] Enables the derived-volume columns.
 * @param {number} [props.volumePerSubjectMl] The dose volume being split.
 * @param {number} [props.bodyWeightKg] Enables the mg/kg column.
 * @param {number} [props.pipetteMinUl]
 */
export default function VehicleRatioTable({
  rows,
  onRowsChange,
  route,
  stepLabel,
  onBlur,
  dosePerSubjectMg,
  volumePerSubjectMl,
  bodyWeightKg,
  pipetteMinUl = 0,
}) {
  const setRow = (index, patch) =>
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const addRow = () => {
    const used = new Set(rows.map((r) => r.vehicleId));
    const next = VEHICLE_OPTIONS.find((o) => !used.has(o.value));
    onRowsChange([...rows, { vehicleId: next ? next.value : VEHICLE_OPTIONS[0].value, parts: '' }]);
  };

  const removeRow = (index) => onRowsChange(rows.filter((_, i) => i !== index));

  // A row with a solubility figure is fixed by chemistry rather than by ratio.
  const withFixed = rows.map((row) => ({
    parts: row.parts,
    fixedVolumeMl: primarySolventVolumeMl(dosePerSubjectMg, row.solubilityMgPerMl),
  }));
  const split = computeVehicleVolumes(volumePerSubjectMl, withFixed, {
    pipetteStepMl: pipetteMinUl > 0 ? pipetteMinUl / 1000 : 0,
  });

  const canComputeBurden =
    split !== null && Number.isFinite(bodyWeightKg) && bodyWeightKg > 0;

  const issues = [];

  if (split && split.overflowMl > 0) {
    issues.push({
      level: 'error',
      message:
        `The solvents the drug must dissolve in come to ${roundTo(split.overflowMl * 1000, 1)} µL ` +
        'more than the dose volume. Increase the dose volume, or use a solvent the drug is more ' +
        'soluble in — no ratio can resolve this.',
    });
  }

  if (split) {
    rows.forEach((row, i) => {
      const vehicle = getVehicle(row.vehicleId);
      const range = toleratedBurdenRange(row.vehicleId, { route });
      if (!vehicle || !range || !canComputeBurden) return;

      const burden = computeSolventBurdenMgPerKg({
        vehicleId: row.vehicleId,
        percentVv: split.rows[i].percentVv,
        volumePerSubjectMl,
        bodyWeightKg,
      });
      const verdict = classifyBurden(burden, range);
      const routeNote = range.exactRoute ? '' : ' (from another route — none published for this one)';

      if (verdict === 'above-highest') {
        issues.push({
          level: 'error',
          message:
            `${vehicle.label}: ${roundTo(burden, 1)} mg/kg per subject, above everything published ` +
            `for a mouse${routeNote}, the highest being ${roundTo(range.highest.mgPerKg, 1)} mg/kg. ` +
            (split.rows[i].isFixed
              ? 'This volume is set by solubility, so a co-solvent or a better solvent is needed — not a different ratio.'
              : 'Reduce its share of the vehicle.'),
        });
      } else if (verdict === 'above-lowest') {
        issues.push({
          level: 'warning',
          message:
            `${vehicle.label}: ${roundTo(burden, 1)} mg/kg per subject. Published tolerated figures` +
            `${routeNote} span ${roundTo(range.lowest.mgPerKg, 1)}–${roundTo(range.highest.mgPerKg, 1)} mg/kg, ` +
            `so this is inside the range but above the most conservative (${range.lowest.observation.duration}).`,
        });
      }
    });

    issues.push(
      ...checkMiscibility(
        rows.map((r, i) => ({ vehicleId: r.vehicleId, percentVv: split.rows[i].percentVv })),
      ),
    );
  }

  if (rows.length !== new Set(rows.map((r) => r.vehicleId)).size) {
    issues.push({ level: 'error', message: 'The same solvent is listed more than once.' });
  }

  const notes = rows
    .map((r) => getVehicle(r.vehicleId))
    .filter((v) => v?.note)
    .map((v) => ({ label: v.label, note: v.note }));

  const anyFixed = split?.rows.some((r) => r.isFixed);

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Put a <strong>solubility</strong> against the solvent your drug dissolves in — its volume is
        then worked out for you (dose ÷ solubility) and cannot be changed by a ratio. Leave
        solubility blank on a row and it becomes diluent, sharing what is left by its ratio parts.
        Blank everywhere and this is an ordinary ratio table.{' '}
        <strong>Your IACUC protocol governs, not this table.</strong>
      </Text>

      <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th ta="left">SOLVENT</Table.Th>
            <Table.Th ta="left" w={130}>solubility<br />(mg/mL)</Table.Th>
            <Table.Th ta="left" w={90}>ratio</Table.Th>
            <Table.Th ta="left" w={100}>volume<br />(per dose)</Table.Th>
            <Table.Th ta="left" w={80}>%(v/v)</Table.Th>
            <Table.Th ta="left" w={95}>delivers<br />(mg/kg)</Table.Th>
            <Table.Th ta="left" w={120}>published</Table.Th>
            <Table.Th w={44} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, index) => {
            const vehicle = getVehicle(row.vehicleId);
            const cell = split?.rows[index];
            const range = toleratedBurdenRange(row.vehicleId, { route });
            const burden =
              canComputeBurden && cell
                ? computeSolventBurdenMgPerKg({
                    vehicleId: row.vehicleId,
                    percentVv: cell.percentVv,
                    volumePerSubjectMl,
                    bodyWeightKg,
                  })
                : undefined;
            const verdict = classifyBurden(burden, range);
            const burdenColor =
              verdict === 'above-highest' ? errorColor : verdict === 'above-lowest' ? 'orange.7' : undefined;

            const allObs = relevantObservations(row.vehicleId, { route });
            const tooltip =
              allObs.length === 0
                ? 'No published tolerability data found for this solvent.'
                : allObs
                    .slice(0, 4)
                    .map((o) => {
                      const mg = observationBurdenMgPerKg(o, vehicle.densityGPerMl);
                      const amount = mg === undefined ? 'not computable' : `${roundTo(mg, 1)} mg/kg`;
                      const conc = o.percentVv !== undefined ? `${o.percentVv}%` : '';
                      const vol = o.volumeMlPerKg !== undefined ? ` at ${o.volumeMlPerKg} mL/kg` : '';
                      return `${o.species} ${o.route.toUpperCase()} ${conc}${vol} = ${amount} — ${o.duration}, ${o.outcome}`;
                    })
                    .join('\n\n');

            return (
              <Table.Tr key={`${row.vehicleId}-${index}`}>
                <Table.Td>
                  <LabSelect
                    data={VEHICLE_OPTIONS}
                    value={row.vehicleId}
                    onChange={(value) => setRow(index, { vehicleId: value ?? row.vehicleId })}
                    onBlur={onBlur}
                    aria-label={`Solvent ${index + 1}`}
                    searchable
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    placeholder="n/a"
                    min={0}
                    decimalScale={4}
                    value={row.solubilityMgPerMl ?? ''}
                    onChange={(value) => setRow(index, { solubilityMgPerMl: value })}
                    onBlur={onBlur}
                    aria-label={`Drug solubility in solvent ${index + 1}`}
                    hideControls
                  />
                </Table.Td>
                <Table.Td>
                  {cell?.isFixed ? (
                    <Text size="xs" c="dimmed" ta="center">
                      set by
                      <br />
                      solubility
                    </Text>
                  ) : (
                    <NumberInput
                      placeholder="-"
                      min={0}
                      decimalScale={4}
                      value={row.parts}
                      onChange={(value) => setRow(index, { parts: value })}
                      onBlur={onBlur}
                      aria-label={`Ratio parts for solvent ${index + 1}`}
                      hideControls
                    />
                  )}
                </Table.Td>
                <Table.Td>
                  <Text
                    size="sm"
                    fw={cell?.isFixed ? 700 : 500}
                    ff="monospace"
                    c={cell?.belowPipetteMinimum ? errorColor : undefined}
                  >
                    {cell ? `${roundTo(cell.displayMl * 1000, 2)} µL` : '—'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} c={burdenColor}>
                    {cell ? `${roundTo(cell.percentVv, 2)}%` : '—'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600} ff="monospace" c={burdenColor}>
                    {burden === undefined ? '—' : roundTo(burden, 1)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Tooltip label={tooltip} multiline w={440} withArrow>
                    <Group gap={4} wrap="nowrap" style={{ cursor: 'help' }}>
                      <Text size="sm" fw={500} c={burdenColor}>
                        {range === undefined
                          ? 'none'
                          : range.lowest.mgPerKg === range.highest.mgPerKg
                            ? roundTo(range.lowest.mgPerKg, 1)
                            : `${roundTo(range.lowest.mgPerKg, 1)}–${roundTo(range.highest.mgPerKg, 1)}`}
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

      {split === null && (
        <Text size="xs" c="dimmed" mt="sm" className="no-print">
          Fill in the dose and the volume per subject above to see volumes and mg/kg here.
        </Text>
      )}

      {anyFixed && (
        <Text size="xs" c="dimmed" mt="sm" className="no-print">
          Bold volumes are fixed by solubility. Clearing a solubility box turns that solvent back
          into diluent.
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
