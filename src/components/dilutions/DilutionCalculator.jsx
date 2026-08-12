import { useState } from 'react';
import { Button, Divider, Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { VOLUME_UNITS } from '../../constants/doseUnits';
import { mlToVolumeUnit, volumeToMl } from '../../dosage/unitConversions';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import {
  BASE_UNIT_LABEL,
  CONCENTRATION_UNITS,
  REARRANGEMENTS,
  alignConcentrations,
  concentrationKind,
  concentrationUnitLabel,
  diluentVolumeMl,
  dilutionFactor,
  solveDilution,
  toBase,
  unitsComparable,
} from '../../dilutions/computeDilution';
import LabSelect from '../LabSelect';
import IssueList from '../dosage/IssueList';
import PrintActions from '../dosage/PrintActions';
import { inputFieldColor } from '../../theme';

/** A colour per term, carried from the field into the working below. */
const TERM_COLOURS = {
  c1: 'grape.7',
  v1: 'teal.8',
  c2: 'blue.7',
  v2: 'orange.8',
};

const TERM_LABELS = {
  c1: 'C₁ — stock concentration',
  v1: 'V₁ — volume of stock to take',
  c2: 'C₂ — final concentration',
  v2: 'V₂ — final volume',
};

const inputBlue = { variant: 'filled', color: inputFieldColor };

const calculatedStyles = {
  input: {
    backgroundColor: 'var(--mantine-color-yellow-1)',
    borderColor: 'var(--mantine-color-yellow-5)',
    fontWeight: 700,
  },
};

const BLANK = {
  c1: '',
  c1Unit: 'mM',
  v1: '',
  v1Unit: 'ml',
  c2: '',
  c2Unit: 'mM',
  v2: '',
  v2Unit: 'ml',
  molecularWeight: '',
};

/**
 * C1 V1 = C2 V2, solved for whichever field is left blank.
 *
 * NOTE FOR WHOEVER STYLES THIS: the arithmetic and every unit rule live in
 * src/dilutions/computeDilution.js and are covered by tests. This file is
 * layout and unit handling only.
 */
export default function DilutionCalculator() {
  const [v, setV] = useState(BLANK);
  const reset = () => setV(BLANK);

  /** See the note on the molarity form: clearing one field keeps the answer. */
  const set = (key, value) =>
    setV((prev) => {
      const next = { ...prev, [key]: value };
      const cleared = value === '' || value === null || value === undefined;
      if (cleared && solved && key !== solved.term && shown?.value !== undefined) {
        next[solved.term] = roundTo(shown.value, 8);
      }
      return next;
    });

  const comparable = unitsComparable(v.c1Unit, v.c2Unit, v.molecularWeight);
  const needsMolecularWeight =
    concentrationKind(v.c1Unit) !== concentrationKind(v.c2Unit) &&
    concentrationKind(v.c1Unit) !== 'fraction' &&
    concentrationKind(v.c2Unit) !== 'fraction';

  // Concentrations onto one scale; volumes into millilitres.
  const aligned = comparable.ok
    ? alignConcentrations({
        c1: v.c1,
        unit1: v.c1Unit,
        c2: v.c2,
        unit2: v.c2Unit,
        molecularWeight: v.molecularWeight,
      })
    : undefined;

  const canonical = {
    c1: aligned?.c1,
    v1: volumeToMl(v.v1, v.v1Unit),
    c2: aligned?.c2,
    v2: volumeToMl(v.v2, v.v2Unit),
  };

  const solved = comparable.ok ? solveDilution(canonical) : undefined;

  /** The solved value, back in the unit that field is set to. */
  const backToDisplay = (term, value) => {
    switch (term) {
      case 'v1':
        return { value: mlToVolumeUnit(value, v.v1Unit), unit: concentrationOrVolumeLabel('v1') };
      case 'v2':
        return { value: mlToVolumeUnit(value, v.v2Unit), unit: concentrationOrVolumeLabel('v2') };
      case 'c1':
        return { value: value / unitBase(v.c1Unit, 'c1'), unit: concentrationUnitLabel(v.c1Unit) };
      default:
        return { value: value / unitBase(v.c2Unit, 'c2'), unit: concentrationUnitLabel(v.c2Unit) };
    }
  };

  /**
   * How much of the field's own unit one unit of the aligned scale is.
   *
   * Where the two concentrations are the same kind this is just the unit's own
   * base. Where they crossed kinds, everything was brought to mg/mL, so a
   * molar field has to come back through the molecular weight as well.
   */
  function unitBase(unit) {
    const own = toBase(1, unit);
    if (own === undefined) return 1;
    const crossed = concentrationKind(v.c1Unit) !== concentrationKind(v.c2Unit);
    const mw = toPositiveNumber(v.molecularWeight);
    if (crossed && concentrationKind(unit) === 'molar' && mw !== undefined) return own * mw;
    return own;
  }

  function concentrationOrVolumeLabel(term) {
    return VOLUME_UNITS.find((u) => u.value === (term === 'v1' ? v.v1Unit : v.v2Unit))?.label ?? '';
  }

  const shown = solved ? backToDisplay(solved.term, solved.value) : undefined;

  const fieldValue = (term) =>
    solved?.term === term && shown?.value !== undefined ? roundTo(shown.value, 8) : v[term];

  const isCalculated = (term) => solved?.term === term;
  const fieldKey = (term) =>
    isCalculated(term) ? `${term}-out-${roundTo(shown?.value ?? 0, 8)}` : `${term}-in`;

  // The two outputs that make the answer followable at the bench.
  const v1Ml = solved?.term === 'v1' ? solved.value : canonical.v1;
  const v2Ml = solved?.term === 'v2' ? solved.value : canonical.v2;
  const diluent = diluentVolumeMl(v1Ml, v2Ml);
  const factor = dilutionFactor(
    solved?.term === 'c1' ? solved.value : canonical.c1,
    solved?.term === 'c2' ? solved.value : canonical.c2,
  );

  const issues = [];
  if (!comparable.ok) {
    issues.push({ level: 'warning', message: comparable.reason });
  }
  // Nothing is reported for a form that is merely unfinished — see the note on
  // the molarity calculator. A panel complaining on arrival trains people to
  // ignore it, and the instruction above the fields already says what to do.
  if (diluent?.impossible) {
    issues.push({
      level: 'error',
      message:
        `The final volume is smaller than the sample you are taking from, which is a ` +
        'concentration step rather than a dilution. Nothing can be added to reach it.',
    });
  }

  const concentrationField = (term, unitKey) => (
    <Group align="flex-end" wrap="wrap" gap="sm" key={term}>
      <NumberInput
        label={TERM_LABELS[term]}
        placeholder={term === 'c1' ? 'e.g. 10' : 'e.g. 1'}
        min={0}
        decimalScale={8}
        value={fieldValue(term)}
        onChange={(value) => set(term, value)}
        w={260}
        key={fieldKey(term)}
        readOnly={isCalculated(term)}
        styles={isCalculated(term) ? calculatedStyles : undefined}
        {...(isCalculated(term) ? {} : inputBlue)}
      />
      <LabSelect
        label="Unit"
        data={CONCENTRATION_UNITS}
        value={v[unitKey]}
        onChange={(value) => set(unitKey, value ?? 'mM')}
        w={120}
      />
    </Group>
  );

  const volumeField = (term, unitKey) => (
    <Group align="flex-end" wrap="wrap" gap="sm" key={term}>
      <NumberInput
        label={TERM_LABELS[term]}
        placeholder={term === 'v1' ? 'e.g. 1' : 'e.g. 10'}
        min={0}
        decimalScale={8}
        value={fieldValue(term)}
        onChange={(value) => set(term, value)}
        w={260}
        key={fieldKey(term)}
        readOnly={isCalculated(term)}
        styles={isCalculated(term) ? calculatedStyles : undefined}
        {...(isCalculated(term) ? {} : inputBlue)}
      />
      <LabSelect
        label="Unit"
        data={VOLUME_UNITS}
        value={v[unitKey]}
        onChange={(value) => set(unitKey, value ?? 'ml')}
        w={120}
      />
    </Group>
  );

  const coloured = (term, text) => (
    <Text component="span" fw={700} c={TERM_COLOURS[term]} ff="monospace">
      {text}
    </Text>
  );

  const displayOf = (term) => {
    const value = fieldValue(term);
    const unit =
      term === 'c1'
        ? concentrationUnitLabel(v.c1Unit)
        : term === 'c2'
          ? concentrationUnitLabel(v.c2Unit)
          : concentrationOrVolumeLabel(term);
    return `${roundTo(Number(value), 8)} ${unit}`;
  };

  const canonicalOf = (term) => {
    const value = solved?.term === term ? solved.value : canonical[term];
    if (value === undefined) return '—';
    const unit =
      term === 'v1' || term === 'v2'
        ? 'mL'
        : BASE_UNIT_LABEL[
            concentrationKind(v.c1Unit) === concentrationKind(v.c2Unit)
              ? concentrationKind(v.c1Unit)
              : 'mass'
          ];
    return `${roundTo(value, 10)} ${unit}`;
  };

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" align="center" wrap="nowrap" mb="sm">
          <Text fw={600}>Dilution</Text>
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
          Fill in any three. The fourth is worked out and shown in yellow. The two concentrations
          only have to be the same <em>kind</em> of unit — a tenfold step is a tenfold step whether
          it is in mM or mg/mL, and neither needs a molecular weight.
        </Text>

        <Stack gap="md">
          {concentrationField('c1', 'c1Unit')}
          {volumeField('v1', 'v1Unit')}
          {concentrationField('c2', 'c2Unit')}
          {volumeField('v2', 'v2Unit')}

          {/* Only asked for when the two concentrations cross kinds. */}
          {needsMolecularWeight && (
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label="Molecular weight"
                placeholder="needed to compare a mass with a molarity"
                min={0}
                decimalScale={4}
                value={v.molecularWeight}
                onChange={(value) => set('molecularWeight', value)}
                w={320}
                {...inputBlue}
              />
              <Text pb="sm" size="sm">
                g/mol
              </Text>
            </Group>
          )}
        </Stack>

        <Paper p="sm" radius="sm" mt="md" bg="var(--mantine-color-gray-0)" withBorder>
          <Text size="sm" ff="monospace" ta="center">
            C₁ × V₁ = C₂ × V₂{solved ? `   →   ${REARRANGEMENTS[solved.term]}` : ''}
          </Text>
        </Paper>

        <IssueList issues={issues} />
      </Paper>

      {/*
        The instruction, not the algebra. "Take 1 mL and make up to 10 mL" is a
        sentence you have to translate at the bench; "take 1 mL and add 9 mL"
        is one you can follow.
      */}
      {diluent && !diluent.impossible && v1Ml !== undefined && (
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">
            At the bench
          </Text>
          <Text size="sm">
            Take{' '}
            <strong>
              {roundTo(mlToVolumeUnit(v1Ml, v.v1Unit), 6)} {concentrationOrVolumeLabel('v1')}
            </strong>{' '}
            of the stock and add{' '}
            <strong>
              {roundTo(mlToVolumeUnit(diluent.diluentMl, v.v2Unit), 6)}{' '}
              {concentrationOrVolumeLabel('v2')}
            </strong>{' '}
            of diluent, for{' '}
            <strong>
              {roundTo(mlToVolumeUnit(v2Ml, v.v2Unit), 6)} {concentrationOrVolumeLabel('v2')}
            </strong>{' '}
            in total.
            {factor && (
              <>
                {' '}
                That is a <strong>{roundTo(factor.fold, 6)}-fold</strong> dilution
                {Number.isFinite(factor.fold) && factor.fold >= 1 && (
                  <> ({`1:${roundTo(factor.fold, 6)}`})</>
                )}
                .
              </>
            )}
          </Text>
        </Paper>
      )}

      {solved && (
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">
            The arithmetic
          </Text>
          <Stack gap={10}>
            <Text size="sm" ff="monospace">
              {REARRANGEMENTS[solved.term]}
            </Text>

            <div>
              <Text size="xs" c="dimmed" mb={4}>
                in the units the arithmetic uses
              </Text>
              <Stack gap={2}>
                {['c1', 'v1', 'c2', 'v2']
                  .filter((t) => t !== solved.term)
                  .map((t) => (
                    <Text key={t} size="sm" ff="monospace">
                      {t.toUpperCase()}
                      {'  '}
                      {coloured(t, displayOf(t))}
                      {displayOf(t) !== canonicalOf(t) && (
                        <>
                          {'  =  '}
                          {coloured(t, canonicalOf(t))}
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
                {solved.term.toUpperCase()} ={'  '}
                {solved.term === 'c1' && (
                  <>
                    ({coloured('c2', canonicalOf('c2'))} × {coloured('v2', canonicalOf('v2'))}) ÷{' '}
                    {coloured('v1', canonicalOf('v1'))}
                  </>
                )}
                {solved.term === 'v1' && (
                  <>
                    ({coloured('c2', canonicalOf('c2'))} × {coloured('v2', canonicalOf('v2'))}) ÷{' '}
                    {coloured('c1', canonicalOf('c1'))}
                  </>
                )}
                {solved.term === 'c2' && (
                  <>
                    ({coloured('c1', canonicalOf('c1'))} × {coloured('v1', canonicalOf('v1'))}) ÷{' '}
                    {coloured('v2', canonicalOf('v2'))}
                  </>
                )}
                {solved.term === 'v2' && (
                  <>
                    ({coloured('c1', canonicalOf('c1'))} × {coloured('v1', canonicalOf('v1'))}) ÷{' '}
                    {coloured('c2', canonicalOf('c2'))}
                  </>
                )}
              </Text>
            </div>

            <Divider />

            <div>
              <Text size="xs" c="dimmed" mb={4}>
                which gives
              </Text>
              <Text size="sm" ff="monospace">
                {solved.term.toUpperCase()} ={'  '}
                {coloured(solved.term, canonicalOf(solved.term))}
                {displayOf(solved.term) !== canonicalOf(solved.term) && (
                  <>
                    {'  =  '}
                    {coloured(solved.term, displayOf(solved.term))}
                  </>
                )}
              </Text>
            </div>
          </Stack>
        </Paper>
      )}

      <PrintActions title="dilution calculator" />
    </Stack>
  );
}
