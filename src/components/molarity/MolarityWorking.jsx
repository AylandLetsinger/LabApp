import { Paper, Stack, Text } from '@mantine/core';
import { REARRANGEMENTS } from '../../molarity/computeMolarity';
import { roundTo } from '../../dosage/numberUtils';

/**
 * The arithmetic, written out with the numbers in it.
 *
 * The equation above the fields says what the calculator does; this says what
 * it just did. They are different needs: one is a reminder, the other is a
 * check. Somebody who suspects an answer is a thousand-fold out can only
 * confirm it by seeing the conversion step, so the conversion step is shown
 * rather than folded into the result.
 *
 * Each quantity keeps the colour of the field it came from, so a term can be
 * traced from the form to the substitution without reading the label.
 */
export default function MolarityWorking({ solvedTerm, terms, canonical, result }) {
  if (!solvedTerm) return null;

  const colourOf = (term) => terms[term].colour;

  /** A named quantity in its own colour: "20 mM". */
  const quantity = (term) => (
    <Text component="span" fw={700} c={colourOf(term)} ff="monospace">
      {terms[term].display}
    </Text>
  );

  /** The same quantity after conversion: "0.02 mol/L". */
  const converted = (term) => (
    <Text component="span" fw={700} c={colourOf(term)} ff="monospace">
      {canonical[term]}
    </Text>
  );

  const inputs = ['mass', 'concentration', 'volume', 'molecularWeight'].filter(
    (t) => t !== solvedTerm,
  );

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        The arithmetic
      </Text>

      <Stack gap={10}>
        <Text size="sm" ff="monospace">
          {REARRANGEMENTS[solvedTerm]}
        </Text>

        {/*
          Conversions first, and always — even where nothing changes. A step
          that appears only sometimes is a step the reader has to notice is
          missing.
        */}
        <div>
          <Text size="xs" c="dimmed" mb={4}>
            in the units the arithmetic uses
          </Text>
          <Stack gap={2}>
            {inputs.map((term) => (
              <Text key={term} size="sm" ff="monospace">
                {terms[term].label}
                {'  '}
                {quantity(term)}
                {terms[term].display !== canonical[term] && (
                  <>
                    {'  =  '}
                    {converted(term)}
                  </>
                )}
              </Text>
            ))}
          </Stack>
        </div>

        <div>
          <Text size="xs" c="dimmed" mb={4}>
            substituted
          </Text>
          <Text size="sm" ff="monospace">
            {terms[solvedTerm].label} ={'  '}
            {solvedTerm === 'mass' && (
              <>
                {converted('concentration')} × {converted('volume')} ×{' '}
                {converted('molecularWeight')}
              </>
            )}
            {solvedTerm === 'concentration' && (
              <>
                {converted('mass')} ÷ ({converted('volume')} × {converted('molecularWeight')})
              </>
            )}
            {solvedTerm === 'volume' && (
              <>
                {converted('mass')} ÷ ({converted('concentration')} ×{' '}
                {converted('molecularWeight')})
              </>
            )}
            {solvedTerm === 'molecularWeight' && (
              <>
                {converted('mass')} ÷ ({converted('concentration')} × {converted('volume')})
              </>
            )}
          </Text>
        </div>

        <div>
          <Text size="xs" c="dimmed" mb={4}>
            which gives
          </Text>
          <Text size="sm" ff="monospace">
            {terms[solvedTerm].label} ={'  '}
            <Text component="span" fw={700} c={colourOf(solvedTerm)}>
              {roundTo(result.canonicalValue, 8)} {result.canonicalUnit}
            </Text>
            {/*
              Only when it says something. Converting mg to mg prints
              "342.39 mg = 342.39 mg", which reads as an arithmetic step and
              is not one.
            */}
            {result.displayValue !== undefined &&
              `${roundTo(result.displayValue, 8)} ${result.displayUnit}` !==
                `${roundTo(result.canonicalValue, 8)} ${result.canonicalUnit}` && (
                <>
                  {'  =  '}
                  <Text component="span" fw={700} c={colourOf(solvedTerm)}>
                    {roundTo(result.displayValue, 8)} {result.displayUnit}
                  </Text>
                </>
              )}
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}
