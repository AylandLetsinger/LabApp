import { ActionIcon, Button, Divider, Group, Paper, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import SoluteFields from './SoluteFields';
import { makeSolute, soluteDisplayName } from '../../dosage/solutes';

/**
 * A new solute inherits how the first one is dosed, and nothing else.
 *
 * Two drugs in one syringe are almost always specified the same way — both
 * mg/kg, or both flat per animal — so copying the dosage type and its
 * reference body weight saves a step. Copying the numbers would not: a second
 * drug arriving with the first one's dose already filled in is exactly the
 * plausible-looking wrong value this app tries not to produce.
 */
function makeAdditionalSolute(solutes) {
  const first = solutes[0];
  return makeSolute({
    dosageType: first?.dosageType ?? 'by-body-weight',
    bodyWeightAmount: first?.bodyWeightAmount ?? '',
    bodyWeightUnit: first?.bodyWeightUnit ?? 'kg',
  });
}

/**
 * Step 1: what is being dosed.
 *
 * Usually one substance, sometimes several — a co-administered pair, or an
 * anaesthetic cocktail. Each gets the full dose specification rather than a
 * reduced one, because "the second drug" is not a lesser kind of drug: it has
 * its own protocol dose, its own molecular weight, and its own solubility.
 *
 * With a single solute this renders exactly what it always did, minus a
 * heading nobody needed.
 */
export default function SolutesSection({
  stepLabel = 'Step 1 — Dosage type',
  solutes,
  onSolutesChange,
  scheduleOutputFeedback,
  canAddSolutes = true,
  footer,
}) {
  const many = solutes.length > 1;

  /** Scope the setter to one solute, so the fields need no index of their own. */
  const setSoluteField = (index) => (key, value) => {
    onSolutesChange(solutes.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  };

  const removeSolute = (index) => onSolutesChange(solutes.filter((_, i) => i !== index));

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        {stepLabel}
      </Text>
      <Text size="sm" c="dimmed" mb="md" className="no-print">
        Choose how dose is specified, then enter the values (highlighted fields).
        {canAddSolutes && ' Add a solute for anything else going into the same solution.'}
      </Text>

      {solutes.map((solute, index) => (
        <div key={solute.id}>
          {many && (
            <>
              {index > 0 && <Divider my="md" />}
              <Group justify="space-between" align="center" mb="sm">
                <Text size="sm" fw={600} c="dimmed">
                  {soluteDisplayName(solute, index)}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Remove ${soluteDisplayName(solute, index)}`}
                  onClick={() => removeSolute(index)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </>
          )}
          <SoluteFields
            solute={solute}
            setFieldValue={setSoluteField(index)}
            scheduleOutputFeedback={scheduleOutputFeedback}
          />
        </div>
      ))}

      {/*
        Where a solution can only ever hold one substance, the button is simply
        absent. Offering it and then explaining the refusal would be two steps
        to reach the same place as none.
      */}
      {canAddSolutes && (
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconPlus size={14} />}
          mt="md"
          onClick={() => onSolutesChange([...solutes, makeAdditionalSolute(solutes)])}
        >
          Add solute
        </Button>
      )}

      {footer}
    </Paper>
  );
}
