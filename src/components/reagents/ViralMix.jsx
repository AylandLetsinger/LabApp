import { ActionIcon, Button, Group, NumberInput, Paper, SegmentedControl, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { VOLUME_UNITS } from '../../constants/doseUnits';
import { mlToVolumeUnit, volumeToMl } from '../../dosage/unitConversions';
import { roundTo } from '../../dosage/numberUtils';
import {
  TITER_UNITS,
  agentInMix,
  copiesPerInjection,
  copiesRatio,
  injectionsFrom,
  planFromTargetCopies,
  splitByRatio,
  titerPerMl,
} from '../../reagents/computeViralMix';
import LabSelect from '../LabSelect';
import IssueList from '../dosage/IssueList';
import { inputFieldColor, navActiveColor } from '../../theme';

const inputBlue = { variant: 'filled', color: inputFieldColor };

/** Copy counts are quoted as a mantissa and a power of ten, like titres. */
const COPY_EXPONENTS = [
  { value: '12', label: '×10¹²' },
  { value: '11', label: '×10¹¹' },
  { value: '10', label: '×10¹⁰' },
  { value: '9', label: '×10⁹' },
  { value: '8', label: '×10⁸' },
  { value: '7', label: '×10⁷' },
];

/** A copy count from its two halves; undefined until the mantissa is given. */
function copiesFrom(mantissa, exponent) {
  const n = Number(mantissa);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n * 10 ** Number(exponent ?? 9);
}

function volumeText(ml, unit = 'ul') {
  const value = mlToVolumeUnit(ml, unit);
  if (value === undefined) return '—';
  return `${roundTo(value, 6)} ${VOLUME_UNITS.find((u) => u.value === unit)?.label ?? unit}`;
}

/** Big numbers read better as a mantissa and a power of ten. */
function scientific(n) {
  if (!Number.isFinite(n) || n === 0) return '—';
  const exponent = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / 10 ** exponent;
  return `${roundTo(mantissa, 3)} × 10^${exponent}`;
}

/**
 * Mixing viruses to a ratio, in a fixed final volume.
 *
 * The whole point of the basis switch: "10:1 GCaMP to tdTomato" means two
 * different mixtures depending on whether the ten is volumes or genome copies,
 * and which one you get depends on the titres. At 1e13 against 1e12 a ten-fold
 * COPY ratio is equal volumes — the opposite of what a 10:1 volume split gives.
 * Choosing between them is the user's, and the page makes them choose.
 */
export default function ViralMix({ v, set, agents, setAgents }) {
  const setAgent = (index, patch) =>
    setAgents(agents.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const addAgent = () =>
    setAgents([...agents, { name: '', titer: '', titerUnit: 'e12', parts: '1' }]);
  const removeAgent = (index) => setAgents(agents.filter((_, i) => i !== index));

  const isTarget = v.basis === 'target';
  const finalMl = volumeToMl(v.finalVolume, v.finalVolumeUnit);
  const diluentMl = volumeToMl(v.diluentVolume, v.diluentVolumeUnit) ?? 0;
  const virusMl = finalMl === undefined ? undefined : finalMl - diluentMl;

  const resolved = agents.map((a) => ({
    titerPerMl: titerPerMl(a.titer, a.titerUnit),
    parts: a.parts,
    copiesPerInjection: copiesFrom(a.targetCopies, a.targetCopiesExp),
  }));

  /*
   * Two directions into the same mixture. A ratio splits whatever volume the
   * viruses are allowed; a target dose says how much of each is needed and the
   * diluent is whatever is left, which can be negative when the stocks are too
   * weak to reach the dose at all.
   */
  const targetPlan = isTarget
    ? planFromTargetCopies({
        agents: resolved,
        perInjectionMl: volumeToMl(v.injectionVolume, v.injectionVolumeUnit),
        finalVolumeMl: finalMl,
      })
    : undefined;

  const volumes = isTarget
    ? targetPlan?.volumesMl
    : splitByRatio({ agents: resolved, basis: v.basis, virusVolumeMl: virusMl });

  // In target mode the diluent is an output, not something the user sets.
  const effectiveDiluentMl = isTarget ? targetPlan?.diluentMl : diluentMl;

  const inMix = volumes
    ? volumes.map((volumeMl, i) =>
        agentInMix({ titerPerMl: resolved[i].titerPerMl, volumeMl, finalVolumeMl: finalMl }),
      )
    : agents.map(() => undefined);

  const perInjectionMl = volumeToMl(v.injectionVolume, v.injectionVolumeUnit);
  const injections = injectionsFrom(finalMl, perInjectionMl);
  const achieved = copiesRatio(inMix.map((m) => m?.copies));

  const issues = [];
  if (virusMl !== undefined && virusMl <= 0) {
    issues.push({
      level: 'error',
      message:
        'The diluent alone fills the final volume, leaving nothing for the viruses. Reduce the ' +
        'diluent, or make a larger volume.',
    });
  }
  /*
   * Working back from a dose can ask for more neat virus than the vial holds,
   * and the volumes still compute — they just do not add up to the mix. Left
   * unsaid, the page would print "take 5 uL and 50 uL for 10 uL in total".
   * No diluent fixes this: the stocks are too weak for that dose at that
   * injection volume.
   */
  if (isTarget && targetPlan?.overfull) {
    const needed = targetPlan.volumesMl.reduce((sum, x) => sum + x, 0);
    issues.push({
      level: 'error',
      message:
        `Reaching those doses needs ${volumeText(needed)} of neat agent, more than the ` +
        `${volumeText(finalMl)} being made. The stocks are too weak for this dose at this ` +
        'injection volume — inject a larger volume, or use more concentrated virus.',
    });
  }
  if (v.basis === 'copies' && resolved.some((r) => r.titerPerMl === undefined)) {
    issues.push({
      level: 'warning',
      message:
        'A ratio of genome copies needs every titre, since a part of a weak virus takes more ' +
        'volume than a part of a strong one. Fill them in, or switch the ratio to volumes.',
    });
  }

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">
          What are you mixing?
        </Text>

        <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <SegmentedControl
            size="xs"
            color={navActiveColor}
            value={v.basis}
            onChange={(value) => set('basis', value)}
            data={[
              { value: 'copies', label: 'Ratio of genome copies' },
              { value: 'volume', label: 'Ratio of volumes' },
              { value: 'target', label: 'Copies per injection' },
            ]}
          />
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            {isTarget
              ? '* say what each injection should deliver and the volumes follow — the ratio comes out rather than being chosen'
              : '* these are different mixtures. Ten times the copies of a virus that is ten times stronger means equal volumes; ten parts by volume of the same pair is a hundred to one in copies.'}
          </Text>
        </div>

        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th ta="left" miw={140}>AGENT</Table.Th>
                <Table.Th ta="left" w={210}>titre</Table.Th>
                <Table.Th ta="left" w={isTarget ? 190 : 90}>
                  {isTarget ? 'copies per injection' : 'parts'}
                </Table.Th>
                <Table.Th ta="left" w={110}>volume</Table.Th>
                <Table.Th ta="left" w={140}>in the mix</Table.Th>
                <Table.Th w={38} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {agents.map((a, i) => (
                <Table.Tr key={i}>
                  <Table.Td>
                    <TextInput
                      placeholder={i === 0 ? 'e.g. GCaMP' : 'e.g. tdTomato'}
                      value={a.name}
                      onChange={(e) => setAgent(i, { name: e.currentTarget.value })}
                      aria-label={`Name of agent ${i + 1}`}
                      {...inputBlue}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <NumberInput
                        placeholder="e.g. 1.2"
                        min={0}
                        decimalScale={6}
                        value={a.titer}
                        onChange={(value) => setAgent(i, { titer: value })}
                        aria-label={`Titre of agent ${i + 1}`}
                        hideControls
                        w={80}
                        {...inputBlue}
                      />
                      <LabSelect
                        data={TITER_UNITS}
                        value={a.titerUnit}
                        onChange={(value) => setAgent(i, { titerUnit: value ?? 'e12' })}
                        aria-label={`Titre unit for agent ${i + 1}`}
                        w={118}
                      />
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {isTarget ? (
                      <Group gap={4} wrap="nowrap">
                        <NumberInput
                          placeholder="e.g. 2.5"
                          min={0}
                          decimalScale={6}
                          value={a.targetCopies}
                          onChange={(value) => setAgent(i, { targetCopies: value })}
                          aria-label={`Copies per injection for agent ${i + 1}`}
                          hideControls
                          w={80}
                          {...inputBlue}
                        />
                        <LabSelect
                          data={COPY_EXPONENTS}
                          value={String(a.targetCopiesExp ?? 9)}
                          onChange={(value) => setAgent(i, { targetCopiesExp: value ?? '9' })}
                          aria-label={`Copies exponent for agent ${i + 1}`}
                          w={98}
                        />
                      </Group>
                    ) : (
                      <NumberInput
                        placeholder="1"
                        min={0}
                        decimalScale={4}
                        value={a.parts}
                        onChange={(value) => setAgent(i, { parts: value })}
                        aria-label={`Ratio parts for agent ${i + 1}`}
                        hideControls
                        {...inputBlue}
                      />
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600} ff="monospace">
                      {volumes ? volumeText(volumes[i]) : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {inMix[i] ? `${scientific(inMix[i].finalTiterPerMl)}/mL` : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={`Remove agent ${i + 1}`}
                      onClick={() => removeAgent(i)}
                      disabled={agents.length <= 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconPlus size={14} />}
          mt="sm"
          onClick={addAgent}
        >
          Add agent
        </Button>

        <Stack gap="md" mt="md">
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Final volume"
              placeholder="e.g. 10"
              min={0}
              decimalScale={6}
              value={v.finalVolume}
              onChange={(value) => set('finalVolume', value)}
              w={180}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={VOLUME_UNITS}
              value={v.finalVolumeUnit}
              onChange={(value) => set('finalVolumeUnit', value ?? 'ul')}
              w={100}
            />
            {/*
              Only an input when a ratio is driving the split. Working back
              from a dose, the diluent is whatever the viruses did not take,
              so asking for it would be asking for an answer.
            */}
            {!isTarget && (
              <>
                <NumberInput
                  label="Diluent to make up with"
                  placeholder="0"
                  min={0}
                  decimalScale={6}
                  value={v.diluentVolume}
                  onChange={(value) => set('diluentVolume', value)}
                  w={200}
                  {...inputBlue}
                />
                <LabSelect
                  label="Unit"
                  data={VOLUME_UNITS}
                  value={v.diluentVolumeUnit}
                  onChange={(value) => set('diluentVolumeUnit', value ?? 'ul')}
                  w={100}
                />
              </>
            )}
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            {isTarget
              ? '* the diluent is whatever is left once each agent has taken what the dose needs'
              : '* saline or PBS, counted inside the final volume above — leave it blank to mix the agents neat'}
          </Text>

          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Injection volume per subject"
              placeholder="e.g. 500"
              min={0}
              decimalScale={6}
              value={v.injectionVolume}
              onChange={(value) => set('injectionVolume', value)}
              w={250}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={VOLUME_UNITS}
              value={v.injectionVolumeUnit}
              onChange={(value) => set('injectionVolumeUnit', value ?? 'nl')}
              w={100}
            />
            {injections && (
              <Text pb="sm" size="sm" c="dimmed">
                &rarr; <strong>{injections.injections}</strong> injections
                {injections.leftoverMl > 1e-12 && `, ${volumeText(injections.leftoverMl)} left`}
              </Text>
            )}
          </Group>
        </Stack>

        <IssueList issues={issues} />
      </Paper>

      {volumes && (
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">
            At the bench
          </Text>
          <Stack gap={4}>
            {agents.map((a, i) => (
              <Text key={i} size="sm">
                {i === 0 ? 'Take' : 'and'}{' '}
                <strong>{volumeText(volumes[i])}</strong> of{' '}
                {a.name?.trim() || `agent ${i + 1}`}
              </Text>
            ))}
            {effectiveDiluentMl > 0 && (
              <Text size="sm">
                and <strong>{volumeText(effectiveDiluentMl)}</strong> of diluent
              </Text>
            )}
            <Text size="sm" fw={600} mt={4}>
              for {volumeText(finalMl)} in total.
            </Text>
          </Stack>

          {achieved && (
            <Text size="sm" mt="sm">
              Genome copies in the mix come out at{' '}
              <strong>{achieved.map((r) => roundTo(r, 3)).join(' : ')}</strong>
              {v.basis === 'volume' && ' — which is not the volume ratio, because the titres differ.'}
            </Text>
          )}

          {perInjectionMl !== undefined && (
            <Stack gap={2} mt="sm">
              <Text size="sm" fw={600}>
                Each {volumeText(perInjectionMl)} injection delivers
              </Text>
              {agents.map((a, i) => (
                <Text key={i} size="sm">
                  {a.name?.trim() || `agent ${i + 1}`}:{' '}
                  <strong>
                    {inMix[i]
                      ? scientific(copiesPerInjection(inMix[i].finalTiterPerMl, perInjectionMl))
                      : '—'}
                  </strong>{' '}
                  copies
                </Text>
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
}
