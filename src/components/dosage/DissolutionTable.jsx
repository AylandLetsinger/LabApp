import { Group, Loader, Paper, Table, Text, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import IssueList from './IssueList';
import {
  computeVehicleVolumes,
  rowRequiredVolumeMl,
} from '../../dosage/computeVehicleVolumes';
import { roundTo } from '../../dosage/numberUtils';
import { soluteDisplayName } from '../../dosage/solutes';
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
  solutes,
  soluteBatchMg,
  soluteDosesMg,
  vehicleRows,
  pipetteMinUl,
  stepLabel,
  footer,
  soluteLabel,
  soluteIsVolume = false,
  soluteVolumeMl,
}) {
  // The batch is the per-dose vehicle scaled up, so the same ratio applies.
  const split = computeVehicleVolumes(totalVolumeMl, vehicleRows, {
    pipetteMinMl: pipetteMinUl > 0 ? pipetteMinUl / 1000 : 0,
  });
  const volumes = split?.rows ?? null;

  const ready =
    volumes !== null && soluteBatchMg.every((mg) => mg !== undefined && Number.isFinite(mg));

  // The batch is the per-dose vehicle scaled by the same factor for every
  // solute, so a floor cleared per dose is cleared for the batch. Checking it
  // at batch scale is what makes the message name millilitres you can measure.
  const batchScale =
    soluteDosesMg.length > 0 && soluteDosesMg[0] > 0 ? soluteBatchMg[0] / soluteDosesMg[0] : 1;

  const issues = [];
  if (volumes) {
    vehicleRows.forEach((row, i) => {
      if (row.isStock) return;
      const perDoseMl = rowRequiredVolumeMl(row, solutes, soluteDosesMg);
      if (perDoseMl === undefined) return;
      const minMl = perDoseMl * batchScale;
      if (volumes[i].exactMl < minMl - 1e-12) {
        const vehicle = getVehicle(row.vehicleId);
        issues.push({
          level: 'error',
          message:
            `${vehicle?.label ?? 'Solvent'} gets ${roundTo(volumes[i].exactMl, 4)} mL but this batch ` +
            `needs at least ${roundTo(minMl, 4)} mL of it to dissolve. Raise its ratio, or make a ` +
            'larger batch.',
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
          {soluteIsVolume ? (
            <Table.Tr>
              <Table.Td miw={90}>
                <Text size="sm" fw={500}>
                  Take
                </Text>
              </Table.Td>
              <Table.Td style={cellValueBg} ta="right" maw={160}>
                <Text size="sm" fw={500} ff="monospace">
                  {Number.isFinite(soluteVolumeMl) ? roundTo(soluteVolumeMl, 4) : '—'}
                </Text>
              </Table.Td>
              <Table.Td style={cellUnitBg} miw={56}>
                <Text size="sm" fw={500}>
                  mL
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {soluteLabel ?? 'of stock solution'}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            // One line per substance. A combined mass would be useless at the
            // balance, which is the only place this row gets read.
            solutes.map((solute, i) => (
              <Table.Tr key={solute.id}>
                <Table.Td miw={90}>
                  <Text size="sm" fw={500}>
                    {i === 0 ? 'Dissolve' : 'and'}
                  </Text>
                </Table.Td>
                <Table.Td style={cellValueBg} ta="right" maw={160}>
                  <Text size="sm" fw={500} ff="monospace">
                    {ready ? roundTo(soluteBatchMg[i], 4) : '—'}
                  </Text>
                </Table.Td>
                <Table.Td style={cellUnitBg} miw={56}>
                  <Text size="sm" fw={500}>
                    mg
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {/*
                      A name earns its place in the sentence whenever it exists.
                      Only an unnamed lone solute falls back to the generic
                      phrase — with several, "Solute 2" at least distinguishes.
                    */}
                    {solutes.length > 1 || (solute.name ?? '').trim() !== ''
                      ? `of ${soluteDisplayName(solute, i)}`
                      : (soluteLabel ?? 'of your solute')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))
          )}

          {vehicleRows.map((row, index) => {
            if (row.isStock) return null;
            const vehicle = getVehicle(row.vehicleId);
            const perDoseMl = rowRequiredVolumeMl(row, solutes, soluteDosesMg);
            const minForBatchMl =
              ready && !row.isStock && perDoseMl !== undefined
                ? perDoseMl * batchScale
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
