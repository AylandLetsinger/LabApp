import { AppShell, Burger, Button, Group, Menu, Text, Title } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CALCULATORS } from '../calculators';
import { DOSAGE_DELIVERY_METHODS } from '../dosageDeliveryMethods';
import KofiButton from '../components/feedback/KofiButton';
import NoteButton from '../components/feedback/NoteButton';
import { navActiveColor } from '../theme';

/**
 * Four top-level entries, two of which open a menu.
 *
 * Molarity, Dilutions and Antibodies used to sit in the bar alongside About and
 * Dosage, which put four calculators and one section heading on the same
 * footing. Grouping them says what they have in common: none of them is about a
 * route of administration.
 */
function NavButton({ to, children }) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Button
          component="span"
          variant={isActive ? 'filled' : 'subtle'}
          color={isActive ? navActiveColor : 'gray'}
          size="sm"
        >
          {children}
        </Button>
      )}
    </NavLink>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const dosageActive = pathname.startsWith('/dosage');
  const calculatorsActive = CALCULATORS.some((c) => pathname === c.to);
  // Six links do not fit a phone. They used to wrap onto a second row that
  // overflowed the fixed-height header, so those two links scrolled away with
  // the page content instead of staying put.
  const isNarrow = useMediaQuery('(max-width: 820px)');
  const [menuOpen, { toggle: toggleMenu, close: closeMenu }] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 64 }}
      padding="md"
      styles={{
        root: { backgroundColor: 'var(--mantine-color-white)' },
        header: { backgroundColor: 'var(--mantine-color-white)' },
        main: { backgroundColor: 'var(--mantine-color-white)' },
      }}
    >
      <AppShell.Header px="md" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Title left, navigation right, at every width. Centring the title
            while the nav was absolutely positioned let the two overlap once
            the nav grew, and the conditional was doing nothing else useful. */}
        <Group justify="space-between" wrap="nowrap" gap="sm" w="100%" maw={1126} mx="auto">
          <Title
            order={2}
            size="h4"
            component={Link}
            to="/"
            style={{
              textDecoration: 'none',
              color: 'var(--mantine-color-black)',
              whiteSpace: 'nowrap',
            }}
          >
            THE LAB APP
          </Title>

          <div>
          {isNarrow ? (
            <Menu
              shadow="md"
              width={220}
              position="bottom-end"
              opened={menuOpen}
              onChange={toggleMenu}
            >
              <Menu.Target>
                <Burger opened={menuOpen} onClick={toggleMenu} size="sm" aria-label="Open navigation" />
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item component={Link} to="/about" onClick={closeMenu}>
                  About
                </Menu.Item>
                <Menu.Divider />
                <Menu.Label>Dosage</Menu.Label>
                {DOSAGE_DELIVERY_METHODS.map(({ slug, label }) => (
                  <Menu.Item key={slug} component={Link} to={`/dosage/${slug}`} onClick={closeMenu}>
                    {label}
                  </Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Label>Calculators</Menu.Label>
                {CALCULATORS.map(({ to, label }) => (
                  <Menu.Item key={to} component={Link} to={to} onClick={closeMenu}>
                    {label}
                  </Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Item component={Link} to="/recipes" onClick={closeMenu}>
                  Recipe Creator
                </Menu.Item>
                <Menu.Item component={Link} to="/support" onClick={closeMenu}>
                  Support
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Group gap="xs" wrap="nowrap" justify="flex-end">
              <NavButton to="/about">About</NavButton>

              <Menu shadow="md" width={220} position="bottom-start">
                <Menu.Target>
                  <Button
                    variant={dosageActive ? 'filled' : 'subtle'}
                    color={dosageActive ? navActiveColor : 'gray'}
                    size="sm"
                    rightSection={<IconChevronDown size={14} stroke={1.5} />}
                  >
                    Dosage
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {DOSAGE_DELIVERY_METHODS.map(({ slug, label }) => (
                    <Menu.Item key={slug} component={Link} to={`/dosage/${slug}`}>
                      {label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>

              <Menu shadow="md" width={220} position="bottom-start">
                <Menu.Target>
                  <Button
                    variant={calculatorsActive ? 'filled' : 'subtle'}
                    color={calculatorsActive ? navActiveColor : 'gray'}
                    size="sm"
                    rightSection={<IconChevronDown size={14} stroke={1.5} />}
                  >
                    Calculators
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {CALCULATORS.map(({ to, label }) => (
                    <Menu.Item key={to} component={Link} to={to}>
                      {label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>

              <NavButton to="/recipes">Recipe Creator</NavButton>
              <NavButton to="/support">Support</NavButton>
            </Group>
          )}
          </div>
        </Group>
      </AppShell.Header>

      <AppShell.Main maw={1126} mx="auto" w="100%" ta="left">
        <Outlet />

        {/*
          On every page, because the page a problem happened on is the thing
          worth reporting and nobody navigates elsewhere to report it.
        */}
        <Group
          justify="space-between"
          align="center"
          wrap="wrap"
          gap="sm"
          mt="xl"
          pt="md"
          className="no-print"
          style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}
        >
          <Text size="xs" c="dimmed">
            Something wrong on this page, or missing from it?
          </Text>
          <Group gap="sm" align="center" wrap="wrap">
            <NoteButton />
            <KofiButton />
          </Group>
        </Group>
      </AppShell.Main>
    </AppShell>
  );
}
