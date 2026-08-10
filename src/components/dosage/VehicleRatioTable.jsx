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
  rowRequiredVolumeMl,
  suggestedDoseVolumeUl,
} from '../../dosage/computeVehicleVolumes';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import { MOLAR_CONCENTRATION_UNITS } from '../../dosage/molarUnits';
import { soluteDisplayName } from '../../dosage/solutes';
import { errorColor } from '../../theme';

/** mg/mL plus whatever molar units a molecular weight unlocks. */
const CONCENTRATION_UNITS = [{ value: 'mg/ml', label: 'mg/mL' }, ...MOLAR_CONCENTRATION_UNITS];

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
  solutes,
  soluteDosesMg,
  bodyWeightKg,
  pipetteMinUl = 0,
  syringeMinUl = 0,
  maxVolumeUl,
  volumePerDoseUl,
  onVolumePerDoseChange,
  volumeLabel = 'Volume loaded per worm',
  stockAvailableMl,
  onStockAvailableChange,
  totalStockNeededMl,
}) {
  const manySolutes = solutes.length > 1;
  const setRow = (index, patch) =>
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  /** Patch one solute's concentration in one row, leaving the others alone. */
  const setConcentration = (index, soluteId, patch) =>
    setRow(index, {
      concentrations: {
        ...rows[index].concentrations,
        [soluteId]: { ...rows[index].concentrations?.[soluteId], ...patch },
      },
    });

  const addRow = () => {
    const used = new Set(rows.map((r) => r.vehicleId));
    const next = VEHICLE_OPTIONS.find((o) => !used.has(o.value));
    onRowsChange([...rows, { vehicleId: next ? next.value : VEHICLE_OPTIONS[0].value, parts: '1' }]);
  };

  const removeRow = (index) => onRowsChange(rows.filter((_, i) => i !== index));

  /**
   * Change the dose volume, absorbing the difference into the last solvent.
   *
   * Every other solvent keeps the volume it already had, so raising the total
   * dilutes rather than rescaling everything at once — which is what makes the
   * control useful for finding a workable range.
   */
  const changeVolume = (nextValue) => {
    const nextUl = Number(nextValue);
    if (!Number.isFinite(nextUl) || nextUl <= 0 || !split || rows.length < 2) {
      onVolumePerDoseChange(nextValue);
      return;
    }
    const currentUl = split.rows.map((r) => r.exactMl * 1000);
    const fixedUl = currentUl.slice(0, -1).reduce((sum, ul) => sum + ul, 0);
    const lastUl = Math.max(0, nextUl - fixedUl);
    const nextUlPerRow = [...currentUl.slice(0, -1), lastUl];

    // Rewrite the parts on the SCALE the user was already using. Writing raw
    // microlitres would turn 5:2:2:16 into 25:10:10:81 — the same proportions
    // expressed five times larger, which reads as the table having jumped.
    // Holding parts-per-microlitre constant gives 5:2:2:16.2 instead: decimal,
    // but recognisably the recipe they started from.
    const currentTotalUl = currentUl.reduce((sum, ul) => sum + ul, 0);
    const currentTotalParts = rows.reduce((sum, row) => sum + (Number(row.parts) || 0), 0);
    const partsPerUl =
      currentTotalUl > 0 && currentTotalParts > 0 ? currentTotalParts / currentTotalUl : 1;

    onRowsChange(
      rows.map((row, i) => ({ ...row, parts: roundTo(nextUlPerRow[i] * partsPerUl, 4) })),
    );
    onVolumePerDoseChange(nextValue);
  };

  const suggestedUl = suggestedDoseVolumeUl(rows, solutes, soluteDosesMg, syringeMinUl);
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

      // Solubility floor: does this solvent get enough volume to dissolve
      // everything that relies on it?
      const minMl = rowRequiredVolumeMl(row, solutes, soluteDosesMg);
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
      const routeWord = route === 'ip' ? 'intraperitoneal' : 'oral';

      // Whole sentences, and only figures for THIS route. Neither of these is
      // an impossibility: the formulation mixes fine, it is simply beyond
      // published experience, which is the user's judgement to make.
      if (verdict === 'above-highest') {
        const ref = range.highest;
        issues.push({
          level: 'warning',
          message:
            `This vehicle delivers ${roundTo(burden, 1)} mg/kg of ${vehicle.label} per subject, ` +
            `which is above every published ${routeWord} figure for mice. The highest reported as ` +
            `tolerated is ${roundTo(ref.mgPerKg, 1)} mg/kg (${ref.observation.duration}, ` +
            `${ref.observation.source}). It is makeable — justify it in your protocol.`,
        });
      } else if (verdict === 'above-lowest') {
        const ref = range.lowest;
        issues.push({
          level: 'warning',
          message:
            `This vehicle delivers ${roundTo(burden, 1)} mg/kg of ${vehicle.label} per subject, ` +
            `which is above the most conservative published ${routeWord} figure for mice of ` +
            `${roundTo(ref.mgPerKg, 1)} mg/kg (${ref.observation.duration}, ${ref.observation.source}). ` +
            `Published ${routeWord} figures reach ${roundTo(range.highest.mgPerKg, 1)} mg/kg, so this ` +
            'is within reported experience but worth checking against your dosing schedule.',
        });
      }
    });

    issues.push(
      ...checkMiscibility(
        rows.map((r, i) => ({ vehicleId: r.vehicleId, percentVv: split.rows[i].percentVv })),
      ),
    );
  }

  const stockHave = Number(stockAvailableMl);
  if (Number.isFinite(stockHave) && stockHave > 0 && Number.isFinite(totalStockNeededMl) && totalStockNeededMl > stockHave) {
    issues.push({
      level: 'error',
      message:
        `This batch needs ${roundTo(totalStockNeededMl, 4)} mL of stock but you have ` +
        `${roundTo(stockHave, 4)} mL — short by ${roundTo(totalStockNeededMl - stockHave, 4)} mL. ` +
        'Make fewer dosages, reduce the waste buffer, or make more stock.',
    });
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
        Ratio sets every volume. A <strong>solubility</strong> — or, for a stock row, its{' '}
        <strong>concentration</strong> — tells the calculator the minimum volume that row must
        occupy. It does not lock the volume, so you can carry more if your protocol does.{' '}
        <strong>Your IACUC protocol governs, not this table.</strong>
      </Text>

      <Table.ScrollContainer minWidth={760}>
        <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th ta="left" miw={150}>SOLVENT</Table.Th>
              <Table.Th ta="left" w={130}>solubility /<br />stock conc.</Table.Th>
              <Table.Th ta="left" w={105}>required<br />(per dose)</Table.Th>
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
              const minMl = rowRequiredVolumeMl(row, solutes, soluteDosesMg);
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
                  ? `No published ${route === 'ip' ? 'intraperitoneal' : 'oral'} tolerability figure for this solvent in mice. Other routes, if any, are listed below.`
                  : `Published tolerated, ${route === 'ip' ? 'intraperitoneal' : 'oral'}: ` +
                    `${roundTo(range.lowest.mgPerKg, 1)}–${roundTo(range.highest.mgPerKg, 1)} mg/kg`;
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
                      label={row.isStock ? 'stock, dissolved in' : undefined}
                      aria-label={row.isStock ? 'What the stock is dissolved in' : `Solvent ${index + 1}`}
                      searchable
                    />
                  </Table.Td>
                  <Table.Td>
                    {/*
                      One entry per solute. Each dissolves at its own rate, so
                      a single figure per solvent would be a figure for an
                      unnamed drug — which is the sort of ambiguity that gets
                      a formulation weighed out wrong.
                    */}
                    {solutes.map((solute, s) => {
                      const entry = row.concentrations?.[solute.id] ?? {};
                      const molar = toPositiveNumber(solute.molecularWeight) !== undefined;
                      return (
                        <div key={solute.id} style={{ marginTop: s === 0 ? 0 : 8 }}>
                          {manySolutes && (
                            <Text size="xs" c="dimmed" truncate>
                              {soluteDisplayName(solute, s)}
                            </Text>
                          )}
                          <NumberInput
                            placeholder={row.isStock ? 'conc.' : 'n/a'}
                            min={0}
                            decimalScale={4}
                            value={entry.value ?? ''}
                            onChange={(value) => setConcentration(index, solute.id, { value })}
                            onBlur={onBlur}
                            aria-label={
                              row.isStock
                                ? `Stock concentration of ${soluteDisplayName(solute, s)}`
                                : `Solubility of ${soluteDisplayName(solute, s)} in solvent ${index + 1}`
                            }
                            hideControls
                          />
                          {molar && (
                            <LabSelect
                              data={CONCENTRATION_UNITS}
                              value={entry.unit ?? 'mg/ml'}
                              onChange={(value) =>
                                setConcentration(index, solute.id, { unit: value ?? 'mg/ml' })
                              }
                              onBlur={onBlur}
                              aria-label={`Concentration unit for ${soluteDisplayName(solute, s)} in solvent ${index + 1}`}
                              size="xs"
                              mt={4}
                            />
                          )}
                        </div>
                      );
                    })}
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
                      disabled={rows.length <= 1 || row.isStock}
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

      <Group align="flex-end" wrap="wrap" gap="sm" mb={4}>
        <NumberInput
          label={volumeLabel}
          min={0}
          decimalScale={3}
          value={volumePerDoseUl}
          onChange={changeVolume}
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

      {onStockAvailableChange && (
        <Group align="flex-end" wrap="wrap" gap="sm" mt="sm">
          <NumberInput
            label="How much stock do you have?"
            placeholder="optional"
            min={0}
            decimalScale={4}
            value={stockAvailableMl}
            onChange={onStockAvailableChange}
            onBlur={onBlur}
            w={200}
            variant="filled"
          />
          <Text pb="sm" size="sm">
            mL
          </Text>
          {Number.isFinite(totalStockNeededMl) && (
            <Text pb="sm" size="sm" c="dimmed">
              this batch needs <strong>{roundTo(totalStockNeededMl, 4)} mL</strong>
            </Text>
          )}
        </Group>
      )}

      {/* Last thing in the step, directly under the control most likely to
          have caused it: change, then consequence, with nothing shifting
          between the two. */}
      <IssueList issues={issues} />
    </Paper>
  );
}
