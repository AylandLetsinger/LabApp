import { useState } from 'react';
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import ViralMix from '../components/reagents/ViralMix';
import PrintActions from '../components/dosage/PrintActions';

const BLANK = {
  basis: 'copies',
  finalVolume: 10,
  finalVolumeUnit: 'ul',
  diluentVolume: '',
  diluentVolumeUnit: 'ul',
  injectionVolume: 500,
  injectionVolumeUnit: 'nl',
};

const BLANK_AGENTS = [
  { name: '', titer: '', titerUnit: 'e13', parts: '10' },
  { name: '', titer: '', titerUnit: 'e12', parts: '1' },
];

/**
 * Mixing viral agents to a ratio.
 *
 * Its own page rather than a mode on the antibody one: the two share a user
 * and nothing else. The arithmetic is in src/reagents/computeViralMix.js and
 * is covered by tests.
 */
export default function ViralMixes() {
  const [v, setV] = useState(BLANK);
  const [agents, setAgents] = useState(BLANK_AGENTS);
  const set = (key, value) => setV((prev) => ({ ...prev, [key]: value }));
  const reset = () => {
    setV(BLANK);
    setAgents(BLANK_AGENTS);
  };

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Viral Mixes
      </Title>
      <Text c="dimmed" mb="lg" className="no-print">
        Two or more viral agents to a ratio, in a fixed final volume — and how many injections that
        volume is worth. A ratio can mean copies or volumes, and with unequal titres those are
        different mixtures.
      </Text>

      <Group justify="flex-end" mb="md">
        <Button
          variant="subtle"
          size="compact-sm"
          color="gray"
          leftSection={<IconRefresh size={14} />}
          onClick={reset}
          className="no-print"
        >
          Reset
        </Button>
      </Group>

      <Stack gap="lg">
        <ViralMix v={v} set={set} agents={agents} setAgents={setAgents} />
        <PrintActions title="viral mix calculator" />
      </Stack>
    </Container>
  );
}
