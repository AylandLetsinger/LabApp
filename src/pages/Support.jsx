import { Anchor, Container, List, Paper, Stack, Text, Title } from '@mantine/core';
import { LAB_WEBSITE, SUPPORT_LINK } from '../support';

/**
 * Who made this, and how to say thanks.
 *
 * Kept honest deliberately: the app is free, nothing is gated behind a
 * payment, and the page says what a contribution does and does not buy.
 */
export default function Support() {
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Support
      </Title>

      <Stack gap="lg">
        <Text>
          The Lab App is free, open source, and has no accounts, adverts or tracking. It is built
          and maintained by{' '}
          <Anchor href={LAB_WEBSITE} target="_blank" rel="noopener noreferrer">
            Ayland Letsinger
          </Anchor>{' '}
          alongside the research it was written for.
        </Text>

        <Paper p="md" radius="md" withBorder>
          <Title order={3} mb="sm">
            The most useful thing you can do
          </Title>
          <List spacing="xs" size="sm">
            <List.Item>
              <strong>Tell us when a number looks wrong.</strong> Every page has a “Send a note”
              button. A calculator nobody corrects is a calculator nobody should trust.
            </List.Item>
            <List.Item>
              <strong>Say what is missing.</strong> Most of what this app does exists because
              somebody described a job it could not do yet.
            </List.Item>
            <List.Item>
              <strong>Pass it on</strong> to anyone who is doing this arithmetic by hand.
            </List.Item>
          </List>
        </Paper>

        {SUPPORT_LINK && (
          <Paper p="md" radius="md" withBorder>
            <Title order={3} mb="sm">
              Buy us a coffee
            </Title>
            <Text size="sm" mb="sm">
              Nothing here is behind a paywall and nothing will be. If the app has saved you an
              afternoon and you would like to put something in the tin, it is appreciated and it
              changes nothing about what you get.
            </Text>
            <Anchor href={SUPPORT_LINK.url} target="_blank" rel="noopener noreferrer">
              {SUPPORT_LINK.label}
            </Anchor>
          </Paper>
        )}

        <Paper p="md" radius="md" withBorder>
          <Title order={3} mb="sm">
            The lab
          </Title>
          <Text size="sm">
            <Anchor href={LAB_WEBSITE} target="_blank" rel="noopener noreferrer">
              {LAB_WEBSITE}
            </Anchor>
          </Text>
        </Paper>
      </Stack>
    </Container>
  );
}
