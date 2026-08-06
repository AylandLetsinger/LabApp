import { Container, Text, Title } from '@mantine/core';

/**
 * Scientific recipe creator.
 *
 * Starting point for this section. Before building the form, read CLAUDE.md
 * at the repo root — in particular the rules on unit handling and on never
 * inventing a safety number. Several pieces are already built and meant to be
 * reused rather than rewritten:
 *
 *   src/dosage/unitConversions.js          all unit maths
 *   src/dosage/numberUtils.js              parsing and sign guards
 *   src/components/dosage/DosageOutputRow  output value with a unit selector
 *   src/components/dosage/IssueList        errors and warnings
 *   src/hooks/useOutputFeedback            the "updating -> updated" state
 */
export default function Recipes() {
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Recipes
      </Title>
      <Text c="dimmed">Scientific recipe creator — content coming soon.</Text>
    </Container>
  );
}
