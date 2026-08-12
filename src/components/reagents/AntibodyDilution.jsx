import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { VOLUME_UNITS } from '../../constants/doseUnits';
import { mlToVolumeUnit, volumeToMl } from '../../dosage/unitConversions';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import {
  antibodyDiluentMl,
  antibodyVolumeMl,
  workingVolumeMl,
} from '../../reagents/computeReagents';
import LabSelect from '../LabSelect';
import IssueList from '../dosage/IssueList';
import { inputFieldColor } from '../../theme';

const inputBlue = { variant: 'filled', color: inputFieldColor };

function volumeText(ml, unit) {
  const value = mlToVolumeUnit(ml, unit);
  if (value === undefined) return '—';
  return `${roundTo(value, 6)} ${VOLUME_UNITS.find((u) => u.value === unit)?.label ?? unit}`;
}

/**
 * Diluting an antibody for staining or blotting.
 *
 * The fold is the input rather than a concentration, because that is what a
 * datasheet gives you — an antibody's actual concentration is usually unknown
 * and often unknowable. And the working volume is reached by counting sections
 * or blots, because that is how anyone arrives at it in practice.
 */
export default function AntibodyDilution({ v, set }) {
  const perSampleMl = volumeToMl(v.volumePerSample, v.volumePerSampleUnit);
  const fromCount = workingVolumeMl(v.sampleCount, perSampleMl);
  const typedWorkingMl = volumeToMl(v.workingVolume, v.workingVolumeUnit);

  // Counting samples is the usual route, but a volume can be stated outright.
  const workingMl = v.volumeMode === 'count' ? fromCount : typedWorkingMl;

  const antibodyMl = antibodyVolumeMl(workingMl, v.fold);
  const diluentMl = antibodyDiluentMl(workingMl, antibodyMl);

  const haveMl = volumeToMl(v.stockAvailable, v.stockAvailableUnit);
  const issues = [];
  if (haveMl !== undefined && antibodyMl !== undefined && antibodyMl > haveMl) {
    issues.push({
      level: 'error',
      message:
        `This needs ${volumeText(antibodyMl, 'ul')} of antibody but you have ` +
        `${volumeText(haveMl, 'ul')} — short by ${volumeText(antibodyMl - haveMl, 'ul')}. ` +
        'Make less, or use a weaker dilution.',
    });
  }

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">
          How much do you need?
        </Text>

        <Stack gap="md">
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Dilution — 1 in"
              placeholder="e.g. 500"
              min={0}
              decimalScale={4}
              value={v.fold}
              onChange={(value) => set('fold', value)}
              w={200}
              {...inputBlue}
            />
            <Text pb="sm" size="sm" c="dimmed">
              {toPositiveNumber(v.fold) ? `→ written 1:${v.fold}` : '→ e.g. 1:500'}
            </Text>
          </Group>

          <div>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Samples"
                placeholder="sections, wells or blots"
                min={0}
                allowDecimal={false}
                value={v.sampleCount}
                onChange={(value) => {
                  set('sampleCount', value);
                  set('volumeMode', 'count');
                }}
                w={220}
                {...inputBlue}
              />
              <Text pb="sm" size="sm">
                ×
              </Text>
              <NumberInput
                label="Volume each"
                placeholder="e.g. 500"
                min={0}
                decimalScale={6}
                value={v.volumePerSample}
                onChange={(value) => {
                  set('volumePerSample', value);
                  set('volumeMode', 'count');
                }}
                w={160}
                {...inputBlue}
              />
              <LabSelect
                label="Unit"
                data={VOLUME_UNITS}
                value={v.volumePerSampleUnit}
                onChange={(value) => set('volumePerSampleUnit', value ?? 'ul')}
                w={100}
              />
              {fromCount !== undefined && (
                <Text pb="sm" size="sm" c="dimmed">
                  &rarr; <strong>{volumeText(fromCount, 'ml')}</strong> in total
                </Text>
              )}
            </Group>
            <Text size="xs" c="dimmed" mt={6} className="no-print">
              * or state the working volume directly below, if you already know it
            </Text>
          </div>

          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Working volume, directly"
              placeholder="optional"
              min={0}
              decimalScale={6}
              value={v.workingVolume}
              onChange={(value) => {
                set('workingVolume', value);
                set('volumeMode', 'direct');
              }}
              w={220}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={VOLUME_UNITS}
              value={v.workingVolumeUnit}
              onChange={(value) => set('workingVolumeUnit', value ?? 'ml')}
              w={100}
            />
            {v.volumeMode === 'direct' && (
              <Text pb="sm" size="sm" c="dimmed">
                &rarr; using this rather than the count above
              </Text>
            )}
          </Group>

          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Antibody you have"
              placeholder="optional"
              min={0}
              decimalScale={6}
              value={v.stockAvailable}
              onChange={(value) => set('stockAvailable', value)}
              w={220}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={VOLUME_UNITS}
              value={v.stockAvailableUnit}
              onChange={(value) => set('stockAvailableUnit', value ?? 'ul')}
              w={100}
            />
          </Group>
        </Stack>

        <IssueList issues={issues} />
      </Paper>

      {antibodyMl !== undefined && diluentMl !== undefined && (
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">
            At the bench
          </Text>
          <Text size="sm">
            Add <strong>{volumeText(antibodyMl, 'ul')}</strong> of antibody to{' '}
            <strong>{volumeText(diluentMl, 'ml')}</strong> of diluent, for{' '}
            <strong>{volumeText(workingMl, 'ml')}</strong> at <strong>1:{v.fold}</strong>.
          </Text>
          <Text size="xs" c="dimmed" mt={8} className="no-print">
            1:{v.fold} means one volume of antibody in {v.fold} of finished solution, which is the
            convention every datasheet uses.
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
