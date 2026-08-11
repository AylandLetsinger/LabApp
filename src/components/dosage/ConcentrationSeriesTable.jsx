import { Group, NumberInput, Paper, Table, Text } from '@mantine/core';
import IssueList from './IssueList';
import LabSelect from '../LabSelect';
import { MASS_PER_ML_UNITS } from '../../dosage/dosageTypes';
import { concentrationSeries } from '../../dosage/computeInVitro';
import {
  MOLAR_CONCENTRATION_UNITS,
  anyConcentrationToMgPerMl,
  isMolarConcentrationUnit,
  mgPerMlToMolarConcentration,
} from '../../dosage/molarUnits';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import { errorColor, inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/** mg/mL back into whichever unit the range was typed in. */
function fromMgPerMl(mgPerMl, unit, molecularWeight) {
  if (isMolarConcentrationUnit(unit)) {
    return mgPerMlToMolarConcentration(mgPerMl, unit, molecularWeight);
  }
  const perOne = anyConcentrationToMgPerMl(1, unit, molecularWeight);
  if (perOne === undefined || perOne === 0) return undefined;
  return mgPerMl / perOne;
}

function formatVolume(ml) {
  if (ml === undefined) return '—';
  if (ml < 1) return `${roundTo(ml * 1000, 3)} µL`;
  return `${roundTo(ml, 4)} mL`;
}

/**
 * The same vessel at a range of concentrations — a dose-response series.
 *
 * The in-vitro counterpart of the dosing table by body mass. That one scales
 * one rate across the animals you have; this scales one stock across the
 * concentrations you want, and says which of them the pipette or the solvent
 * limit rules out. Knowing that before the plate is seeded is the entire point.
 *
 * Only meaningful for a single substance: with two stocks the volume added at
 * each step depends on which one is being varied, and this table would have to
 * guess.
 */
export default function ConcentrationSeriesTable({
  stepLabel = 'Step 5 — Concentration series',
  solute,
  stock,
  finalVolumeMl,
  pipetteMinUl,
  maxSolventPct,
  fromValue,
  toValue,
  factor,
  unit,
  setFieldValue,
  scheduleOutputFeedback,
}) {
  const molecularWeight = solute?.molecularWeight;
  const stockMgPerMl = toPositiveNumber(
    anyConcentrationToMgPerMl(stock?.concentrationValue, stock?.concentrationUnit, molecularWeight),
  );
  const solventFraction = (toPositiveNumber(stock?.solventPercent) ?? 100) / 100;

  const rows = concentrationSeries({
    fromMgPerMl: anyConcentrationToMgPerMl(fromValue, unit, molecularWeight),
    toMgPerMl: anyConcentrationToMgPerMl(toValue, unit, molecularWeight),
    factor,
    stockMgPerMl,
    finalVolumeMl,
    solventFractionOfStock: solventFraction,
    pipetteMinMl: toPositiveNumber(pipetteMinUl) !== undefined ? pipetteMinUl / 1000 : 0,
    maxSolventPct,
  });

  const issues = [];
  if (rows) {
    if (rows.some((r) => r.belowPipetteMinimum)) {
      issues.push({
        level: 'error',
        message:
          'Some concentrations need less stock than your pipette can deliver. Make an ' +
          'intermediate dilution and add a larger volume of that instead.',
      });
    }
    if (rows.some((r) => r.overSolventLimit)) {
      issues.push({
        level: 'error',
        message:
          'Some concentrations put more solvent in than you said the preparation tolerates. ' +
          'A more concentrated stock fixes the whole series at once.',
      });
    }
    if (rows.some((r) => r.strongerThanStock)) {
      issues.push({
        level: 'error',
        message:
          'Some concentrations are above the stock itself, so no volume of it can reach them.',
      });
    }
  }

  const molarUnits = toPositiveNumber(molecularWeight)
    ? [...MASS_PER_ML_UNITS, ...MOLAR_CONCENTRATION_UNITS]
    : MASS_PER_ML_UNITS;

  return (
    <Paper p="md" radius="md" withBorder className="allow-break">
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Stock volume for each concentration in a dose-response range, from the same stock. Rows your
        pipette or your solvent limit rules out are flagged in red.
      </Text>

      <Group align="flex-end" wrap="wrap" gap="sm" mb="md">
        <NumberInput
          label="From"
          placeholder="e.g. 0.01"
          min={0}
          decimalScale={6}
          value={fromValue}
          onChange={(value) => setFieldValue('seriesFrom', value)}
          onBlur={scheduleOutputFeedback}
          w={120}
          {...inputBlue}
        />
        <NumberInput
          label="To"
          placeholder="e.g. 100"
          min={0}
          decimalScale={6}
          value={toValue}
          onChange={(value) => setFieldValue('seriesTo', value)}
          onBlur={scheduleOutputFeedback}
          w={120}
          {...inputBlue}
        />
        <LabSelect
          label="Unit"
          data={molarUnits}
          value={unit}
          onChange={(value) => setFieldValue('seriesUnit', value ?? 'mg/ml')}
          onBlur={scheduleOutputFeedback}
          w={110}
        />
        <NumberInput
          label="Step ×"
          placeholder="e.g. 10"
          min={0}
          decimalScale={4}
          value={factor}
          onChange={(value) => setFieldValue('seriesFactor', value)}
          onBlur={scheduleOutputFeedback}
          w={110}
          {...inputBlue}
        />
        <Text pb="sm" size="xs" c="dimmed" className="no-print">
          each step multiplies — 10 gives decades, 2 gives doubling
        </Text>
      </Group>

      {rows === null ? (
        <Text size="sm" c="dimmed">
          Enter a stock concentration, a vessel volume, and a range with a step above 1 to build the
          series. (A range needing more than 200 rows is refused — use a larger step.)
        </Text>
      ) : (
        <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder withColumnBorders striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th ta="left">Target</Table.Th>
              <Table.Th ta="left">Add stock</Table.Th>
              <Table.Th ta="left">Solvent</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => {
              const flagged = r.belowPipetteMinimum || r.overSolventLimit || r.strongerThanStock;
              const shown = fromMgPerMl(r.targetMgPerMl, unit, molecularWeight);
              return (
                <Table.Tr key={r.targetMgPerMl}>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {shown === undefined ? '—' : roundTo(shown, 6)}{' '}
                      {molarUnits.find((u) => u.value === unit)?.label ?? unit}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={600} c={flagged ? errorColor : undefined}>
                      {formatVolume(r.stockMl)}
                      {r.belowPipetteMinimum ? ' — below pipette' : ''}
                      {r.strongerThanStock ? ' — above the stock' : ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      ff="monospace"
                      c={r.overSolventLimit ? errorColor : undefined}
                    >
                      {r.solventPct === undefined ? '—' : `${roundTo(r.solventPct, 4)}%`}
                      {r.overSolventLimit ? ' — over limit' : ''}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      <IssueList issues={issues} />
    </Paper>
  );
}
