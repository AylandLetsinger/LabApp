import { Container, Text, Title } from '@mantine/core';
import DilutionCalculator from '../components/dilutions/DilutionCalculator';

/**
 * Dilutions.
 *
 * Before changing the form, read CLAUDE.md at the repo root — in particular
 * the rules on unit handling. The arithmetic and every unit rule are in
 * src/dilutions/computeDilution.js and are covered by tests; this page and the
 * components under src/components/dilutions are layout and presentation only.
 */
export default function Dilutions() {
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Dilutions
      </Title>
      <Text c="dimmed" mb="lg" className="no-print">
        C₁V₁ = C₂V₂. Fill in any three and the fourth is worked out, along with how much diluent to
        add and what fold the step is.
      </Text>
      <DilutionCalculator />
    </Container>
  );
}
