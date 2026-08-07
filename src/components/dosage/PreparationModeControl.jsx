import { Radio, Stack, Text } from '@mantine/core';
import { PREPARATION_MODES } from '../../dosage/preparationModes';

/** Radio group for what the drug is starting as. See preparationModes.js. */
export default function PreparationModeControl({ value, onChange }) {
  return (
    <Stack gap={6} mt="lg">
      <Text size="sm" fw={500}>
        Do you have a stock or working solution?
      </Text>
      <Radio.Group value={value} onChange={onChange}>
        <Stack gap={6} mt={4}>
          <Radio
            value={PREPARATION_MODES.none}
            label="No — starting from powder"
            description="Work out the vehicle, the concentration to mix, and the recipe."
          />
          <Radio
            value={PREPARATION_MODES.stock}
            label="Stock solution"
            description="A concentrate to dilute. You will be asked what it is dissolved in."
          />
          <Radio
            value={PREPARATION_MODES.working}
            label="Working solution"
            description="Already at dosing concentration. Only the volume per dose is left to work out."
          />
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
