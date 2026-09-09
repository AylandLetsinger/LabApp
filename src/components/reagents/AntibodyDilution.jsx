import {
  ActionIcon,
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { VOLUME_UNITS } from '../../constants/doseUnits';
import { volumeToMl } from '../../dosage/unitConversions';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import {
  antibodyVolumeMl,
  maxWorkingVolumeMl,
  mixtureDiluentMl,
  workingVolumeMl,
} from '../../reagents/computeAntibody';
import LabSelect from '../LabSelect';
import IssueList from '../dosage/IssueList';
import { inputFieldColor } from '../../theme';

const inputBlue = { variant: 'filled', color: inputFieldColor };

/** Microlitres for the small volumes, millilitres once it stops being silly. */
function auto(ml) {
  if (ml === undefined || !Number.isFinite(ml)) return '—';
  if (Math.abs(ml) < 1) return `${roundTo(ml * 1000, 4)} µL`;
  return `${roundTo(ml, 4)} mL`;
}

/**
 * One named solution — a primary or a secondary — and the antibodies in it.
 *
 * Several antibodies share one volume of diluent, which is the reason this is
 * a mixture rather than a row: working them out one at a time and adding up by
 * hand is the step where the diluent gets counted twice.
 *
 * Each is its own step so that a printed record reads as the order things were
 * actually done in.
 */
export default function AntibodyDilution({ mixture, index, onChange, onRemove, canRemove }) {
  const setField = (key, value) => onChange({ ...mixture, [key]: value });
  const setAntibody = (i, patch) =>
    onChange({
      ...mixture,
      antibodies: mixture.antibodies.map((a, j) => (j === i ? { ...a, ...patch } : a)),
    });
  const addAntibody = () =>
    onChange({
      ...mixture,
      antibodies: [...mixture.antibodies, { name: '', fold: 500, stock: '', stockUnit: 'ul' }],
    });
  const removeAntibody = (i) =>
    onChange({ ...mixture, antibodies: mixture.antibodies.filter((_, j) => j !== i) });

  const perSampleMl = volumeToMl(mixture.volumePerSample, mixture.volumePerSampleUnit);
  const workingMl = workingVolumeMl(mixture.sampleCount, perSampleMl);

  const volumes = mixture.antibodies.map((a) => antibodyVolumeMl(workingMl, a.fold));
  const diluent = mixtureDiluentMl(workingMl, volumes);

  const issues = [];
  if (diluent?.overfull) {
    issues.push({
      level: 'error',
      message:
        `The antibodies alone come to ${auto(workingMl - diluent.diluentMl)}, more than the ` +
        `${auto(workingMl)} of solution being made. Use a weaker dilution, or make more.`,
    });
  }

  const title = mixture.name?.trim() || `Solution ${index + 1}`;

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm" mb="md">
        <TextInput
          label="This solution is"
          placeholder="e.g. Primary"
          value={mixture.name}
          onChange={(e) => setField('name', e.currentTarget.value)}
          w={220}
          {...inputBlue}
        />
        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Samples"
            placeholder="sections, wells or blots"
            min={0}
            allowDecimal={false}
            value={mixture.sampleCount}
            onChange={(value) => setField('sampleCount', value)}
            w={150}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            ×
          </Text>
          <NumberInput
            label="Volume each"
            placeholder="e.g. 10"
            min={0}
            decimalScale={6}
            value={mixture.volumePerSample}
            onChange={(value) => setField('volumePerSample', value)}
            w={140}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={VOLUME_UNITS}
            value={mixture.volumePerSampleUnit}
            onChange={(value) => setField('volumePerSampleUnit', value ?? 'ml')}
            w={100}
          />
          {workingMl !== undefined && (
            <Text pb="sm" size="sm" c="dimmed">
              &rarr; <strong>{auto(workingMl)}</strong> to make
            </Text>
          )}
        </Group>
        {canRemove && (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Remove ${title}`}
            onClick={onRemove}
            mb={6}
          >
            <IconTrash size={16} />
          </ActionIcon>
        )}
      </Group>

      <Divider mb="md" />

      <Stack gap="sm">
        {mixture.antibodies.map((a, i) => {
          const stockMl = volumeToMl(a.stock, a.stockUnit);
          const couldMake = maxWorkingVolumeMl(stockMl, a.fold);
          return (
            <Group key={i} align="flex-end" wrap="wrap" gap="sm">
              <TextInput
                label={i === 0 ? 'Antibody' : undefined}
                placeholder="e.g. Ki-67"
                value={a.name}
                onChange={(e) => setAntibody(i, { name: e.currentTarget.value })}
                aria-label={`Name of antibody ${i + 1} in ${title}`}
                w={180}
                {...inputBlue}
              />
              <NumberInput
                label={i === 0 ? 'Dilution — 1 in' : undefined}
                placeholder="e.g. 500"
                min={0}
                decimalScale={4}
                value={a.fold}
                onChange={(value) => setAntibody(i, { fold: value })}
                aria-label={`Dilution of antibody ${i + 1} in ${title}`}
                w={140}
                {...inputBlue}
              />
              <div style={{ minWidth: 110 }}>
                {i === 0 && (
                  <Text size="xs" c="dimmed" mb={2}>
                    add
                  </Text>
                )}
                <Text size="sm" fw={700} ff="monospace" pb={6}>
                  {auto(volumes[i])}
                </Text>
              </div>
              <NumberInput
                label={i === 0 ? 'You have' : undefined}
                placeholder="optional"
                min={0}
                decimalScale={6}
                value={a.stock}
                onChange={(value) => setAntibody(i, { stock: value })}
                aria-label={`Stock of antibody ${i + 1} in ${title}`}
                w={120}
                {...inputBlue}
              />
              <LabSelect
                data={VOLUME_UNITS}
                value={a.stockUnit}
                onChange={(value) => setAntibody(i, { stockUnit: value ?? 'ul' })}
                aria-label={`Stock unit for antibody ${i + 1} in ${title}`}
                w={90}
              />
              {/*
                The useful direction of "how much do I have": what the tube is
                worth at this dilution, rather than whether one plan fits.
              */}
              {couldMake !== undefined && (
                <Text pb="sm" size="sm" c="dimmed">
                  &rarr; enough for <strong>{auto(couldMake)}</strong>
                </Text>
              )}
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Remove antibody ${i + 1} from ${title}`}
                onClick={() => removeAntibody(i)}
                disabled={mixture.antibodies.length <= 1}
                mb={6}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          );
        })}
      </Stack>

      <Button
        variant="subtle"
        size="compact-sm"
        leftSection={<IconPlus size={14} />}
        mt="sm"
        onClick={addAntibody}
      >
        Add antibody
      </Button>

      {diluent && !diluent.overfull && (
        <Paper p="sm" radius="sm" mt="md" withBorder>
          <Text size="sm">
            For <strong>{title}</strong>, add{' '}
            {mixture.antibodies.map((a, i) => (
              <span key={i}>
                {i > 0 && (i === mixture.antibodies.length - 1 ? ' and ' : ', ')}
                <strong>{auto(volumes[i])}</strong> of {a.name?.trim() || `antibody ${i + 1}`}
                {toPositiveNumber(a.fold) ? ` (1:${a.fold})` : ''}
              </span>
            ))}{' '}
            to <strong>{auto(diluent.diluentMl)}</strong> of diluent, for{' '}
            <strong>{auto(workingMl)}</strong> in total.
          </Text>
        </Paper>
      )}

      <IssueList issues={issues} />
    </Paper>
  );
}
