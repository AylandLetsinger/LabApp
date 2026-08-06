import { AppShell, Button, Group, Menu, Title } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DOSAGE_DELIVERY_METHODS } from '../dosageDeliveryMethods';
import { navActiveColor } from '../theme';

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

  return (
    <AppShell
      header={{ height: 72 }}
      padding="md"
      styles={{
        root: { backgroundColor: 'var(--mantine-color-white)' },
        header: { backgroundColor: 'var(--mantine-color-white)' },
        main: { backgroundColor: 'var(--mantine-color-white)' },
      }}
    >
      <AppShell.Header p="md" style={{ display: 'flex', alignItems: 'center' }}>
        <Group justify="space-between" wrap="wrap" gap="sm" w="100%" maw={1126} mx="auto">
          <Title
            order={2}
            size="h3"
            component={Link}
            to="/"
            style={{ textDecoration: 'none', color: 'var(--mantine-color-black)' }}
          >
            THE LAB APP
          </Title>

          <Group gap="xs" wrap="wrap" justify="flex-end">
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

            <NavButton to="/molarity">Molarity</NavButton>
            <NavButton to="/dilutions">Dilutions</NavButton>
            <NavButton to="/antibodies">Antibodies</NavButton>
            <NavButton to="/recipes">Recipes</NavButton>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main maw={1126} mx="auto" w="100%" ta="left">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
