import { useState } from 'react';
import { Alert, Button, Container, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { primaryActionColor } from '../theme';

export default function About() {
  const [stubSubmitted, setStubSubmitted] = useState(false);

  const feedbackForm = useForm({
    initialValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  return (
    <Container size="md" py="xl">
      <Stack gap="lg" ta="left">
        <div>
          <Title order={1} mb="md">
            Welcome to The Lab App!
          </Title>
          <Text>
            The Lab App is a research tool that allows you to perform common laboratory calculations.
            The Lab App is open-source and coded by Ayland Letsinger and Sarah Little-Letsinger. We are
            always working on expanding the capabilities of the app – and we&apos;re happy to take
            requests!
          </Text>
        </div>

        <div>
          <Title order={2} mb="sm">
            What can The Lab App do?
          </Title>
          <Text>
            Use the navigation menu above to access the various calculators! At present, the app can
            help you calculate dosages, solution molarity, dilutions, and antibodies concentrations.
          </Text>
        </div>

        <div>
          <Title order={2} mb="sm">
            Have feedback or requests for The Lab App?
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            Send a note below. This form is not wired to a server yet — hook up your endpoint when
            ready.
          </Text>

          {stubSubmitted && (
            <Alert
              color={primaryActionColor}
              title="Thanks for your feedback"
              mb="md"
              withCloseButton
              onClose={() => setStubSubmitted(false)}
            >
              Your message wasn&apos;t sent anywhere (stub). Replace the submit handler to connect an
              API or email service.
            </Alert>
          )}

          <form
            id="feedback-form"
            onSubmit={feedbackForm.onSubmit(() => {
              setStubSubmitted(true);
              feedbackForm.reset();
            })}
          >
            <Stack gap="sm" maw={480}>
              <TextInput label="Name" placeholder="Your name" {...feedbackForm.getInputProps('name')} />
              <TextInput
                label="Email"
                placeholder="you@example.com"
                type="email"
                {...feedbackForm.getInputProps('email')}
              />
              <Textarea
                label="Message"
                placeholder="Feedback, feature requests, or questions"
                minRows={4}
                autosize
                maxRows={12}
                {...feedbackForm.getInputProps('message')}
              />
              <Button type="submit" variant="filled" w="fit-content">
                Send
              </Button>
            </Stack>
          </form>
        </div>
      </Stack>
    </Container>
  );
}
