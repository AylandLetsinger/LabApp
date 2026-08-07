import { useState } from 'react';
import { Group, List, Paper, Text, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { errorColor } from '../../theme';

/**
 * Validation problems, as one collapsible line.
 *
 * These used to expand inline, which pushed everything below them down the
 * page — so typing in an early field could shove the recipe out of view. A
 * fixed-height summary that opens on demand keeps the inputs and the recipe
 * within one screen of each other.
 *
 * Two distinct severities, and the difference matters:
 *
 *   An IMPOSSIBILITY is a number that cannot exist — a volume that will not
 *   fit, a solvent that cannot dissolve the dose, a mixture that separates.
 *
 *   A WARNING is a number that exists but sits outside what has been
 *   published. That is a judgement for the user and their protocol, not a
 *   verdict from a calculator.
 *
 * The body is rendered conditionally rather than wrapped in a Collapse:
 * Mantine's Collapse mounts closed and only animates on a CHANGE to `in`, so a
 * panel that starts open renders its content at display:none and stays there.
 *
 * @param {{ issues: Array<{level: 'error'|'warning', message: string}> }} props
 */
export default function IssueList({ issues, mt = 'sm' }) {
  const errors = (issues ?? []).filter((i) => i.level === 'error');
  const warnings = (issues ?? []).filter((i) => i.level === 'warning');

  // null means "no opinion yet", so the panel can open itself when something
  // impossible appears and still be closed by the user afterwards. Deriving
  // expansion straight from `hasErrors` made the control inert.
  const [userOpen, setUserOpen] = useState(null);

  if (errors.length === 0 && warnings.length === 0) return null;

  const hasErrors = errors.length > 0;
  const expanded = userOpen === null ? hasErrors : userOpen;

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
      <UnstyledButton onClick={() => setUserOpen(!expanded)} w="100%" aria-expanded={expanded}>
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
        // Bullets render outside the content box, so the padding has to clear
        // them or they sit on the panel border.
        <List size="sm" spacing={6} mt={8} pl="lg" pr="xs">
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
