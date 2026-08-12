import { useState } from 'react';
import { Button, Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { DOSE_UNITS, VOLUME_UNITS } from '../../constants/doseUnits';
import { MOLAR_CONCENTRATION_UNITS } from '../../dosage/molarUnits';
import {
  molPerLToMolarConcentration,
  molarConcentrationToMolPerL,
} from '../../dosage/molarUnits';
import { massToMg, mgToMassUnit, mlToVolumeUnit, volumeToMl } from '../../dosage/unitConversions';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import { REARRANGEMENTS, solveMolarity } from '../../molarity/computeMolarity';
import LabSelect from '../LabSelect';
import IssueList from '../dosage/IssueList';
import PrintActions from '../dosage/PrintActions';
import MolarityWorking from './MolarityWorking';
import { inputFieldColor } from '../../theme';

/**
 * A colour per quantity, carried from the field into the working below.
 *
 * The point is traceability: a term can be followed from where it was typed to
 * where it was substituted without reading either label. They are chosen to
 * stay distinguishable in greyscale, since this page prints.
 */
const TERM_COLOURS = {
  mass: 'grape.7',
  concentration: 'blue.7',
  volume: 'teal.8',
  molecularWeight: 'orange.8',
};

const inputBlue = { variant: 'filled', color: inputFieldColor };

/** The field that got calculated, marked so it cannot be mistaken for an input. */
const calculatedStyles = {
  input: {
    backgroundColor: 'var(--mantine-color-yellow-1)',
    borderColor: 'var(--mantine-color-yellow-5)',
    fontWeight: 700,
  },
};

/** Empty, with the units most people start from. Reset returns to exactly this. */
const BLANK = {
  mass: '',
  massUnit: 'mg',
  concentration: '',
  concentrationUnit: 'mM',
  volume: '',
  volumeUnit: 'ml',
  molecularWeight: '',
};

/**
 * Molarity, solved for whichever field is left blank.
 *
 * Four fields, one equation. Fill any three and the fourth fills itself and is
 * highlighted, so an output can never be mistaken for something that was typed.
 *
 * NOTE FOR WHOEVER STYLES THIS: the arithmetic lives in
 * src/molarity/computeMolarity.js and the working in MolarityWorking.jsx. This
 * file is layout and unit handling only — nothing here decides an answer.
 */
export default function MolarityCalculator() {
  const [v, setV] = useState(BLANK);
  /**
   * Clearing fields one at a time does not empty this form — each clear bakes
   * the current answer into the field beside it, which is what makes solving
   * for a different term work. So there has to be a way out, and this is it.
   */
  const reset = () => setV(BLANK);
  /**
   * Edit a field, keeping any answer already on screen.
   *
   * The calculated field is read-only, so the only way to solve for a
   * different one is to clear that one instead. Without this, doing so would
   * leave two blanks and the answer would simply vanish — the form would
   * appear to forget a number the user could still see. Baking the calculated
   * value in at that moment turns it into an ordinary input, and the
   * newly-cleared field becomes the one worked out.
   */
  const set = (key, value) =>
    setV((prev) => {
      const next = { ...prev, [key]: value };
      const cleared = value === '' || value === null || value === undefined;
      if (cleared && solved && key !== solved.term && shown?.value !== undefined) {
        next[solved.term] = roundTo(shown.value, 8);
      }
      return next;
    });

  // Everything is solved in mg, mol/L, mL and g/mol. See computeMolarity.js
  // for why those four units need no conversion factor between them.
  const canonicalInputs = {
    massMg: massToMg(v.mass, v.massUnit),
    concentrationMolPerL: molarConcentrationToMolPerL(v.concentration, v.concentrationUnit),
    volumeMl: volumeToMl(v.volume, v.volumeUnit),
    molecularWeight: toPositiveNumber(v.molecularWeight),
  };

  const solved = solveMolarity(canonicalInputs);

  /** The solved value, back in the unit that field is set to. */
  const backToDisplay = (term, canonicalValue) => {
    switch (term) {
      case 'mass':
        return { value: mgToMassUnit(canonicalValue, v.massUnit), unit: v.massUnit };
      case 'concentration':
        return {
          value: molPerLToMolarConcentration(canonicalValue, v.concentrationUnit),
          unit: v.concentrationUnit,
        };
      case 'volume':
        return { value: mlToVolumeUnit(canonicalValue, v.volumeUnit), unit: v.volumeUnit };
      default:
        return { value: canonicalValue, unit: 'g/mol' };
    }
  };

  const shown = solved ? backToDisplay(solved.term, solved.value) : undefined;

  /** What a field shows: what was typed, or what was worked out. */
  const fieldValue = (term, typed) =>
    solved?.term === term && shown?.value !== undefined ? roundTo(shown.value, 8) : typed;

  const isCalculated = (term) => solved?.term === term;

  /**
   * A key that changes only when a field becomes an output or its answer moves.
   *
   * Mantine's number input keeps its own display text once it has been typed
   * in, so a field the user has just cleared will not show the value that was
   * then computed for it — the answer appears in the working below but not in
   * the box. Remounting fixes that.
   *
   * It must NOT change while a field is an input, or every keystroke would
   * rebuild the element and steal the caret. Output fields are read-only, so
   * remounting them costs nothing.
   */
  const fieldKey = (term) =>
    isCalculated(term) ? `${term}-out-${roundTo(shown?.value ?? 0, 8)}` : `${term}-in`;

  const labelFor = {
    mass: 'Mass',
    concentration: 'Concentration',
    volume: 'Volume',
    molecularWeight: 'Molecular weight',
  };

  const unitLabel = (list, value) => list.find((u) => u.value === value)?.label ?? value;

  /** Everything the working needs, per term, in one place. */
  const termsForWorking = {
    mass: {
      label: 'mass',
      colour: TERM_COLOURS.mass,
      display: `${roundTo(Number(fieldValue('mass', v.mass)), 8)} ${unitLabel(DOSE_UNITS, v.massUnit)}`,
    },
    concentration: {
      label: 'concentration',
      colour: TERM_COLOURS.concentration,
      display: `${roundTo(Number(fieldValue('concentration', v.concentration)), 8)} ${unitLabel(MOLAR_CONCENTRATION_UNITS, v.concentrationUnit)}`,
    },
    volume: {
      label: 'volume',
      colour: TERM_COLOURS.volume,
      display: `${roundTo(Number(fieldValue('volume', v.volume)), 8)} ${unitLabel(VOLUME_UNITS, v.volumeUnit)}`,
    },
    molecularWeight: {
      label: 'molecular weight',
      colour: TERM_COLOURS.molecularWeight,
      display: `${roundTo(Number(fieldValue('molecularWeight', v.molecularWeight)), 8)} g/mol`,
    },
  };

  const canonicalForWorking = {
    mass: `${roundTo(
      solved?.term === 'mass' ? solved.value : canonicalInputs.massMg,
      8,
    )} mg`,
    concentration: `${roundTo(
      solved?.term === 'concentration' ? solved.value : canonicalInputs.concentrationMolPerL,
      10,
    )} mol/L`,
    volume: `${roundTo(
      solved?.term === 'volume' ? solved.value : canonicalInputs.volumeMl,
      8,
    )} mL`,
    molecularWeight: `${roundTo(
      solved?.term === 'molecularWeight' ? solved.value : canonicalInputs.molecularWeight,
      8,
    )} g/mol`,
  };

  const canonicalUnitOf = {
    mass: 'mg',
    concentration: 'mol/L',
    volume: 'mL',
    molecularWeight: 'g/mol',
  };

  /*
   * No issues while the form is simply not filled in yet.
   *
   * There used to be a "leave exactly one field blank" warning here, which
   * meant an empty calculator greeted everyone with something to check — on
   * arrival, when nothing could possibly be filled in. A panel that is already
   * complaining before anything has been typed teaches people to ignore the
   * panel. The instruction above the fields says what to do, and the yellow
   * answer appears the moment it can.
   */
  const issues = [];
  /*
   * There is deliberately no "these four disagree" check here.
   *
   * It cannot happen: the calculated field is read-only, so a fourth value can
   * never be typed, and the form can only ever hold three inputs. A warning
   * that cannot fire is worse than none — it reads as a guarantee that
   * disagreement would be caught.
   *
   * checkConsistency() in computeMolarity.js is written and tested for the day
   * the calculated field becomes editable. It is not wired up until then.
   */

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" align="center" wrap="nowrap" mb="sm">
          <Text fw={600}>Molarity</Text>
          <Button
            variant="subtle"
            size="compact-sm"
            color="gray"
            leftSection={<IconRefresh size={14} />}
            onClick={reset}
            className="no-print"
          >
            Reset
          </Button>
        </Group>
        <Text size="sm" c="dimmed" mb="md" className="no-print">
          Fill in any three. The fourth is worked out and shown in yellow.
        </Text>

        <Stack gap="md">
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label={labelFor.mass}
              placeholder="e.g. 342.39"
              min={0}
              decimalScale={8}
              value={fieldValue('mass', v.mass)}
              onChange={(value) => set('mass', value)}
              w={220}
              key={fieldKey('mass')}
              readOnly={isCalculated('mass')}
              styles={isCalculated('mass') ? calculatedStyles : undefined}
              {...(isCalculated('mass') ? {} : inputBlue)}
            />
            <LabSelect
              label="Unit"
              data={DOSE_UNITS}
              value={v.massUnit}
              onChange={(value) => set('massUnit', value ?? 'mg')}
              w={110}
            />
          </Group>

          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label={labelFor.concentration}
              placeholder="e.g. 20"
              min={0}
              decimalScale={8}
              value={fieldValue('concentration', v.concentration)}
              onChange={(value) => set('concentration', value)}
              w={220}
              key={fieldKey('concentration')}
              readOnly={isCalculated('concentration')}
              styles={isCalculated('concentration') ? calculatedStyles : undefined}
              {...(isCalculated('concentration') ? {} : inputBlue)}
            />
            <LabSelect
              label="Unit"
              data={MOLAR_CONCENTRATION_UNITS}
              value={v.concentrationUnit}
              onChange={(value) => set('concentrationUnit', value ?? 'mM')}
              w={110}
            />
          </Group>

          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label={labelFor.volume}
              placeholder="e.g. 50"
              min={0}
              decimalScale={8}
              value={fieldValue('volume', v.volume)}
              onChange={(value) => set('volume', value)}
              w={220}
              key={fieldKey('volume')}
              readOnly={isCalculated('volume')}
              styles={isCalculated('volume') ? calculatedStyles : undefined}
              {...(isCalculated('volume') ? {} : inputBlue)}
            />
            <LabSelect
              label="Unit"
              data={VOLUME_UNITS}
              value={v.volumeUnit}
              onChange={(value) => set('volumeUnit', value ?? 'ml')}
              w={110}
            />
          </Group>

          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label={labelFor.molecularWeight}
              placeholder="e.g. 342.39"
              min={0}
              decimalScale={8}
              value={fieldValue('molecularWeight', v.molecularWeight)}
              onChange={(value) => set('molecularWeight', value)}
              w={220}
              key={fieldKey('molecularWeight')}
              readOnly={isCalculated('molecularWeight')}
              styles={isCalculated('molecularWeight') ? calculatedStyles : undefined}
              {...(isCalculated('molecularWeight') ? {} : inputBlue)}
            />
            <Text pb="sm" size="sm">
              g/mol
            </Text>
          </Group>
        </Stack>

        {/* The equation lives with the fields it describes. */}
        <Paper p="sm" radius="sm" mt="md" bg="var(--mantine-color-gray-0)" withBorder>
          <Text size="sm" ff="monospace" ta="center">
            {solved ? REARRANGEMENTS[solved.term] : REARRANGEMENTS.mass}
          </Text>
        </Paper>

        <IssueList issues={issues} />
      </Paper>

      <MolarityWorking
        solvedTerm={solved?.term}
        terms={termsForWorking}
        canonical={canonicalForWorking}
        result={
          solved
            ? {
                canonicalValue: solved.value,
                canonicalUnit: canonicalUnitOf[solved.term],
                displayValue: shown?.value,
                displayUnit: unitLabelFor(solved.term, v),
              }
            : undefined
        }
      />

      <PrintActions title="molarity calculator" />
    </Stack>
  );
}

/** The unit a solved term is being shown in, for the final line of the working. */
function unitLabelFor(term, v) {
  switch (term) {
    case 'mass':
      return DOSE_UNITS.find((u) => u.value === v.massUnit)?.label ?? v.massUnit;
    case 'concentration':
      return (
        MOLAR_CONCENTRATION_UNITS.find((u) => u.value === v.concentrationUnit)?.label ??
        v.concentrationUnit
      );
    case 'volume':
      return VOLUME_UNITS.find((u) => u.value === v.volumeUnit)?.label ?? v.volumeUnit;
    default:
      return 'g/mol';
  }
}
