import { useState } from 'react';
import { Button, Container, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import AntibodyDilution from '../components/reagents/AntibodyDilution';
import ViralMix from '../components/reagents/ViralMix';
import PrintActions from '../components/dosage/PrintActions';
import { navActiveColor } from '../theme';

const BLANK = {
  mode: 'antibody',
  // Antibody dilution
  fold: 500,
  sampleCount: '',
  volumePerSample: 500,
  volumePerSampleUnit: 'ul',
  workingVolume: '',
  workingVolumeUnit: 'ml',
  volumeMode: 'count',
  stockAvailable: '',
  stockAvailableUnit: 'ul',
  // Viral mixing
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
 * Antibodies, and the other things diluted from a small expensive tube.
 *
 * Two calculators share this page because the same person needs both, not
 * because they are the same arithmetic — see computeReagents.js. Before
 * changing either form, read CLAUDE.md at the repo root, particularly the
 * rules on unit handling. All the arithmetic is in src/reagents and is covered
 * by tests; the components under src/components/reagents are layout only.
 */
export default function Antibodies() {
  const [v, setV] = useState(BLANK);
  const [agents, setAgents] = useState(BLANK_AGENTS);
  const set = (key, value) => setV((prev) => ({ ...prev, [key]: value }));
  const reset = () => {
    setV((prev) => ({ ...BLANK, mode: prev.mode }));
    setAgents(BLANK_AGENTS);
  };

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Antibodies &amp; Mixes
      </Title>
      <Text c="dimmed" mb="lg" className="no-print">
        Diluting an antibody for staining or blotting, and mixing viral agents to a ratio.
      </Text>

      <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="lg">
        <SegmentedControl
          color={navActiveColor}
          value={v.mode}
          onChange={(value) => set('mode', value)}
          data={[
            { value: 'antibody', label: 'Antibody dilution' },
            { value: 'viral', label: 'Viral mix' },
          ]}
        />
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
        {v.mode === 'antibody' ? (
          <AntibodyDilution v={v} set={set} />
        ) : (
          <ViralMix v={v} set={set} agents={agents} setAgents={setAgents} />
        )}
        <PrintActions
          title={v.mode === 'antibody' ? 'antibody dilution calculator' : 'viral mix calculator'}
        />
      </Stack>
    </Container>
  );
}
