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
  splitByRatio,
  titerPerMl,
} from '../../reagents/computeViralMix';
import LabSelect from '../LabSelect';
import IssueList from '../dosage/IssueList';
import { inputFieldColor, navActiveColor } from '../../theme';

const inputBlue = { variant: 'filled', color: inputFieldColor };

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

  const finalMl = volumeToMl(v.finalVolume, v.finalVolumeUnit);
  const diluentMl = volumeToMl(v.diluentVolume, v.diluentVolumeUnit) ?? 0;
  const virusMl = finalMl === undefined ? undefined : finalMl - diluentMl;

  const resolved = agents.map((a) => ({
    titerPerMl: titerPerMl(a.titer, a.titerUnit),
    parts: a.parts,
  }));

  const volumes = splitByRatio({ agents: resolved, basis: v.basis, virusVolumeMl: virusMl });

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
            ]}
          />
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * these are different mixtures. Ten times the copies of a virus that is ten times
            stronger means equal volumes; ten parts by volume of the same pair is a hundred to one
            in copies.
          </Text>
        </div>

        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="sm" horizontalSpacing="sm" withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th ta="left" miw={140}>AGENT</Table.Th>
                <Table.Th ta="left" w={210}>titre</Table.Th>
                <Table.Th ta="left" w={90}>parts</Table.Th>
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
            <NumberInput
              label="of which diluent"
              placeholder="optional"
              min={0}
              decimalScale={6}
              value={v.diluentVolume}
              onChange={(value) => set('diluentVolume', value)}
              w={170}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={VOLUME_UNITS}
              value={v.diluentVolumeUnit}
              onChange={(value) => set('diluentVolumeUnit', value ?? 'ul')}
              w={100}
            />
          </Group>

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
            {diluentMl > 0 && (
              <Text size="sm">
                and <strong>{volumeText(diluentMl)}</strong> of diluent
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
