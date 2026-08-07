import { AppShell, Burger, Button, Group, Menu, Title } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DOSAGE_DELIVERY_METHODS } from '../dosageDeliveryMethods';
import { navActiveColor } from '../theme';

/** Top-level sections, in nav order. */
const SECTIONS = [
  { to: '/about', label: 'About' },
  { to: '/molarity', label: 'Molarity' },
  { to: '/dilutions', label: 'Dilutions' },
  { to: '/antibodies', label: 'Antibodies' },
  { to: '/recipes', label: 'Recipes' },
];

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
        <Group justify="space-between" wrap="nowrap" gap="sm" w="100%" maw={1126} mx="auto" pos="relative">
          <Title
            order={2}
            size="h4"
            component={Link}
            to="/"
            style={{
              textDecoration: 'none',
              color: 'var(--mantine-color-black)',
              whiteSpace: 'nowrap',
              flex: isNarrow ? undefined : '0 0 33%',
              margin: isNarrow ? '0 auto' : undefined,
            }}
          >
            THE LAB APP
          </Title>

          <div style={isNarrow ? { position: 'absolute', right: 0 } : undefined}>
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
                <Menu.Label>Dosage</Menu.Label>
                {DOSAGE_DELIVERY_METHODS.map(({ slug, label }) => (
                  <Menu.Item key={slug} component={Link} to={`/dosage/${slug}`} onClick={closeMenu}>
                    {label}
                  </Menu.Item>
                ))}
                <Menu.Divider />
                {SECTIONS.map(({ to, label }) => (
                  <Menu.Item key={to} component={Link} to={to} onClick={closeMenu}>
                    {label}
                  </Menu.Item>
                ))}
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

              {SECTIONS.filter((s) => s.to !== '/about').map(({ to, label }) => (
                <NavButton key={to} to={to}>
                  {label}
                </NavButton>
              ))}
            </Group>
          )}
          </div>
        </Group>
      </AppShell.Header>

      <AppShell.Main maw={1126} mx="auto" w="100%" ta="left">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
