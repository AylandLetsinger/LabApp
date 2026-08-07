import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import IssueList from './IssueList';
import AutoValue from './AutoValue';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import { inputFieldColor } from '../../theme';

const inputBlue = { variant: 'filled', color: inputFieldColor };

/**
 * A finished solution: nothing left to formulate.
 *
 * Dose and concentration fully determine the volume per subject, so it is an
 * output, not a choice. If that volume will not fit the worm or cannot be
 * measured, no ratio fixes it — the only remedy is a different solution, and
 * the message says so.
 */
export default function WorkingSolutionSection({
  stepLabel,
  concentrationMgPerMl,
  availableMl,
  dosePerSubjectMg,
  totalDoses,
  wasteBufferPct,
  syringeMinUl,
  maxVolumeUl,
  setFieldValue,
  scheduleOutputFeedback,
}) {
  const concentration = toPositiveNumber(concentrationMgPerMl);
  const volumePerDoseUl =
    dosePerSubjectMg !== undefined && concentration !== undefined
      ? (dosePerSubjectMg / concentration) * 1000
      : undefined;

  const doses = Number(totalDoses);
  const waste = Number(wasteBufferPct) || 0;
  const totalNeededMl =
    volumePerDoseUl !== undefined && Number.isFinite(doses) && doses > 0
      ? (volumePerDoseUl / 1000) * doses * (1 + waste / 100)
      : undefined;

  const have = toPositiveNumber(availableMl);

  const issues = [];
  if (volumePerDoseUl !== undefined) {
    if (syringeMinUl > 0 && volumePerDoseUl < syringeMinUl) {
      issues.push({
        level: 'error',
        message:
          `Each dose is ${roundTo(volumePerDoseUl, 2)} µL, below the ${roundTo(syringeMinUl, 2)} µL ` +
          'your syringe can measure. This solution is too concentrated for this dose — dilute it, ' +
          'or use a finer syringe.',
      });
    }
    if (Number.isFinite(maxVolumeUl) && maxVolumeUl > 0 && volumePerDoseUl > maxVolumeUl) {
      issues.push({
        level: 'error',
        message:
          `Each dose is ${roundTo(volumePerDoseUl, 2)} µL, more than the ${roundTo(maxVolumeUl, 2)} µL ` +
          'that fits. This solution is too dilute for this dose — make it stronger, or use a larger worm.',
      });
    }
  }
  if (have !== undefined && totalNeededMl !== undefined && totalNeededMl > have) {
    issues.push({
      level: 'error',
      message:
        `You need ${roundTo(totalNeededMl, 4)} mL but have ${roundTo(have, 4)} mL. ` +
        `Short by ${roundTo(totalNeededMl - have, 4)} mL.`,
    });
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        The solution already exists, so there is no vehicle to work out. Dose and concentration
        decide the volume per subject between them — it is not adjustable.
      </Text>

      <Stack gap="md">
        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Working concentration"
            placeholder="e.g. 4"
            min={0}
            decimalScale={6}
            value={concentrationMgPerMl}
            onChange={(value) => setFieldValue('workingConcentrationMgPerMl', value)}
            onBlur={scheduleOutputFeedback}
            w={200}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            mg per mL
          </Text>
          <NumberInput
            label="How much do you have?"
            placeholder="optional"
            min={0}
            decimalScale={4}
            value={availableMl}
            onChange={(value) => setFieldValue('workingAvailableMl', value)}
            onBlur={scheduleOutputFeedback}
            w={200}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            mL
          </Text>
        </Group>

        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">
              Volume per subject
            </Text>
            <AutoValue value={volumePerDoseUl}>
              <Text size="lg" fw={700} ff="monospace">
                {volumePerDoseUl === undefined ? '—' : `${roundTo(volumePerDoseUl, 2)} µL`}
              </Text>
            </AutoValue>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Total needed
            </Text>
            <AutoValue value={totalNeededMl}>
              <Text size="lg" fw={700} ff="monospace">
                {totalNeededMl === undefined ? '—' : `${roundTo(totalNeededMl, 4)} mL`}
              </Text>
            </AutoValue>
          </div>
          {have !== undefined && totalNeededMl !== undefined && (
            <div>
              <Text size="xs" c="dimmed">
                Left over
              </Text>
              <Text size="lg" fw={700} ff="monospace">
                {roundTo(Math.max(0, have - totalNeededMl), 4)} mL
              </Text>
            </div>
          )}
        </Group>
      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
