import { Group, NumberInput, Paper, Table, Text } from '@mantine/core';
import { doseAcrossIntakes } from '../../dosage/computeDrinkingFluid';
import { roundTo } from '../../dosage/numberUtils';
import { inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/** How far from target a row is, as a colour. */
function driftColour(percent) {
  if (percent === undefined) return undefined;
  const drift = Math.abs(percent - 100);
  if (drift > 30) return 'var(--mantine-color-red-7)';
  if (drift > 10) return 'var(--mantine-color-orange-7)';
  return undefined;
}

/**
 * What the dose becomes if they drink more or less than you assumed.
 *
 * The most honest output on the page. Every figure above it rests on one
 * measured intake, and that intake is the least controlled quantity in the
 * whole app — so this shows the dose across the range the animals might
 * actually drink, rather than presenting a single number as if it were
 * administered.
 *
 * It is the counterpart of the dosing table by body mass: same idea, applied
 * to the variable that actually moves here.
 */
export default function IntakeSensitivityTable({
  stepLabel = 'Step 5 — If they drink more or less',
  concentrationMgPerMl,
  bodyWeightKg,
  targetMgPerKgPerDay,
  referenceIntakeMlPerDay,
  fromMlPerDay,
  toMlPerDay,
  stepMlPerDay,
  setFieldValue,
  scheduleOutputFeedback,
}) {
  const rows = doseAcrossIntakes({
    fromMlPerDay,
    toMlPerDay,
    stepMlPerDay,
    concentrationMgPerMl,
    bodyWeightKg,
    targetMgPerKgPerDay,
  });

  return (
    <Paper p="md" radius="md" withBorder className="allow-break">
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Everything above rests on one intake figure. This is what the delivered dose becomes across
        the range your animals might actually drink — the row matching your figure is marked.
      </Text>

      <Group align="flex-end" wrap="wrap" gap="sm" mb="md">
        <NumberInput
          label="From"
          placeholder="e.g. 3"
          min={0}
          decimalScale={4}
          value={fromMlPerDay}
          onChange={(v) => setFieldValue('intakeFrom', v)}
          onBlur={scheduleOutputFeedback}
          w={110}
          {...inputBlue}
        />
        <NumberInput
          label="To"
          placeholder="e.g. 7"
          min={0}
          decimalScale={4}
          value={toMlPerDay}
          onChange={(v) => setFieldValue('intakeTo', v)}
          onBlur={scheduleOutputFeedback}
          w={110}
          {...inputBlue}
        />
        <NumberInput
          label="Step"
          placeholder="e.g. 0.5"
          min={0}
          decimalScale={4}
          value={stepMlPerDay}
          onChange={(v) => setFieldValue('intakeStep', v)}
          onBlur={scheduleOutputFeedback}
          w={110}
          {...inputBlue}
        />
        <Text pb="sm" size="sm">
          mL per day
        </Text>
      </Group>

      {rows === null ? (
        <Text size="sm" c="dimmed">
          Enter a range and a step to see how far the dose moves. (A range needing more than 200
          rows is refused — use a larger step.)
        </Text>
      ) : (
        <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder withColumnBorders striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th ta="left">Drinks</Table.Th>
              <Table.Th ta="left">Dose</Table.Th>
              <Table.Th ta="left">Rate</Table.Th>
              <Table.Th ta="left">Of target</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => {
              const isReference =
                referenceIntakeMlPerDay !== undefined &&
                Math.abs(r.intakeMlPerDay - referenceIntakeMlPerDay) < 1e-9;
              const colour = driftColour(r.percentOfTarget);
              return (
                <Table.Tr key={r.intakeMlPerDay}>
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={isReference ? 700 : 400}>
                      {roundTo(r.intakeMlPerDay, 4)} mL{isReference ? '  ← yours' : ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {r.mgPerDay === undefined ? '—' : `${roundTo(r.mgPerDay * 1000, 3)} µg/day`}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={600} c={colour}>
                      {r.mgPerKgPerDay === undefined
                        ? '—'
                        : `${roundTo(r.mgPerKgPerDay, 4)} mg/kg/day`}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" c={colour}>
                      {r.percentOfTarget === undefined ? '—' : `${roundTo(r.percentOfTarget, 1)}%`}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}
