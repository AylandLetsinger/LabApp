import { Component, useRef, useState } from 'react';
import { Alert, Button, Container, Group, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { RememberContext } from '../persistence/RememberContext';
import { clearScope, readEntry } from '../persistence/storage';

/**
 * Gives one page its memory, and makes restored values impossible to miss.
 *
 * Lab computers are shared. A mealworm load someone else entered yesterday,
 * restored silently into your form, looks exactly like one you just typed —
 * and is the kind of number that ends up in an animal. So a page never
 * restores quietly: it says it has, says when, and offers Start fresh.
 *
 * Wrapped once around the page outlet in AppLayout, keyed and scoped by the
 * URL path. Pages opt in simply by using the hooks in
 * persistence/useRemembered.js; a page that uses none remembers nothing and
 * never shows the notice.
 */

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function describeWhen(savedAt) {
  if (!savedAt) return 'earlier';
  const minutes = Math.round((Date.now() - savedAt) / 60000);
  if (minutes < 1) return 'moments ago';
  if (minutes < 60) return RELATIVE.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return RELATIVE.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return RELATIVE.format(-days, 'day');
  return `on ${new Date(savedAt).toLocaleDateString()}`;
}

/**
 * If a page crashes while it holds remembered entries, clear them and start it
 * fresh once. A stored value from before a form changed shape is the likeliest
 * cause, and without this a single bad entry would break that page on every
 * visit, in that browser, forever — with nothing on screen to click.
 *
 * If it crashes again with nothing remembered, the problem is not the memory,
 * and the fallback says so rather than looping.
 */
class RestoreBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * One page's memory for one mount. Remounted, with a fresh `interacted`, by
 * Start fresh and by crash recovery.
 *
 * The capture handlers see events from Mantine dropdowns too: they render in a
 * portal, but React events travel the component tree, not the DOM.
 */
function PageMemory({ scope, children }) {
  const interacted = useRef(false);
  const [memory] = useState(() => ({ scope, interacted }));
  const markInteracted = () => {
    interacted.current = true;
  };

  return (
    <RememberContext.Provider value={memory}>
      <div
        onPointerDownCapture={markInteracted}
        onKeyDownCapture={markInteracted}
        onInputCapture={markInteracted}
      >
        {children}
      </div>
    </RememberContext.Provider>
  );
}

export default function RememberedInputs({ scope, children }) {
  const [generation, setGeneration] = useState(0);
  const [notice, setNotice] = useState(() => {
    const entry = readEntry(scope);
    return entry ? { kind: 'restored', when: describeWhen(entry.savedAt) } : null;
  });

  const startFresh = () => {
    clearScope(scope);
    setNotice(null);
    setGeneration((g) => g + 1);
  };

  const recoverFromCrash = () => {
    if (!readEntry(scope)) return;
    clearScope(scope);
    setNotice({ kind: 'cleared' });
    setGeneration((g) => g + 1);
  };

  return (
    <>
      {notice && (
        <Container size="md" pt="md" className="no-print">
          <Alert
            variant="light"
            color={notice.kind === 'cleared' ? 'orange' : 'gray'}
            withCloseButton
            closeButtonLabel="Dismiss"
            onClose={() => setNotice(null)}
          >
            {notice.kind === 'restored' ? (
              <Group justify="space-between" align="center" gap="sm">
                <Text size="sm" style={{ flex: '1 1 20rem' }}>
                  These are the entries last used on this page in this browser ({notice.when}).
                  On a shared computer, check they are yours before relying on them.
                </Text>
                <Button
                  variant="default"
                  size="compact-sm"
                  leftSection={<IconRefresh size={14} />}
                  onClick={startFresh}
                >
                  Start fresh
                </Button>
              </Group>
            ) : (
              <Text size="sm">
                Something on this page failed with the entries it had, so they have been cleared
                and the page has started fresh. If you can make it happen again, please send us a
                note — that is a bug we want to know about.
              </Text>
            )}
          </Alert>
        </Container>
      )}

      <RestoreBoundary
        key={generation}
        onError={recoverFromCrash}
        fallback={
          <Container size="md" py="xl">
            <Text>
              Something went wrong displaying this page. Reloading may help — and if it keeps
              happening, please use Send a note below so we can fix it.
            </Text>
          </Container>
        }
      >
        <PageMemory scope={scope}>{children}</PageMemory>
      </RestoreBoundary>
    </>
  );
}
