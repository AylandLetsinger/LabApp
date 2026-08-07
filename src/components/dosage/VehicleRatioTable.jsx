import { ActionIcon, Button, Group, NumberInput, Paper, Table, Text, Tooltip } from '@mantine/core';
import { IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import AutoValue from './AutoValue';
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
import {
  computeVehicleVolumes,
  primarySolventVolumeMl,
  suggestedDoseVolumeUl,
} from '../../dosage/computeVehicleVolumes';
import { roundTo } from '../../dosage/numberUtils';
import { errorColor } from '../../theme';

/**
 * Vehicle composition.
 *
 * Ratio drives every volume. Solubility, where given, sets a FLOOR on how much
 * of that solvent the dose needs — it does not pin the volume, because a
 * vehicle may legitimately carry more of a solvent than the drug requires. An
 * earlier version locked such a row, which made an ordinary published recipe
 * like 5:2:2:16 impossible to enter.
 *
 * The dose volume is suggested rather than invented: the smallest total at
 * which every solvent still clears its floor and the syringe can deliver it.
 */
export default function VehicleRatioTable({
  rows,
  onRowsChange,
  route,
  stepLabel,
  onBlur,
  dosePerSubjectMg,
  bodyWeightKg,
  pipetteMinUl = 0,
  syringeMinUl = 0,
  maxVolumeUl,
  volumePerDoseUl,
  onVolumePerDoseChange,
  volumeLabel = 'Volume loaded per worm',
}) {
  const setRow = (index, patch) =>
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const addRow = () => {
    const used = new Set(rows.map((r) => r.vehicleId));
    const next = VEHICLE_OPTIONS.find((o) => !used.has(o.value));
    onRowsChange([...rows, { vehicleId: next ? next.value : VEHICLE_OPTIONS[0].value, parts: '1' }]);
  };

  const removeRow = (index) => onRowsChange(rows.filter((_, i) => i !== index));

  const suggestedUl = suggestedDoseVolumeUl(rows, dosePerSubjectMg, syringeMinUl);
  const typedUl = Number(volumePerDoseUl);
  const effectiveUl = Number.isFinite(typedUl) && typedUl > 0 ? typedUl : suggestedUl;
  const volumePerSubjectMl = effectiveUl > 0 ? effectiveUl / 1000 : undefined;

  const split = computeVehicleVolumes(volumePerSubjectMl, rows, {
    pipetteMinMl: pipetteMinUl > 0 ? pipetteMinUl / 1000 : 0,
  });
  const canComputeBurden = split !== null && Number.isFinite(bodyWeightKg) && bodyWeightKg > 0;

  const issues = [];

  if (Number.isFinite(maxVolumeUl) && maxVolumeUl > 0 && effectiveUl > maxVolumeUl) {
    issues.push({
      level: 'error',
      message:
        `${roundTo(effectiveUl, 2)} µL per dose exceeds the ${roundTo(maxVolumeUl, 2)} µL that fits. ` +
        'Reduce the volume, raise the share of the solvent the drug dissolves in, or use a larger worm.',
    });
  }
  if (syringeMinUl > 0 && effectiveUl > 0 && effectiveUl < syringeMinUl) {
    issues.push({
      level: 'error',
      message:
        `${roundTo(effectiveUl, 2)} µL is below the ${roundTo(syringeMinUl, 2)} µL your syringe can ` +
        'measure. Add diluent to reach a volume you can actually deliver.',
    });
  }

  if (split) {
    rows.forEach((row, i) => {
      const vehicle = getVehicle(row.vehicleId);
      if (!vehicle) return;

      // Solubility floor: does this solvent get enough volume to dissolve the dose?
      const minMl = primarySolventVolumeMl(dosePerSubjectMg, row.solubilityMgPerMl);
      if (minMl !== undefined && split.rows[i].exactMl < minMl - 1e-12) {
        issues.push({
          level: 'error',
          message:
            `${vehicle.label} gets ${roundTo(split.rows[i].exactMl * 1000, 2)} µL but needs at least ` +
            `${roundTo(minMl * 1000, 2)} µL to dissolve the dose. Raise its ratio, or raise the total volume.`,
        });
      }

      const range = toleratedBurdenRange(row.vehicleId, { route });
      if (!range || !canComputeBurden) return;
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
            `for a mouse${routeNote}, the highest being ${roundTo(range.highest.mgPerKg, 1)} mg/kg.`,
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

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Ratio sets every volume. Adding a <strong>solubility</strong> tells the calculator the
        minimum that solvent needs to dissolve the dose — it does not lock the volume, so you can
        carry more than the minimum if your protocol does.{' '}
        <strong>Your IACUC protocol governs, not this table.</strong>
      </Text>

      <Group align="flex-end" wrap="wrap" gap="sm" mb={4}>
        <NumberInput
          label={volumeLabel}
          min={0}
          decimalScale={3}
          value={volumePerDoseUl}
          onChange={onVolumePerDoseChange}
          onBlur={onBlur}
          w={200}
          variant="filled"
          className="auto-input"
          key={`vol-${roundTo(suggestedUl, 3)}`}
        />
        <Text pb="sm" size="sm">
          µL
        </Text>
        {suggestedUl > 0 && (
          <Text pb="sm" size="sm" c="dimmed">
            smallest workable: <strong>{roundTo(suggestedUl, 2)} µL</strong>
            {Number.isFinite(maxVolumeUl) && maxVolumeUl > 0
              ? ` · ceiling: ${roundTo(maxVolumeUl, 2)} µL`
              : ''}
          </Text>
        )}
      </Group>

      <Table.ScrollContainer minWidth={760}>
        <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th ta="left" miw={150}>SOLVENT</Table.Th>
              <Table.Th ta="left" w={105}>solubility<br />(mg/mL)</Table.Th>
              <Table.Th ta="left" w={90}>min needed</Table.Th>
              <Table.Th ta="left" w={80}>ratio</Table.Th>
              <Table.Th ta="left" w={78}>%(v/v)</Table.Th>
              <Table.Th ta="left" w={92}>volume<br />(per dose)</Table.Th>
              <Table.Th ta="left" w={108}>delivers<br />(mg/kg)</Table.Th>
              <Table.Th w={38} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row, index) => {
              const vehicle = getVehicle(row.vehicleId);
              const cell = split?.rows[index];
              const minMl = primarySolventVolumeMl(dosePerSubjectMg, row.solubilityMgPerMl);
              const shortOfMinimum = minMl !== undefined && cell && cell.exactMl < minMl - 1e-12;
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
                verdict === 'above-highest'
                  ? errorColor
                  : verdict === 'above-lowest'
                    ? 'orange.7'
                    : undefined;

              const published =
                range === undefined
                  ? 'No published tolerability figure for this solvent.'
                  : `Published tolerated: ${roundTo(range.lowest.mgPerKg, 1)}–${roundTo(range.highest.mgPerKg, 1)} mg/kg` +
                    (range.exactRoute ? '' : ' (from another route)');
              const observations = relevantObservations(row.vehicleId, { route })
                .slice(0, 4)
                .map((o) => {
                  const mg = observationBurdenMgPerKg(o, vehicle.densityGPerMl);
                  const amount = mg === undefined ? 'not computable' : `${roundTo(mg, 1)} mg/kg`;
                  const conc = o.percentVv !== undefined ? `${o.percentVv}%` : '';
                  const vol = o.volumeMlPerKg !== undefined ? ` at ${o.volumeMlPerKg} mL/kg` : '';
                  return `${o.species} ${o.route.toUpperCase()} ${conc}${vol} = ${amount} — ${o.duration}, ${o.outcome}`;
                })
                .join('\n\n');
              const note = vehicle?.note ? `\n\n${vehicle.label}: ${vehicle.note}` : '';

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
                    <Text size="sm" ff="monospace" c={shortOfMinimum ? errorColor : 'dimmed'}>
                      {minMl === undefined ? '—' : `${roundTo(minMl * 1000, 2)} µL`}
                    </Text>
                  </Table.Td>
                  <Table.Td>
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
                  </Table.Td>
                  <Table.Td>
                    <AutoValue value={cell?.percentVv}>
                      <Text size="sm" fw={500} c={burdenColor}>
                        {cell ? `${roundTo(cell.percentVv, 2)}%` : '—'}
                      </Text>
                    </AutoValue>
                  </Table.Td>
                  <Table.Td>
                    <AutoValue value={cell?.displayMl}>
                      <Text
                        size="sm"
                        fw={600}
                        ff="monospace"
                        c={shortOfMinimum || cell?.belowPipetteMinimum ? errorColor : undefined}
                      >
                        {cell ? `${roundTo(cell.displayMl * 1000, 2)} µL` : '—'}
                      </Text>
                    </AutoValue>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <AutoValue value={burden}>
                        <Text size="sm" fw={600} ff="monospace" c={burdenColor}>
                          {burden === undefined ? '—' : roundTo(burden, 1)}
                        </Text>
                      </AutoValue>
                      <Tooltip label={`${published}${observations ? `\n\n${observations}` : ''}${note}`} multiline w={430} withArrow events={{ hover: true, focus: true, touch: true }}>
                        <IconInfoCircle size={14} opacity={0.5} style={{ cursor: 'help' }} />
                      </Tooltip>
                    </Group>
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
      </Table.ScrollContainer>

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
    </Paper>
  );
}
