import { Alert, Group, List, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { errorColor } from '../../theme';

/**
 * Render validation problems.
 *
 * Errors stay visible: something is wrong and the recipe below cannot be
 * trusted. Advisories collapse to a single hoverable line, because they are
 * usually "this is defensible but worth knowing" and a stack of yellow boxes
 * competing with a red one teaches people to skim past both.
 *
 * @param {{ issues: Array<{level: 'error'|'warning', message: string}> }} props
 */
export default function IssueList({ issues, mt = 'sm' }) {
  if (!issues || issues.length === 0) return null;

  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  return (
    <>
      {errors.length > 0 && (
        <Alert
          color={errorColor}
          icon={<IconAlertTriangle size={18} />}
          title={errors.length === 1 ? 'Problem' : 'Problems'}
          mt={mt}
          variant="light"
        >
          <List size="sm" spacing={4}>
            {errors.map((issue) => (
              <List.Item key={issue.message}>{issue.message}</List.Item>
            ))}
          </List>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Tooltip
          label={warnings.map((w) => w.message).join('\n\n')}
          multiline
          w={460}
          withArrow
          position="top-start"
        >
          <Group gap={6} mt={mt} wrap="nowrap" style={{ cursor: 'help', width: 'fit-content' }}>
            <IconInfoCircle size={15} opacity={0.6} />
            <Text size="xs" c="dimmed" td="underline">
              {warnings.length === 1 ? '1 thing worth checking' : `${warnings.length} things worth checking`}
            </Text>
          </Group>
        </Tooltip>
      )}
    </>
  );
}
