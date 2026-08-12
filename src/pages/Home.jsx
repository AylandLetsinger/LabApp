import { Badge, Card, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { CALCULATORS } from '../calculators';
import { DOSAGE_DELIVERY_METHODS } from '../dosageDeliveryMethods';

/**
 * One card per thing the app can do.
 *
 * The whole card is the link rather than a title inside it, because a card
 * that looks clickable and only is in one corner is a card people click twice.
 */
function FeatureCard({ to, label, blurb, badge }) {
  return (
    <Card
      component={Link}
      to={to}
      p="md"
      radius="md"
      withBorder
      style={{ textDecoration: 'none', color: 'inherit', height: '100%' }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs" mb={6}>
        <Text fw={600} size="sm">
          {label}
        </Text>
        {badge && (
          <Badge size="xs" variant="light" color="gray">
            {badge}
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed">
        {blurb}
      </Text>
    </Card>
  );
}

function Section({ title, description, children }) {
  return (
    <div>
      <Title order={2} size="h3" mb={4}>
        {title}
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        {description}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {children}
      </SimpleGrid>
    </div>
  );
}

export default function Home() {
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="xs">
        The Lab App
      </Title>
      <Text c="dimmed" mb="xl">
        Laboratory arithmetic, done once and shown working. Everything runs in your browser, every
        page prints as a bench sheet, and nothing you type is sent anywhere.
      </Text>

      <Stack gap="xl">
        <Section
          title="Dosage"
          description="Getting a known dose into a subject, by whichever route you use."
        >
          {DOSAGE_DELIVERY_METHODS.map(({ slug, label, blurb }) => (
            <FeatureCard key={slug} to={`/dosage/${slug}`} label={label} blurb={blurb} />
          ))}
        </Section>

        <Section
          title="Calculators"
          description="The arithmetic that comes up whatever you are dosing, or when you are not."
        >
          {CALCULATORS.map(({ to, label, blurb }) => (
            <FeatureCard key={to} to={to} label={label} blurb={blurb} />
          ))}
        </Section>

        <Section title="And the rest" description="Everything that is not a calculator.">
          {/*
            Recipe Creator is still a stub. Showing it as though it were
            finished would waste somebody's click and their trust; the badge
            costs nothing and says so.
          */}
          <FeatureCard
            to="/recipes"
            label="Recipe Creator"
            blurb="Scientific recipes, built the same way as everything else here."
            badge="in progress"
          />
          <FeatureCard
            to="/about"
            label="About"
            blurb="What this is, who wrote it, and how to ask for something."
          />
          <FeatureCard
            to="/support"
            label="Support"
            blurb="What the site does and does not send, and how to say thanks."
          />
        </Section>
      </Stack>
    </Container>
  );
}
