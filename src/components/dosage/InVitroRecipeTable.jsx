import { Group, Loader, Paper, Table, Text, ThemeIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconCheck } from '@tabler/icons-react';
import IssueList from './IssueList';
import { roundTo } from '../../dosage/numberUtils';
import { soluteDisplayName } from '../../dosage/solutes';
import { errorColor } from '../../theme';

const cellValueBg = { backgroundColor: 'var(--mantine-color-yellow-1)' };
const cellUnitBg = { backgroundColor: 'var(--mantine-color-gray-2)' };

/** Small volumes read better in microlitres; large ones in millilitres. */
function formatVolume(ml) {
  if (ml === undefined || !Number.isFinite(ml)) return { value: '—', unit: '' };
  if (ml < 1) return { value: roundTo(ml * 1000, 3), unit: 'µL' };
  return { value: roundTo(ml, 4), unit: 'mL' };
}

/**
 * The bench recipe: what goes into one vessel, and into the batch.
 *
 * Both are shown because both get used — one when dosing a single chamber, the
 * other when making a master mix for a plate. Deriving the batch by hand from
 * the per-vessel figure is a multiplication done under time pressure next to a
 * hood, which is exactly the arithmetic this app exists to take off someone.
 */
export default function InVitroRecipeTable({
  stepLabel = 'Step 4 — Recipe',
  outputFeedback,
  solutes,
  contributions,
  mediumMl,
  finalVolumeMl,
  batchFactor,
  totalVessels,
  vessel,
  footer,
}) {
  const narrow = useMediaQuery('(max-width: 560px)');

  const ready =
    mediumMl !== undefined &&
    Number.isFinite(mediumMl) &&
    contributions.every((c) => c.stockMl !== undefined);

  const issues = [];
  if (ready && mediumMl < 0) {
    issues.push({
      level: 'error',
      message:
        `The stocks come to ${formatVolume(-mediumMl).value} ${formatVolume(-mediumMl).unit} more ` +
        `than the whole ${vessel.noun}, so there is no room for medium. Use more concentrated ` +
        'stocks, or a larger volume.',
    });
  }

  const scale = Number.isFinite(batchFactor) && batchFactor > 0 ? batchFactor : undefined;

  const row = (label, ml, description, flagged = false) => {
    const per = formatVolume(ml);
    const batch = formatVolume(scale !== undefined && ml !== undefined ? ml * scale : undefined);
    const batchReady = ready && scale !== undefined;

    // On a phone the value and its unit share one cell. Six columns do not fit
    // 375 px, and the pair was only ever split so the units could line up.
    if (narrow) {
      return (
        <Table.Tr key={description}>
          <Table.Td>
            <Text size="sm" fw={500}>
              {label}
            </Text>
          </Table.Td>
          <Table.Td style={cellValueBg} ta="right">
            <Text size="sm" fw={500} ff="monospace" c={flagged ? errorColor : undefined}>
              {ready ? `${per.value} ${per.unit}` : '—'}
            </Text>
          </Table.Td>
          <Table.Td style={cellValueBg} ta="right">
            <Text size="sm" fw={500} ff="monospace">
              {batchReady ? `${batch.value} ${batch.unit}` : '—'}
            </Text>
          </Table.Td>
          <Table.Td>
            <Text size="sm" fw={500}>
              {description}
            </Text>
          </Table.Td>
        </Table.Tr>
      );
    }

    return (
      <Table.Tr key={description}>
        <Table.Td miw={70}>
          <Text size="sm" fw={500}>
            {label}
          </Text>
        </Table.Td>
        <Table.Td style={cellValueBg} ta="right" maw={120}>
          <Text size="sm" fw={500} ff="monospace" c={flagged ? errorColor : undefined}>
            {ready ? per.value : '—'}
          </Text>
        </Table.Td>
        <Table.Td style={cellUnitBg} miw={46}>
          <Text size="sm" fw={500}>
            {ready ? per.unit : '—'}
          </Text>
        </Table.Td>
        <Table.Td style={cellValueBg} ta="right" maw={120}>
          <Text size="sm" fw={500} ff="monospace">
            {batchReady ? batch.value : '—'}
          </Text>
        </Table.Td>
        <Table.Td style={cellUnitBg} miw={46}>
          <Text size="sm" fw={500}>
            {batchReady ? batch.unit : '—'}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" fw={500}>
            {description}
          </Text>
        </Table.Td>
      </Table.Tr>
    );
  };

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

      <Table.ScrollContainer minWidth={narrow ? 0 : 560}>
        <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th />
              <Table.Th ta="right" colSpan={narrow ? 1 : 2}>
                per {vessel.noun}
              </Table.Th>
              <Table.Th ta="right" colSpan={narrow ? 1 : 2}>
                batch{totalVessels !== undefined ? ` (${totalVessels} ${vessel.pluralNoun})` : ''}
              </Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {solutes.map((solute, i) =>
              row(
                i === 0 ? 'Add' : 'and',
                contributions[i]?.stockMl,
                `of ${soluteDisplayName(solute, i)} stock`,
                contributions[i]?.belowPipetteMinimum,
              ),
            )}
            {row('in', mediumMl, 'of medium', ready && mediumMl < 0)}
            {/* "per well" would be wrong in the batch column beside it. */}
            {row('Total', finalVolumeMl, 'of finished medium')}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {footer}

      <IssueList issues={issues} />

      {!ready && (
        <Text size="xs" c="dimmed" mt="sm">
          Fill in the steps above to populate this table.
        </Text>
      )}
    </Paper>
  );
}
