import { Card, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { CALCULATORS } from '../calculators';
import { DOSAGE_DELIVERY_METHODS } from '../dosageDeliveryMethods';

/**
 * One card per thing the app can do.
 *
 * The whole card is the link rather than a title inside it, because a card
 * that looks clickable and only is in one corner is a card people click twice.
 *
 * The cards carry a name and nothing else. The `blurb` in calculators.js and
 * dosageDeliveryMethods.js is deliberately left unread for now rather than
 * deleted — the descriptions are meant to come back.
 */
function FeatureCard({ to, label }) {
  return (
    <Card
      component={Link}
      to={to}
      p="md"
      radius="md"
      withBorder
      style={{ textDecoration: 'none', color: 'inherit', height: '100%' }}
    >
      <Text fw={600} size="sm">
        {label}
      </Text>
    </Card>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <Title order={2} size="h3" mb="md">
        {title}
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {children}
      </SimpleGrid>
    </div>
  );
}

export default function Home() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Section title="Calculators">
          {CALCULATORS.map(({ to, label }) => (
            <FeatureCard key={to} to={to} label={label} />
          ))}
        </Section>

        <Section title="Dosage">
          {DOSAGE_DELIVERY_METHODS.map(({ slug, label }) => (
            <FeatureCard key={slug} to={`/dosage/${slug}`} label={label} />
          ))}
        </Section>

        {/*
          Recipe Creator is still a stub. It used to sit under "And the rest"
          with an "in progress" badge; the section is now named for that state,
          so the badge would say the same thing twice.
        */}
        <Section title="In the works">
          <FeatureCard to="/recipes" label="Recipe Creator" />
        </Section>
      </Stack>
    </Container>
  );
}
