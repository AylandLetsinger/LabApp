import { Alert, List } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { errorColor } from '../../theme';

/**
 * Render validation problems. Nothing here fails quietly: if a calculation
 * cannot produce a trustworthy number, the reason is shown rather than the
 * field simply going blank.
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
        <Alert
          color="yellow"
          icon={<IconInfoCircle size={18} />}
          title="Check this"
          mt={mt}
          variant="light"
        >
          <List size="sm" spacing={4}>
            {warnings.map((issue) => (
              <List.Item key={issue.message}>{issue.message}</List.Item>
            ))}
          </List>
        </Alert>
      )}
    </>
  );
}
