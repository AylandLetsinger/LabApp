import { Container, Text, Title } from '@mantine/core';

export default function Home() {
  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        Home
      </Title>
      <Text c="dimmed">Welcome to The Lab App. Use the navigation above to open a calculator.</Text>
    </Container>
  );
}
