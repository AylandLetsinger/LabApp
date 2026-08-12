import { useState } from 'react';
import {
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { DOSE_UNITS, VOLUME_UNITS } from '../../constants/doseUnits';
import { MASS_PER_ML_UNITS } from '../../dosage/dosageTypes';
import { MOLAR_CONCENTRATION_UNITS, anyConcentrationToMgPerMl } from '../../dosage/molarUnits';
import { massToMg, volumeToMl } from '../../dosage/unitConversions';
import { roundTo, toPositiveNumber } from '../../dosage/numberUtils';
import {
  planDilutionSeries,
  powderUsed,
  stockConcentrationMgPerMl,
  suggestIntermediateVolumeMl,
} from '../../stock/computeStockPlan';
import LabSelect from '../LabSelect';
import IssueList from '../dosage/IssueList';
import PrintActions from '../dosage/PrintActions';
import { errorColor, inputFieldColor } from '../../theme';

const inputBlue = { variant: 'filled', color: inputFieldColor };

/** Volumes span microlitres to millilitres here, so pick per value. */
function auto(ml) {
  if (ml === undefined || !Number.isFinite(ml)) return '—';
  if (Math.abs(ml) < 0.001) return `${roundTo(ml * 1e6, 3)} nL`;
  if (Math.abs(ml) < 1) return `${roundTo(ml * 1000, 3)} µL`;
  return `${roundTo(ml, 4)} mL`;
}

/** Concentrations here run to 1e-6 mg/mL, where decimals stop being readable. */
function concentration(mgPerMl) {
  if (mgPerMl === undefined || !Number.isFinite(mgPerMl)) return '—';
  if (mgPerMl >= 0.01) return `${roundTo(mgPerMl, 5)} mg/mL`;
  if (mgPerMl >= 1e-5) return `${roundTo(mgPerMl * 1000, 4)} µg/mL`;
  return `${roundTo(mgPerMl * 1e6, 4)} ng/mL`;
}

const BLANK = {
  drugName: '',
  molecularWeight: '',
  massAvailable: '',
  massAvailableUnit: 'mg',
  targetConcentration: '',
  targetConcentrationUnit: 'nM',
  volumePerApplication: 2,
  volumePerApplicationUnit: 'ml',
  applications: 1,
  massToWeigh: 1,
  massToWeighUnit: 'mg',
  stockVolume: 10,
  stockVolumeUnit: 'ml',
  intermediateVolume: 1,
  intermediateVolumeUnit: 'ml',
  balanceMin: 1,
  balanceMinUnit: 'mg',
  pipetteMinUl: 2,
  maxFold: 100,
};

/**
 * Planning the walk from a tube of powder to a nanomolar working solution.
 *
 * The arithmetic and the reasoning behind the step count are in
 * src/stock/computeStockPlan.js and are covered by tests. This file is layout
 * and unit handling; nothing here decides a plan.
 */
export default function StockPlanCalculator() {
  const [v, setV] = useState(BLANK);
  const set = (key, value) => setV((prev) => ({ ...prev, [key]: value }));
  const reset = () => setV(BLANK);

  const mw = toPositiveNumber(v.molecularWeight);
  const targetMgPerMl = anyConcentrationToMgPerMl(
    v.targetConcentration,
    v.targetConcentrationUnit,
    mw,
  );

  const perApplicationMl = volumeToMl(v.volumePerApplication, v.volumePerApplicationUnit);
  const applications = toPositiveNumber(v.applications) ?? 1;
  const workingVolumeMl =
    perApplicationMl === undefined ? undefined : perApplicationMl * applications;

  const massToWeighMg = massToMg(v.massToWeigh, v.massToWeighUnit);
  const stockVolumeMl = volumeToMl(v.stockVolume, v.stockVolumeUnit);
  const stockMgPerMl = stockConcentrationMgPerMl(massToWeighMg, stockVolumeMl);

  const pipetteMinMl = (toPositiveNumber(v.pipetteMinUl) ?? 0) / 1000;
  const intermediateMl = volumeToMl(v.intermediateVolume, v.intermediateVolumeUnit);

  const plan = planDilutionSeries({
    stockMgPerMl,
    targetMgPerMl,
    workingVolumeMl,
    intermediateVolumeMl: intermediateMl,
    pipetteMinMl,
    maxFoldPerStep: toPositiveNumber(v.maxFold) ?? 100,
  });

  const balanceMinMg = massToMg(v.balanceMin, v.balanceMinUnit);
  const powder = powderUsed(massToWeighMg, massToMg(v.massAvailable, v.massAvailableUnit));

  // What the target actually amounts to, which is usually the surprise.
  const massInWorkingMg =
    targetMgPerMl !== undefined && workingVolumeMl !== undefined
      ? targetMgPerMl * workingVolumeMl
      : undefined;

  const suggestedIntermediateMl =
    plan && plan.foldPerStep > 1
      ? suggestIntermediateVolumeMl(plan.foldPerStep, pipetteMinMl)
      : undefined;

  const issues = [];
  if (balanceMinMg !== undefined && massToWeighMg !== undefined && massToWeighMg < balanceMinMg) {
    issues.push({
      level: 'error',
      message:
        `Weighing ${roundTo(massToWeighMg, 6)} mg is below the ${roundTo(balanceMinMg, 6)} mg your ` +
        'balance resolves. That does not make a more dilute stock, it makes one whose ' +
        'concentration you do not know. Weigh the minimum into more solvent instead.',
    });
  }
  if (powder.leftMg !== undefined && powder.leftMg < 0) {
    issues.push({
      level: 'error',
      message:
        `This weighs out ${roundTo(massToWeighMg, 6)} mg but you only have ` +
        `${roundTo(massToMg(v.massAvailable, v.massAvailableUnit), 6)} mg.`,
    });
  }
  if (plan?.stockTooWeak) {
    issues.push({
      level: 'error',
      message:
        'The stock is already at or below the concentration you want, so no dilution reaches it. ' +
        'Weigh more powder, or dissolve it in less.',
    });
  }
  if (plan?.tooManySteps) {
    issues.push({
      level: 'error',
      message:
        'This needs more dilution steps than anyone would carry out accurately. Make a weaker ' +
        'stock — the same weighing in more solvent — or allow a larger fold per step.',
    });
  }
  if (plan?.steps.some((s) => s.belowPipetteMinimum)) {
    issues.push({
      level: 'error',
      message:
        `Some transfers are below the ${v.pipetteMinUl} µL your pipette can deliver. Make each ` +
        `intermediate larger — ${auto(suggestedIntermediateMl)} would clear it — or use more steps ` +
        'by lowering the fold per step.',
    });
  }

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" align="center" wrap="nowrap" mb="sm">
          <Text fw={600}>Step 1 — What you are making, and what you have</Text>
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

        <Stack gap="md">
          <Group align="flex-end" wrap="wrap" gap="sm">
            <TextInput
              label="Compound"
              placeholder="e.g. MLA"
              value={v.drugName}
              onChange={(e) => set('drugName', e.currentTarget.value)}
              w={200}
              {...inputBlue}
            />
            <NumberInput
              label="Molecular weight"
              placeholder="needed for molar targets"
              min={0}
              decimalScale={4}
              value={v.molecularWeight}
              onChange={(value) => set('molecularWeight', value)}
              w={230}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              g/mol
            </Text>
          </Group>

          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Target concentration"
              placeholder="e.g. 10"
              min={0}
              decimalScale={8}
              value={v.targetConcentration}
              onChange={(value) => set('targetConcentration', value)}
              w={200}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={mw ? [...MASS_PER_ML_UNITS, ...MOLAR_CONCENTRATION_UNITS] : MASS_PER_ML_UNITS}
              value={v.targetConcentrationUnit}
              onChange={(value) => set('targetConcentrationUnit', value ?? 'nM')}
              w={110}
            />
            <NumberInput
              label="Volume per application"
              placeholder="e.g. 2"
              min={0}
              decimalScale={6}
              value={v.volumePerApplication}
              onChange={(value) => set('volumePerApplication', value)}
              w={190}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={VOLUME_UNITS}
              value={v.volumePerApplicationUnit}
              onChange={(value) => set('volumePerApplicationUnit', value ?? 'ml')}
              w={100}
            />
            <NumberInput
              label="Applications"
              placeholder="1"
              min={1}
              allowDecimal={false}
              value={v.applications}
              onChange={(value) => set('applications', value)}
              w={130}
              {...inputBlue}
            />
          </Group>

          {/*
            The number that explains why any of this is necessary. Ten
            nanograms is not a weighing, it is a rounding error on a balance.
          */}
          {massInWorkingMg !== undefined && (
            <Text size="sm" c="dimmed">
              All {auto(workingVolumeMl)} of that contains{' '}
              <strong>
                {massInWorkingMg < 0.001
                  ? `${roundTo(massInWorkingMg * 1e6, 4)} ng`
                  : `${roundTo(massInWorkingMg * 1000, 4)} µg`}
              </strong>{' '}
              of {v.drugName?.trim() || 'compound'} — which is why it cannot simply be weighed out.
            </Text>
          )}

          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Powder you have"
              placeholder="optional, e.g. 5"
              min={0}
              decimalScale={6}
              value={v.massAvailable}
              onChange={(value) => set('massAvailable', value)}
              w={190}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={DOSE_UNITS}
              value={v.massAvailableUnit}
              onChange={(value) => set('massAvailableUnit', value ?? 'mg')}
              w={100}
            />
            {powder.leftMg !== undefined && powder.leftMg >= 0 && (
              <Text pb="sm" size="sm" c="dimmed">
                &rarr; <strong>{roundTo(powder.leftMg, 4)} mg</strong> left after this
              </Text>
            )}
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">
          Step 2 — Your limits
        </Text>
        <Text size="sm" c="dimmed" mb="md" className="no-print">
          These decide the plan. The balance sets how dilute a stock one weighing can honestly
          make; the pipette sets how large a single step can be; the fold cap keeps any one step
          from carrying the whole error.
        </Text>

        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Balance reads down to"
            placeholder="e.g. 1"
            min={0}
            decimalScale={6}
            value={v.balanceMin}
            onChange={(value) => set('balanceMin', value)}
            w={190}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={DOSE_UNITS}
            value={v.balanceMinUnit}
            onChange={(value) => set('balanceMinUnit', value ?? 'mg')}
            w={100}
          />
          <NumberInput
            label="Pipette minimum"
            placeholder="e.g. 2"
            min={0}
            decimalScale={3}
            value={v.pipetteMinUl}
            onChange={(value) => set('pipetteMinUl', value)}
            w={160}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            µL
          </Text>
          <NumberInput
            label="Largest single step"
            placeholder="e.g. 100"
            min={1}
            decimalScale={2}
            value={v.maxFold}
            onChange={(value) => set('maxFold', value)}
            w={170}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            ×
          </Text>
        </Group>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">
          Step 3 — The stock
        </Text>

        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Weigh out"
            placeholder="e.g. 1"
            min={0}
            decimalScale={6}
            value={v.massToWeigh}
            onChange={(value) => set('massToWeigh', value)}
            w={160}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={DOSE_UNITS}
            value={v.massToWeighUnit}
            onChange={(value) => set('massToWeighUnit', value ?? 'mg')}
            w={100}
          />
          <Text pb="sm" size="sm">
            into
          </Text>
          <NumberInput
            label="Solvent"
            placeholder="e.g. 10"
            min={0}
            decimalScale={6}
            value={v.stockVolume}
            onChange={(value) => set('stockVolume', value)}
            w={160}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={VOLUME_UNITS}
            value={v.stockVolumeUnit}
            onChange={(value) => set('stockVolumeUnit', value ?? 'ml')}
            w={100}
          />
          {stockMgPerMl !== undefined && (
            <Text pb="sm" size="sm" c="dimmed">
              &rarr; <strong>{concentration(stockMgPerMl)}</strong>
            </Text>
          )}
        </Group>
        <Text size="xs" c="dimmed" mt={6} className="no-print">
          * dissolving the same weighing in more solvent is the honest way to a weaker stock, and
          it is what removes a dilution step
        </Text>

        <Group align="flex-end" wrap="wrap" gap="sm" mt="md">
          <NumberInput
            label="Make each intermediate"
            placeholder="e.g. 1"
            min={0}
            decimalScale={6}
            value={v.intermediateVolume}
            onChange={(value) => set('intermediateVolume', value)}
            w={200}
            {...inputBlue}
          />
          <LabSelect
            label="Unit"
            data={VOLUME_UNITS}
            value={v.intermediateVolumeUnit}
            onChange={(value) => set('intermediateVolumeUnit', value ?? 'ml')}
            w={100}
          />
          {suggestedIntermediateMl !== undefined && (
            <Text pb="sm" size="sm" c="dimmed">
              &rarr; at least {auto(suggestedIntermediateMl)} keeps every transfer off the pipette
              floor
            </Text>
          )}
        </Group>

        <IssueList issues={issues} />
      </Paper>

      {plan && plan.steps.length > 0 && (
        <Paper p="md" radius="md" withBorder className="allow-break">
          <Text fw={600} mb="sm">
            Step 4 — The plan
          </Text>
          <Text size="sm" c="dimmed" mb="md" className="no-print">
            {roundTo(plan.totalFold, 1)}-fold in total, split into {plan.steps.length} equal steps
            of about {roundTo(plan.foldPerStep, 2)}× each. Equal steps keep any one pipetting error
            from being multiplied by everything after it.
          </Text>

          <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder withColumnBorders striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th ta="left">Step</Table.Th>
                <Table.Th ta="left">Take</Table.Th>
                <Table.Th ta="left">Into diluent</Table.Th>
                <Table.Th ta="left">Makes</Table.Th>
                <Table.Th ta="left">Which is</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Text size="sm" fw={600}>
                    Stock
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {roundTo(massToWeighMg ?? 0, 6)} mg
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {auto(stockVolumeMl)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {auto(stockVolumeMl)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace" fw={600}>
                    {concentration(stockMgPerMl)}
                  </Text>
                </Table.Td>
              </Table.Tr>
              {plan.steps.map((s) => (
                <Table.Tr key={s.index}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {s.isLast ? 'Final' : s.index}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      ff="monospace"
                      fw={600}
                      c={s.belowPipetteMinimum ? errorColor : undefined}
                    >
                      {auto(s.transferMl)}
                      {s.belowPipetteMinimum ? ' — below pipette' : ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {auto(s.diluentMl)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {auto(s.finalVolumeMl)}
                      {s.isLast ? ' (the application)' : ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={600}>
                      {concentration(s.toMgPerMl)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Text size="sm" mt="md">
            Each step takes from the one above it. Only the stock costs powder —{' '}
            <strong>{roundTo(massToWeighMg ?? 0, 6)} mg</strong> — and everything after it spends a
            fraction of a millilitre of something you already made.
          </Text>
        </Paper>
      )}

      <PrintActions title="stock solution planner" />
    </Stack>
  );
}
