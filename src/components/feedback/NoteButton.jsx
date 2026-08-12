import { useState } from 'react';
import { Button, Group, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconMessage2 } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { noteMailtoUrl, pageLabel } from '../../feedback/mailto';
import { primaryActionColor } from '../../theme';

/**
 * "Something wrong here?" — on every page, because the page it happened on is
 * the thing worth reporting and nobody navigates somewhere else to report it.
 *
 * The note is composed here and handed to the reader's mail client prefilled.
 * See src/feedback/mailto.js for why it works that way and what it costs.
 */
export default function NoteButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const { pathname } = useLocation();

  const send = () => {
    window.location.assign(noteMailtoUrl({ pathname, name, email, message }));
    setOpen(false);
    setMessage('');
  };

  return (
    <>
      <Button
        variant="subtle"
        size="compact-sm"
        color="gray"
        leftSection={<IconMessage2 size={14} />}
        onClick={() => setOpen(true)}
        className="no-print"
      >
        Send a note
      </Button>

      <Modal opened={open} onClose={() => setOpen(false)} title="Send a note" size="md">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            A wrong number, a missing unit, something that would help — it all goes to the person
            who maintains this. The page you are on ({pageLabel(pathname)}) is included.
          </Text>

          <Textarea
            label="What happened?"
            placeholder="The volume per site looks ten times too big when I…"
            minRows={4}
            autosize
            maxRows={12}
            value={message}
            onChange={(e) => setMessage(e.currentTarget.value)}
            data-autofocus
          />
          <Group grow>
            <TextInput
              label="Your name"
              placeholder="optional"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <TextInput
              label="Your email"
              placeholder="optional, for a reply"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </Group>

          {/*
            Said plainly, because a button labelled "send" that opens a mail
            client instead is a small betrayal if it is not expected.
          */}
          <Text size="xs" c="dimmed">
            This opens your email app with the note already written. You still have to press send
            there — nothing leaves this page on its own.
          </Text>

          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button color={primaryActionColor} onClick={send} disabled={!message.trim()}>
              Open email
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
