import { Group, NumberInput, SegmentedControl, Text } from '@mantine/core';
import { MOUSE_WEIGHT_HINT, WEIGHT_UNITS } from '../../constants/doseUnits';
import LabSelect from '../LabSelect';
import { inputFieldColor, navActiveColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * Body mass, entered as an average or as a weighed total.
 *
 * A total is exact when every subject went on the balance, and dividing it by
 * hand is one more place for a decimal to move. Both routes produce the same
 * single number for everything downstream — the conversion happens in the form,
 * not as a second code path.
 *
 * Shared by every delivery method: what a subject weighs does not depend on how
 * the drug reaches it.
 */
export default function BodyMassFields({
  bodyMassMode,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalBodyMass,
  subjectCount,
  derivedAverage,
  setFieldValue,
  scheduleOutputFeedback,
}) {
  return (
    <div>
      <SegmentedControl
        size="xs"
        color={navActiveColor}
        value={bodyMassMode}
        onChange={(value) => {
          setFieldValue('bodyMassMode', value);
          scheduleOutputFeedback();
        }}
        data={[
          { value: 'average', label: 'Average body mass' },
          { value: 'total', label: 'Total body mass' },
        ]}
        mb={8}
      />
      {bodyMassMode === 'total' ? (
        <>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Total body mass, all subjects"
              placeholder="e.g. 900"
              min={0}
              decimalScale={6}
              value={totalBodyMass}
              onChange={(value) => setFieldValue('totalBodyMass', value)}
              onBlur={scheduleOutputFeedback}
              w={200}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={WEIGHT_UNITS}
              value={avgBodyWeightUnit}
              onChange={(value) => setFieldValue('avgBodyWeightUnit', value ?? 'g')}
              onBlur={scheduleOutputFeedback}
              w={100}
            />
            <NumberInput
              label="across how many subjects?"
              placeholder="e.g. 40"
              min={0}
              allowDecimal={false}
              value={subjectCount}
              onChange={(value) => setFieldValue('subjectCount', value)}
              onBlur={scheduleOutputFeedback}
              w={190}
              {...inputBlue}
            />
            {derivedAverage !== undefined && (
              <Text pb="sm" size="sm" c="dimmed">
                &rarr; <strong>{derivedAverage}</strong> {avgBodyWeightUnit} each
              </Text>
            )}
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * exact if you weighed every subject; the average is worked out for you
          </Text>
        </>
      ) : (
        <>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Average body mass per subject"
              placeholder="e.g. 25"
              min={0}
              decimalScale={6}
              value={avgBodyWeight}
              onChange={(value) => setFieldValue('avgBodyWeight', value)}
              onBlur={scheduleOutputFeedback}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={WEIGHT_UNITS}
              value={avgBodyWeightUnit}
              onChange={(value) => setFieldValue('avgBodyWeightUnit', value ?? 'g')}
              onBlur={scheduleOutputFeedback}
              w={100}
            />
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            {MOUSE_WEIGHT_HINT}
          </Text>
        </>
      )}
    </div>
  );
}
