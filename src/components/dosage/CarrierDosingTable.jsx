import { Group, NumberInput, Paper, Table, Text } from '@mantine/core';
import IssueList from './IssueList';
import { computeMealwormDosingTable } from '../../dosage/computeMealwormOutputs';
import { roundTo } from '../../dosage/numberUtils';
import { errorColor, inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * Bench reference: the volume to load for each body weight, at one stock
 * concentration. Print it and keep it with the carriers.
 *
 * Only meaningful when dose scales with body mass — at a fixed absolute dose
 * every animal gets the same volume and the table would be a single number.
 */
export default function CarrierDosingTable({
  carrier,
  doseRateMgPerG,
  stockConcentrationMgPerMl,
  minBodyWeightG,
  maxBodyWeightG,
  stepG,
  capacityUl,
  loadFloorUl,
  setFieldValue,
  scheduleOutputFeedback,
  stepLabel = 'Step 5 — Dosing table by body mass',
  carrierName,
}) {
  const rows = computeMealwormDosingTable({
    doseRateMgPerG,
    stockConcentrationMgPerMl,
    minBodyWeightG,
    maxBodyWeightG,
    stepG,
    wormCapacityUl: capacityUl,
    syringeMinUl: loadFloorUl,
  });

  const carrierNoun = (carrierName ?? '').trim() || carrier.noun;
  const floorWord = carrier.usesSyringe ? 'syringe' : 'pipette';

  const issues = [];
  if (rows) {
    if (rows.some((r) => r.overCapacity)) {
      issues.push({
        level: 'error',
        message:
          `Some body weights need more volume than the ${carrierNoun} can hold. Use a more ` +
          'concentrated solution, or a larger portion.',
      });
    }
    if (rows.some((r) => r.belowSyringeMinimum)) {
      issues.push({
        level: 'error',
        message:
          `Some body weights need less volume than your ${floorWord} can deliver. Use a more ` +
          'dilute solution, so each dose is a larger volume.',
      });
    }
  }

  return (
    <Paper p="md" radius="md" withBorder className="allow-break">
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Volume to load into one {carrierNoun} for each body weight, at your stock concentration.
        Rows outside your capacity or {floorWord} range are flagged in red.
      </Text>

      <Group align="flex-end" wrap="wrap" gap="sm" mb="md">
        <NumberInput
          label="From"
          min={0}
          decimalScale={2}
          value={minBodyWeightG}
          onChange={(value) => setFieldValue('minBodyWeightG', value)}
          onBlur={scheduleOutputFeedback}
          w={110}
          {...inputBlue}
        />
        <NumberInput
          label="To"
          min={0}
          decimalScale={2}
          value={maxBodyWeightG}
          onChange={(value) => setFieldValue('maxBodyWeightG', value)}
          onBlur={scheduleOutputFeedback}
          w={110}
          {...inputBlue}
        />
        <NumberInput
          label="Step"
          min={0}
          decimalScale={2}
          value={stepG}
          onChange={(value) => setFieldValue('stepG', value)}
          onBlur={scheduleOutputFeedback}
          w={110}
          {...inputBlue}
        />
        <Text pb="sm" size="sm">
          grams
        </Text>
      </Group>

      {rows === null ? (
        <Text size="sm" c="dimmed">
          Enter a dose by body weight, a stock concentration, and a valid weight range to build the
          table. (A range needing more than 200 rows is refused — increase the step.)
        </Text>
      ) : (
        <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder withColumnBorders striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th ta="left">Body mass</Table.Th>
              <Table.Th ta="left">Dose</Table.Th>
              <Table.Th ta="left">{carrier.loadColumnLabel}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => {
              const flagged = row.overCapacity || row.belowSyringeMinimum;
              return (
                <Table.Tr key={row.bodyWeightG}>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {roundTo(row.bodyWeightG, 2)} g
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {roundTo(row.doseMg, 4)} mg
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={600} c={flagged ? errorColor : undefined}>
                      {roundTo(row.loadVolumeUl, 2)} µL
                      {row.overCapacity ? ' — over capacity' : ''}
                      {row.belowSyringeMinimum ? ` — below ${floorWord}` : ''}
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
