import { Container, Text, Title } from '@mantine/core';
import StockPlanCalculator from '../components/stock/StockPlanCalculator';

/**
 * Stock Solution.
 *
 * Before changing the form, read CLAUDE.md at the repo root. The arithmetic
 * and the reasoning behind the step count are in src/stock/computeStockPlan.js
 * and are covered by tests; this page and the components under
 * src/components/stock are layout and presentation only.
 */
export default function StockSolution() {
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Stock Solution
      </Title>
      <Text c="dimmed" mb="lg" className="no-print">
        Getting from a tube of powder to a working solution too dilute to weigh. Give it what you
        need at the end and what your balance and pipette can actually do, and it works out the
        stock to make and the steps down to it.
      </Text>
      <StockPlanCalculator />
    </Container>
  );
}
