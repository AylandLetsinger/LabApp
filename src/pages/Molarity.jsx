import { Container, Text, Title } from '@mantine/core';
import MolarityCalculator from '../components/molarity/MolarityCalculator';

/**
 * Molarity.
 *
 * Before changing the form, read CLAUDE.md at the repo root — in particular
 * the rules on unit handling. The arithmetic is in src/molarity/computeMolarity.js
 * and is covered by tests; this page and the components under
 * src/components/molarity are layout, units and presentation only.
 */
export default function Molarity() {
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Molarity
      </Title>
      <Text c="dimmed" mb="lg" className="no-print">
        Mass, concentration, volume and molecular weight are one equation. Fill in any three and
        the fourth is worked out, with the arithmetic shown underneath.
      </Text>
      <MolarityCalculator />
    </Container>
  );
}
