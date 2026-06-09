import { NumberInput, Paper, Table, Text } from '@mantine/core';
import { inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

export default function Step5VehicleRatioTable({
  vehicleRatioRows,
  vehicleVvPercents,
  scheduleOutputFeedback,
}) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        Step 5 — Vehicle ratio
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Enter ratio parts per solvent. %(v/v) is each part divided by the sum of parts (same as volume
        fraction of the vehicle). Max % is a placeholder (0) until recommended limits are added.
      </Text>

      <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th ta="left">SOLVENTS</Table.Th>
            <Table.Th ta="left" w={140}>
              ratio
            </Table.Th>
            <Table.Th ta="left" pl="xl" miw={100}>
              %(v/v)
            </Table.Th>
            <Table.Th ta="left" w={100}>
              max %
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {vehicleRatioRows.map((row) => (
            <Table.Tr key={row.ariaLabel}>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {row.label}
                </Text>
              </Table.Td>
              <Table.Td>
                <NumberInput
                  placeholder={row.placeholder}
                  min={0}
                  allowDecimal={false}
                  value={row.value}
                  onChange={row.onChange}
                  onBlur={scheduleOutputFeedback}
                  w="100%"
                  maw={140}
                  aria-label={row.ariaLabel}
                  hideControls
                  {...inputBlue}
                />
              </Table.Td>
              <Table.Td pl="xl">
                <Text size="sm" fw={500} c={vehicleVvPercents ? undefined : 'dimmed'}>
                  {vehicleVvPercents ? `${Number(vehicleVvPercents[row.rowIndex].toFixed(2))}%` : '—'}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  0
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed" mt="sm">
        Replace max % values with recommended limits.
      </Text>
    </Paper>
  );
}
