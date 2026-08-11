import { Divider, Group, NumberInput, Paper, Stack, Table, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import AutoValue from './AutoValue';
import { MASS_PER_ML_UNITS } from '../../dosage/dosageTypes';
import { MOLAR_CONCENTRATION_UNITS } from '../../dosage/molarUnits';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import { soluteDisplayName } from '../../dosage/solutes';
import { VEHICLE_OPTIONS, getVehicle } from '../../dosage/vehicles';
import { errorColor } from '../../theme';

const CARD_LAYOUT_BELOW = '(max-width: 760px)';

/** Volume in the unit that keeps it readable, rather than 0.0002 mL. */
function formatVolume(ml) {
  if (ml === undefined) return '—';
  if (ml < 1) return `${roundTo(ml * 1000, 3)} µL`;
  return `${roundTo(ml, 4)} mL`;
}

/**
 * The stock behind each substance, and what it puts into the vessel.
 *
 * One row per substance, because two drugs in one well come from two bottles
 * at two concentrations. The solvent column is the point of the table: a stock
 * carries its solvent along with the drug, and in a well that solvent is the
 * limit long before the drug is.
 */
export default function StockTable({
  stepLabel = 'Step 3 — Your stocks',
  solutes,
  stocks,
  onStocksChange,
  contributions,
  vessel,
  maxSolventPct,
  totalSolventPct,
  onBlur,
}) {
  const narrow = useMediaQuery(CARD_LAYOUT_BELOW);

  const setStock = (soluteId, patch) =>
    onStocksChange({ ...stocks, [soluteId]: { ...stocks[soluteId], ...patch } });

  const concentrationInput = (solute) => {
    const stock = stocks[solute.id] ?? {};
    const molar = toPositiveNumber(solute.molecularWeight) !== undefined;
    return (
      <Group gap={4} wrap="nowrap">
        <NumberInput
          placeholder="e.g. 10"
          min={0}
          decimalScale={6}
          value={stock.concentrationValue ?? ''}
          onChange={(value) => setStock(solute.id, { concentrationValue: value })}
          onBlur={onBlur}
          aria-label={`Stock concentration of ${soluteDisplayName(solute, 0)}`}
          hideControls
          w={90}
        />
        <LabSelect
          data={molar ? [...MASS_PER_ML_UNITS, ...MOLAR_CONCENTRATION_UNITS] : MASS_PER_ML_UNITS}
          value={stock.concentrationUnit ?? 'mg/ml'}
          onChange={(value) => setStock(solute.id, { concentrationUnit: value ?? 'mg/ml' })}
          onBlur={onBlur}
          aria-label={`Stock concentration unit for ${soluteDisplayName(solute, 0)}`}
          w={92}
        />
      </Group>
    );
  };

  const solventFields = (solute) => {
    const stock = stocks[solute.id] ?? {};
    return (
      <Group gap={4} wrap="nowrap">
        <LabSelect
          data={VEHICLE_OPTIONS}
          value={stock.solventId ?? 'dmso'}
          onChange={(value) => setStock(solute.id, { solventId: value ?? 'dmso' })}
          onBlur={onBlur}
          aria-label={`Stock solvent for ${soluteDisplayName(solute, 0)}`}
          searchable
          w={150}
        />
        <NumberInput
          min={0}
          max={100}
          decimalScale={2}
          value={stock.solventPercent ?? 100}
          onChange={(value) => setStock(solute.id, { solventPercent: value })}
          onBlur={onBlur}
          aria-label={`Percent of the ${soluteDisplayName(solute, 0)} stock that is solvent`}
          hideControls
          w={64}
        />
        <Text size="sm">%</Text>
      </Group>
    );
  };

  const addNode = (solute, i) => {
    const c = contributions[i];
    return (
      <AutoValue value={c?.stockMl}>
        <Text size="sm" fw={600} ff="monospace" c={c?.belowPipetteMinimum ? errorColor : undefined}>
          {formatVolume(c?.stockMl)}
        </Text>
      </AutoValue>
    );
  };

  const solventNode = (solute, i) => {
    const c = contributions[i];
    const over =
      maxSolventPct !== undefined && c?.solventPct !== undefined && c.solventPct > maxSolventPct;
    return (
      <AutoValue value={c?.solventPct}>
        <Text size="sm" fw={600} ff="monospace" c={over ? errorColor : undefined}>
          {c?.solventPct === undefined ? '—' : `${roundTo(c.solventPct, 4)}%`}
        </Text>
      </AutoValue>
    );
  };

  const issues = [];
  contributions.forEach((c, i) => {
    const name = soluteDisplayName(solutes[i], i);
    if (c.belowPipetteMinimum) {
      issues.push({
        level: 'error',
        message:
          `${name} needs ${formatVolume(c.stockMl)}, below what your pipette can deliver. ` +
          'Dilute the stock, or make an intermediate dilution and add more of that.',
      });
    }
    if (c.overVesselVolume) {
      issues.push({
        level: 'error',
        message:
          `${name} would need ${formatVolume(c.stockMl)}, more than the whole ${vessel.noun}. ` +
          'The stock is weaker than the concentration you are asking for — it cannot get there.',
      });
    }
  });
  if (
    maxSolventPct !== undefined &&
    totalSolventPct !== undefined &&
    totalSolventPct > maxSolventPct
  ) {
    issues.push({
      level: 'error',
      message:
        `The finished ${vessel.noun} is ${roundTo(totalSolventPct, 4)}% solvent, above the ` +
        `${maxSolventPct}% you set. Use a more concentrated stock so less of it goes in, or ` +
        'raise the limit if your preparation tolerates it.',
    });
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        What you are diluting from. The <strong>solvent</strong> column is the one to watch — a
        stock brings its solvent with it, and every substance adds to the same total.
      </Text>

      {narrow ? (
        <Stack gap="sm">
          {solutes.map((solute, i) => (
            <Paper key={solute.id} p="sm" radius="sm" withBorder>
              <Text fw={600} size="sm" mb="xs">
                {soluteDisplayName(solute, i)}
              </Text>
              <Text size="xs" c="dimmed" mb={2}>
                stock concentration
              </Text>
              {concentrationInput(solute)}
              <Text size="xs" c="dimmed" mt="xs" mb={2}>
                dissolved in
              </Text>
              {solventFields(solute)}
              <Divider my="xs" />
              <Group justify="space-between" wrap="wrap" gap="xs">
                <div>
                  <Text size="xs" c="dimmed">
                    add per {vessel.noun}
                  </Text>
                  {addNode(solute, i)}
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    solvent in {vessel.noun}
                  </Text>
                  {solventNode(solute, i)}
                </div>
              </Group>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th ta="left" miw={110}>SUBSTANCE</Table.Th>
                <Table.Th ta="left" w={195}>stock conc.</Table.Th>
                <Table.Th ta="left" w={235}>dissolved in</Table.Th>
                <Table.Th ta="left" w={110}>add per {vessel.noun}</Table.Th>
                <Table.Th ta="left" w={110}>solvent in {vessel.noun}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {solutes.map((solute, i) => (
                <Table.Tr key={solute.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {soluteDisplayName(solute, i)}
                    </Text>
                  </Table.Td>
                  <Table.Td>{concentrationInput(solute)}</Table.Td>
                  <Table.Td>{solventFields(solute)}</Table.Td>
                  <Table.Td>{addNode(solute, i)}</Table.Td>
                  <Table.Td>{solventNode(solute, i)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {totalSolventPct !== undefined && (
        <Text size="sm" mt="sm">
          Total solvent in the finished {vessel.noun}:{' '}
          <strong
            style={{
              color:
                maxSolventPct !== undefined && totalSolventPct > maxSolventPct
                  ? 'var(--mantine-color-red-7)'
                  : undefined,
            }}
          >
            {roundTo(totalSolventPct, 4)}% v/v
          </strong>
          {solutes.length > 1 &&
            ` — the sum of ${solutes.length} stocks, which no single row above shows.`}
          {stocks[solutes[0]?.id]?.solventId &&
            solutes.length === 1 &&
            ` ${getVehicle(stocks[solutes[0].id].solventId)?.label ?? ''}`}
        </Text>
      )}

      <IssueList issues={issues} />
    </Paper>
  );
}
