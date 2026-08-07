import { useState } from 'react';
import { Group, List, Paper, Text, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { errorColor } from '../../theme';

/**
 * Validation problems, as one collapsible line.
 *
 * These used to expand inline, which pushed everything below them down the
 * page — so typing in an early field could shove the recipe out of view and
 * force a scroll back. A fixed-height summary that opens on demand keeps the
 * inputs and the recipe within one screen of each other.
 *
 * The body is rendered conditionally rather than wrapped in a Collapse:
 * Mantine's Collapse mounts closed and only animates on a CHANGE to `in`, so a
 * panel that starts open renders its content at display:none and stays there.
 *
 * Errors show by default — something is impossible and the numbers below
 * cannot be trusted. Advisories wait to be asked for.
 *
 * @param {{ issues: Array<{level: 'error'|'warning', message: string}> }} props
 */
export default function IssueList({ issues, mt = 'sm' }) {
  const errors = (issues ?? []).filter((i) => i.level === 'error');
  const warnings = (issues ?? []).filter((i) => i.level === 'warning');
  const [open, setOpen] = useState(false);

  if (errors.length === 0 && warnings.length === 0) return null;

  const hasErrors = errors.length > 0;
  const expanded = open || hasErrors;

  // These errors are not style complaints — each one says a number the user
  // asked for cannot exist. Naming them that way stops them reading as nags.
  const summary = [
    hasErrors
      ? `${errors.length} ${errors.length === 1 ? 'impossibility' : 'impossibilities'} detected`
      : null,
    warnings.length > 0 ? `${warnings.length} to check` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Paper
      mt={mt}
      p="xs"
      radius="sm"
      withBorder
      style={{ borderColor: `var(--mantine-color-${hasErrors ? 'red' : 'orange'}-3)` }}
    >
      <UnstyledButton onClick={() => setOpen((o) => !o)} w="100%" aria-expanded={expanded}>
        <Group gap={6} wrap="nowrap">
          {hasErrors ? (
            <IconAlertTriangle size={16} color="var(--mantine-color-red-7)" />
          ) : (
            <IconInfoCircle size={16} color="var(--mantine-color-orange-7)" />
          )}
          <Text size="sm" fw={600} c={hasErrors ? errorColor : 'orange.7'}>
            {summary}
          </Text>
          {expanded ? (
            <IconChevronDown size={14} opacity={0.6} />
          ) : (
            <IconChevronRight size={14} opacity={0.6} />
          )}
        </Group>
      </UnstyledButton>

      {expanded && (
        <List size="sm" spacing={6} mt={8} pl={4}>
          {errors.map((issue) => (
            <List.Item key={issue.message} c={errorColor}>
              {issue.message}
            </List.Item>
          ))}
          {warnings.map((issue) => (
            <List.Item key={issue.message} c="dimmed">
              {issue.message}
            </List.Item>
          ))}
        </List>
      )}
    </Paper>
  );
}
