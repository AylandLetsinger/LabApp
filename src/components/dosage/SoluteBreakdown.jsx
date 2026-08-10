import { Text } from '@mantine/core';
import { roundTo } from '../../dosage/numberUtils';
import { soluteDisplayName } from '../../dosage/solutes';

/**
 * What each substance contributes to one dose.
 *
 * With a single solute the sentence above already says this, so nothing is
 * rendered. With several, the combined figures in that sentence are true but
 * not actionable — nobody weighs out "0.55 mg of drug" when the drug is two
 * drugs — and this is the line that makes them checkable.
 */
export default function SoluteBreakdown({ solutes, soluteDosesMg, bodyWeightKg }) {
  if (solutes.length < 2) return null;
  if (soluteDosesMg.some((mg) => mg === undefined)) return null;

  const canRate = Number.isFinite(bodyWeightKg) && bodyWeightKg > 0;

  return (
    <Text size="sm" mt={6}>
      Per subject:{' '}
      {solutes.map((solute, i) => (
        <span key={solute.id}>
          {i > 0 && ' · '}
          {soluteDisplayName(solute, i)}{' '}
          <strong>{roundTo(soluteDosesMg[i], 6)} mg</strong>
          {canRate && ` (${roundTo(soluteDosesMg[i] / bodyWeightKg, 4)} mg/kg)`}
        </span>
      ))}
    </Text>
  );
}
