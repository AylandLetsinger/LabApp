import { Group, NumberInput } from '@mantine/core';
import LabSelect from '../LabSelect';
import { DOSE_UNITS, VOLUME_UNITS } from '../../constants/doseUnits';
import { mgToMassUnit, mlToVolumeUnit } from '../../dosage/unitConversions';
import { roundTo } from '../../dosage/numberUtils';

const outputGray = {
  variant: 'filled',
  color: 'gray',
  readOnly: true,
  styles: { input: { cursor: 'default' } },
};

/**
 * A calculated output with a unit the user can change.
 *
 * The value arriving here is always canonical — milligrams for mass,
 * millilitres for volume. Changing the unit only changes what is rendered;
 * it never feeds back into a calculation. That separation is the whole point
 * of this component.
 */
export default function DosageOutputRow({
  label,
  canonicalValue,
  kind,
  unit,
  onUnitChange,
  decimals = 4,
  rightSection = null,
}) {
  const units = kind === 'mass' ? DOSE_UNITS : VOLUME_UNITS;
  const converted =
    kind === 'mass' ? mgToMassUnit(canonicalValue, unit) : mlToVolumeUnit(canonicalValue, unit);

  const display = converted === undefined ? '' : roundTo(converted, decimals);

  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Group align="flex-end" wrap="wrap" gap="sm">
        <NumberInput
          label={label}
          placeholder="—"
          value={display}
          decimalScale={decimals}
          hideControls
          {...outputGray}
        />
        <LabSelect
          label="Unit"
          data={units}
          value={unit}
          onChange={(v) => onUnitChange(v ?? units[0].value)}
          w={96}
          aria-label={`${label} unit`}
        />
      </Group>
      {rightSection}
    </Group>
  );
}
