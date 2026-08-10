import { Group, Loader, Paper, Table, Text, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import IssueList from './IssueList';
import {
  computeVehicleVolumes,
  primarySolventVolumeMl,
  rowConcentrationMgPerMl,
} from '../../dosage/computeVehicleVolumes';
import { roundTo } from '../../dosage/numberUtils';
import { getVehicle } from '../../dosage/vehicles';
import { errorColor } from '../../theme';

const cellValueBg = { backgroundColor: 'var(--mantine-color-yellow-1)' };
const cellUnitBg = { backgroundColor: 'var(--mantine-color-gray-2)' };

/** Small volumes read better in microlitres; large ones in millilitres. */
function formatVolume(ml) {
  if (ml < 1) return { value: roundTo(ml * 1000, 2), unit: 'µL' };
  return { value: roundTo(ml, 4), unit: 'mL' };
}

/**
 * The bench recipe: dissolve this much solute in these volumes.
 *
 * Volumes are snapped to what the user's pipette can actually deliver, and
 * the last solvent absorbs the rounding so the recipe always sums to the
 * total volume. Any solvent whose true share is smaller than the pipette can
 * measure is reported as a problem rather than displayed as "0".
 */
export default function DissolutionTable({
  outputFeedback,
  totalVolumeMl,
  soluteRequiredMg,
  vehicleRows,
  pipetteMinUl,
  stepLabel,
  footer,
  molecularWeight,
  soluteLabel = 'of your solute',
  soluteIsVolume = false,
  soluteVolumeMl,
}) {
  // The batch is the per-dose vehicle scaled up, so the same ratio applies.
  const split = computeVehicleVolumes(totalVolumeMl, vehicleRows, {
    pipetteMinMl: pipetteMinUl > 0 ? pipetteMinUl / 1000 : 0,
  });
  const volumes = split?.rows ?? null;

  const ready = volumes !== null && soluteRequiredMg !== undefined && Number.isFinite(soluteRequiredMg);

  const issues = [];
  if (volumes) {
    vehicleRows.forEach((row, i) => {
      if (row.isStock) return;
      const minMl = primarySolventVolumeMl(soluteRequiredMg, rowConcentrationMgPerMl(row, molecularWeight));
      if (minMl === undefined) return;
      if (volumes[i].exactMl < minMl - 1e-12) {
        const vehicle = getVehicle(row.vehicleId);
        issues.push({
          level: 'error',
          message:
            `${vehicle?.label ?? 'Solvent'} gets ${roundTo(volumes[i].exactMl, 4)} mL but dissolving ` +
            `${roundTo(soluteRequiredMg, 4)} mg needs at least ${roundTo(minMl, 4)} mL. Raise its ` +
            'ratio, or make a larger batch.',
        });
      }
    });
  }
  if (volumes) {
    volumes.forEach((v, i) => {
      if (v.belowPipetteMinimum) {
        const vehicle = getVehicle(vehicleRows[i].vehicleId);
        issues.push({
          level: 'error',
          message:
            `${vehicle?.label ?? 'Solvent'} works out to ${roundTo(v.exactMl * 1000, 3)} µL, ` +
            `below your ${pipetteMinUl} µL pipette minimum. Make a larger batch or ` +
            'prepare this solvent as a premix.',
        });
      }
    });
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="sm">
        <Text fw={600}>{stepLabel}</Text>
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
      <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder withColumnBorders>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td miw={90}>
              <Text size="sm" fw={500}>
                {soluteIsVolume ? 'Take' : 'Dissolve'}
              </Text>
            </Table.Td>
            <Table.Td style={cellValueBg} ta="right" maw={160}>
              <Text size="sm" fw={500} ff="monospace">
                {soluteIsVolume
                  ? (Number.isFinite(soluteVolumeMl) ? roundTo(soluteVolumeMl, 4) : '—')
                  : (ready ? roundTo(soluteRequiredMg, 4) : '—')}
              </Text>
            </Table.Td>
            <Table.Td style={cellUnitBg} miw={56}>
              <Text size="sm" fw={500}>
                {soluteIsVolume ? 'mL' : 'mg'}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw={500}>
                {soluteLabel}
              </Text>
            </Table.Td>
          </Table.Tr>

          {vehicleRows.map((row, index) => {
            if (row.isStock) return null;
            const vehicle = getVehicle(row.vehicleId);
            const minForBatchMl = ready && !row.isStock
              ? primarySolventVolumeMl(soluteRequiredMg, rowConcentrationMgPerMl(row, molecularWeight))
              : undefined;
            const volume = ready ? formatVolume(volumes[index].displayMl) : null;
            const flagged = volumes?.[index]?.belowPipetteMinimum;
            return (
              <Table.Tr key={`${row.vehicleId}-${index}`}>
                <Table.Td miw={90}>
                  <Text size="sm" fw={500}>
                    in
                  </Text>
                </Table.Td>
                <Table.Td style={cellValueBg} ta="right" maw={160}>
                  <Text size="sm" fw={500} ff="monospace" c={flagged ? errorColor : undefined}>
                    {volume ? volume.value : '—'}
                  </Text>
                </Table.Td>
                <Table.Td style={cellUnitBg} miw={56}>
                  <Text size="sm" fw={500}>
                    {volume ? volume.unit : '—'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {vehicle?.label ?? 'Solvent'}
                    {minForBatchMl !== undefined && (
                      <Text component="span" size="xs" c="dimmed">
                        {'  '}(needs ≥ {roundTo(minForBatchMl, 4)} mL to dissolve)
                      </Text>
                    )}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          })}

          <Table.Tr>
            <Table.Td miw={90}>
              <Text size="sm" fw={700}>
                Total
              </Text>
            </Table.Td>
            <Table.Td style={cellValueBg} ta="right" maw={160}>
              <Text size="sm" fw={700} ff="monospace">
                {ready ? formatVolume(totalVolumeMl).value : '—'}
              </Text>
            </Table.Td>
            <Table.Td style={cellUnitBg} miw={56}>
              <Text size="sm" fw={700}>
                {ready ? formatVolume(totalVolumeMl).unit : '—'}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw={700}>
                of working solution
              </Text>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

      {footer}

      <IssueList issues={issues} />

      {!ready && (
        <Text size="xs" c="dimmed" mt="sm">
          Fill in the steps above, and give every solvent a ratio value, to populate this table.
        </Text>
      )}
    </Paper>
  );
}
