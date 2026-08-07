import { useState } from 'react';
import { Collapse, Group, List, Paper, Text, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { errorColor } from '../../theme';

/**
 * Validation problems, as one collapsed line.
 *
 * These used to expand inline, which pushed everything below them down the
 * page — so typing in an early field could shove the recipe out of view and
 * force a scroll back. A fixed-height summary that opens on demand keeps the
 * inputs and the recipe within one screen of each other.
 *
 * Errors open by default: something is wrong and the numbers below cannot be
 * trusted. Advisories stay shut until asked for.
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
  const colour = hasErrors ? errorColor : 'orange.7';

  const summary = [
    hasErrors ? `${errors.length} problem${errors.length === 1 ? '' : 's'}` : null,
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
          <Text size="sm" fw={600} c={colour}>
            {summary}
          </Text>
          {expanded ? <IconChevronDown size={14} opacity={0.6} /> : <IconChevronRight size={14} opacity={0.6} />}
        </Group>
      </UnstyledButton>

      <Collapse in={expanded}>
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
      </Collapse>
    </Paper>
  );
}
