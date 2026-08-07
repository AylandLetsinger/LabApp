import { Button, Group } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';

/**
 * Print / save the filled-in calculator.
 *
 * This deliberately uses the browser's own print dialog rather than a PDF
 * library: every current browser offers "Save as PDF" as a destination there,
 * so one button covers both printing and PDF export with no dependency and
 * nothing to keep up to date.
 *
 * Emailing is not offered. The site is a static page with no server, so it
 * has nothing that can send mail — save the PDF and attach it.
 */
export default function PrintActions({ title }) {
  return (
    <Group justify="flex-end" align="center" wrap="wrap" gap="sm" className="no-print">
      <Button
        variant="light"
        leftSection={<IconPrinter size={16} />}
        onClick={() => window.print()}
        aria-label={`Print or save ${title}`}
      >
        Print / Save PDF
      </Button>
    </Group>
  );
}
