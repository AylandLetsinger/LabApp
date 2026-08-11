import { Group, NumberInput, Text } from '@mantine/core';
import { inputFieldColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * Extra to make, as a percentage.
 *
 * The percentage is not what anyone actually wants to know — spare doses are.
 * So it says how many the margin buys, in the unit the work is counted in.
 * At zero it carries the recommendation instead: advice as light text beats a
 * warning about a field nobody has reached yet.
 */
export default function WasteBufferField({
  wasteBufferPct,
  plannedCount,
  countNoun = 'dosages',
  setFieldValue,
  scheduleOutputFeedback,
}) {
  const planned = Number(plannedCount);
  const pct = Number(wasteBufferPct);
  const off = !Number.isFinite(pct) || pct <= 0;
  const spare =
    !off && Number.isFinite(planned) && planned > 0
      ? Math.floor(planned * (1 + pct / 100)) - planned
      : undefined;

  return (
    <Group align="flex-end" wrap="wrap" gap="sm">
      <NumberInput
        label="Waste buffer"
        placeholder="e.g. 10"
        min={0}
        max={100}
        decimalScale={2}
        value={wasteBufferPct}
        onChange={(value) => setFieldValue('wasteBufferPct', value)}
        onBlur={scheduleOutputFeedback}
        {...inputBlue}
      />
      <Text pb="sm" size="sm">
        %
      </Text>
      {off ? (
        <Text pb="sm" size="sm" c="dimmed">
          &rarr; 10% is recommended
        </Text>
      ) : (
        spare !== undefined && (
          <Text pb="sm" size="sm" c="dimmed">
            &rarr; enough for <strong>{planned + spare}</strong> {countNoun}, {spare} spare
          </Text>
        )
      )}
    </Group>
  );
}
