import { Button, Container, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { noteMailtoUrl } from '../feedback/mailto';

export default function About() {
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
            The Lab App is open-source and coded by Ayland Letsinger, Sarah Little-Letsinger,
            Klarissa Tey, and Elijah Martinez. We are always working on expanding the capabilities of
            the app – and we&apos;re happy to take requests!
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
            This opens your email app with the note already written. You still have to press send
            there — the site has no server of its own, so nothing leaves this page on its own.
          </Text>

          <form
            id="feedback-form"
            onSubmit={feedbackForm.onSubmit((values) => {
              // Previously this showed "Thanks for your feedback" and sent
              // nothing at all, which is worse than having no form: it spends
              // someone's goodwill and their typing on a message nobody gets.
              window.location.assign(
                noteMailtoUrl({
                  pathname: '/about',
                  name: values.name,
                  email: values.email,
                  message: values.message,
                }),
              );
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
                Open email
              </Button>
            </Stack>
          </form>
        </div>
      </Stack>
    </Container>
  );
}
