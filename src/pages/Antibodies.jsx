import { useState } from 'react';
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import AntibodyDilution from '../components/reagents/AntibodyDilution';
import PrintActions from '../components/dosage/PrintActions';

/**
 * A blank solution.
 *
 * 10 mL of one sample is the histology default: free-floating sections in a
 * well, a single jar. Ten samples of 1 mL is the same 10 mL, which is why
 * there is no third field offering to be told the volume directly.
 */
const blankMixture = (name) => ({
  name,
  sampleCount: 1,
  volumePerSample: 10,
  volumePerSampleUnit: 'ml',
  antibodies: [{ name: '', fold: 500, stock: '', stockUnit: 'ul' }],
});

/**
 * Primary and secondary, because that is the order they happen in and a
 * printed record should read like the bench did.
 */
const BLANK = [blankMixture('Primary'), blankMixture('Secondary')];

export default function Antibodies() {
  const [mixtures, setMixtures] = useState(BLANK);
  const reset = () => setMixtures(BLANK);

  const setMixture = (i, next) => setMixtures(mixtures.map((m, j) => (j === i ? next : m)));
  const addMixture = () => setMixtures([...mixtures, blankMixture('')]);
  const removeMixture = (i) => setMixtures(mixtures.filter((_, j) => j !== i));

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Antibodies
      </Title>
      <Text c="dimmed" mb="lg" className="no-print">
        A solution at a time, in the order they go on. Several antibodies can share one solution —
        they share its diluent too, which is the part that is easy to count twice by hand.
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
        {mixtures.map((m, i) => (
          <AntibodyDilution
            key={i}
            mixture={m}
            index={i}
            onChange={(next) => setMixture(i, next)}
            onRemove={() => removeMixture(i)}
            canRemove={mixtures.length > 1}
          />
        ))}

        <Group>
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconPlus size={14} />}
            onClick={addMixture}
            className="no-print"
          >
            Add solution
          </Button>
        </Group>

        <PrintActions title="antibody dilution calculator" />
      </Stack>
    </Container>
  );
}
