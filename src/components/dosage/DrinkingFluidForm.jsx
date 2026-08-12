import { useMemo, useState } from 'react';
import { Group, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  bottleVolumeMl as computeBottleVolumeMl,
  concentrationForDosePerDay,
  deliveredDoseMgPerDay,
  deliveredDoseMgPerKgPerDay,
} from '../../dosage/computeDrinkingFluid';
import { computeVehicleVolumes } from '../../dosage/computeVehicleVolumes';
import { MASS_PER_ML_UNITS } from '../../dosage/dosageTypes';
import { MOLAR_CONCENTRATION_UNITS, anyConcentrationToMgPerMl } from '../../dosage/molarUnits';
import { roundTo, toOptionalNumber, toPositiveNumber } from '../../dosage/numberUtils';
import { PREPARATION_MODES } from '../../dosage/preparationModes';
import { makeSolute, soluteDosesMg as computeSoluteDosesMg } from '../../dosage/solutes';
import { weightToKg } from '../../dosage/unitConversions';
import useOutputFeedback from '../../hooks/useOutputFeedback';
import LabSelect from '../LabSelect';
import SolutesSection from './SolutesSection';
import PreparationModeControl from './PreparationModeControl';
import DrinkingParametersSection from './DrinkingParametersSection';
import VehicleRatioTable from './VehicleRatioTable';
import DissolutionTable from './DissolutionTable';
import IntakeSensitivityTable from './IntakeSensitivityTable';
import PrintActions from './PrintActions';
import { inputFieldColor } from '../../theme';

const inputBlue = { variant: 'filled', color: inputFieldColor };

/** Water: whatever else goes in, this is what the animal came for. */
const POWDER_ROWS = [{ vehicleId: 'water', parts: '1' }];

const STOCK_ROWS = [
  { vehicleId: 'dmso', parts: '1', isStock: true },
  { vehicleId: 'water', parts: '99' },
];

export default function DrinkingFluidForm() {
  const form = useForm({
    initialValues: {
      preparation: PREPARATION_MODES.none,
      direction: 'target',
      intakeMlPerDay: '',
      animalsPerBottle: 1,
      daysBetweenChanges: 3,
      bottleCount: '',
      wasteBufferPct: 0,
      bodyMassMode: 'average',
      avgBodyWeight: '',
      avgBodyWeightUnit: 'g',
      totalBodyMass: '',
      subjectCount: '',
      pipetteMinUl: 2,
      knownConcentrationValue: '',
      knownConcentrationUnit: 'mg/ml',
      intakeFrom: '',
      intakeTo: '',
      intakeStep: 0.5,
      stockAvailableMl: '',
    },
  });
  const v = form.values;

  const [solutes, setSolutes] = useState(() => [makeSolute()]);
  const [vehicleRows, setVehicleRows] = useState(POWDER_ROWS);
  const [outputFeedback, scheduleOutputFeedback] = useOutputFeedback();

  const isTargetDirection = v.direction === 'target';
  const isStock = v.preparation === PREPARATION_MODES.stock;
  const buildsAVehicle = v.preparation !== PREPARATION_MODES.working;
  const soleSolute = solutes.length === 1 ? solutes[0] : undefined;

  const effectiveAvgBodyWeight = useMemo(() => {
    if (v.bodyMassMode !== 'total') return v.avgBodyWeight;
    const total = toPositiveNumber(v.totalBodyMass);
    const subjects = toPositiveNumber(v.subjectCount);
    if (total === undefined || subjects === undefined) return '';
    return total / subjects;
  }, [v.bodyMassMode, v.avgBodyWeight, v.totalBodyMass, v.subjectCount]);

  const derivedAverage =
    v.bodyMassMode === 'total' && effectiveAvgBodyWeight !== ''
      ? roundTo(Number(effectiveAvgBodyWeight), 4)
      : undefined;

  const bodyWeightKg = weightToKg(effectiveAvgBodyWeight, v.avgBodyWeightUnit);
  const intake = toPositiveNumber(v.intakeMlPerDay);

  const changePreparation = (next) => {
    form.setFieldValue('preparation', next);
    if (next === PREPARATION_MODES.stock) setVehicleRows(STOCK_ROWS);
    else if (next === PREPARATION_MODES.none) setVehicleRows(POWDER_ROWS);
    scheduleOutputFeedback();
  };

  /**
   * The dose the protocol asks for, per subject per day.
   *
   * Step 1's "dose by body weight" means mg per kg here as everywhere, and the
   * period is the day — which is stated in the step rather than folded into a
   * fourth dosage type nobody outside this page would ever pick.
   */
  const targetDosesMgPerDay = useMemo(
    () =>
      computeSoluteDosesMg(solutes, {
        avgBodyWeight: effectiveAvgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
      }),
    [solutes, effectiveAvgBodyWeight, v.avgBodyWeightUnit],
  );

  /**
   * Concentration, from whichever end the user started.
   *
   * Forwards: a target dose and a measured intake give the concentration to
   * make. Backwards: a bottle already made up gives the dose it delivers.
   */
  const concentrationsMgPerMl = useMemo(() => {
    if (!isTargetDirection) {
      const known = anyConcentrationToMgPerMl(
        v.knownConcentrationValue,
        v.knownConcentrationUnit,
        soleSolute?.molecularWeight,
      );
      return solutes.map(() => known);
    }
    return targetDosesMgPerDay.map((mgPerDay) => concentrationForDosePerDay(mgPerDay, intake));
  }, [
    isTargetDirection, v.knownConcentrationValue, v.knownConcentrationUnit,
    soleSolute?.molecularWeight, solutes, targetDosesMgPerDay, intake,
  ]);

  /** What each subject actually receives, whichever way round it was entered. */
  const deliveredMgPerDay = useMemo(
    () => concentrationsMgPerMl.map((c) => deliveredDoseMgPerDay(c, intake)),
    [concentrationsMgPerMl, intake],
  );

  const deliveredRates = useMemo(
    () => concentrationsMgPerMl.map((c) => deliveredDoseMgPerKgPerDay(c, intake, bodyWeightKg)),
    [concentrationsMgPerMl, intake, bodyWeightKg],
  );

  const bottleMl = useMemo(
    () => computeBottleVolumeMl(v.intakeMlPerDay, v.animalsPerBottle, v.daysBetweenChanges),
    [v.intakeMlPerDay, v.animalsPerBottle, v.daysBetweenChanges],
  );

  const totalVolumeMl = useMemo(() => {
    const bottles = toOptionalNumber(v.bottleCount);
    const waste = toOptionalNumber(v.wasteBufferPct) ?? 0;
    if (bottleMl === undefined || bottles === undefined || bottles < 0) return undefined;
    return bottleMl * bottles * (1 + waste / 100);
  }, [bottleMl, v.bottleCount, v.wasteBufferPct]);

  /** Drug for the whole batch: concentration times the volume being made. */
  const soluteBatchMg = useMemo(
    () =>
      concentrationsMgPerMl.map((c) =>
        c === undefined || totalVolumeMl === undefined ? undefined : c * totalVolumeMl,
      ),
    [concentrationsMgPerMl, totalVolumeMl],
  );

  /** Per "dose" here means per bottle, which is what the recipe is scaled to. */
  const solutePerBottleMg = useMemo(
    () =>
      concentrationsMgPerMl.map((c) =>
        c === undefined || bottleMl === undefined ? undefined : c * bottleMl,
      ),
    [concentrationsMgPerMl, bottleMl],
  );

  const totalStockNeededMl = useMemo(() => {
    if (!isStock || totalVolumeMl === undefined) return undefined;
    const split = computeVehicleVolumes(totalVolumeMl, vehicleRows);
    const index = vehicleRows.findIndex((row) => row.isStock);
    if (!split || index === -1) return undefined;
    return split.rows[index].exactMl;
  }, [isStock, totalVolumeMl, vehicleRows]);

  const parameterIssues = useMemo(() => {
    const issues = [];
    const bottles = toOptionalNumber(v.bottleCount);
    if (bottles !== undefined && bottles === 0) {
      issues.push({
        level: 'error',
        message: 'Number of bottles is 0, so every batch figure below is zero. Enter at least 1.',
      });
    }
    return issues;
    // Sharing a bottle is said beside the field that causes it, not here: a
    // warnings-only issue panel renders collapsed, and that message
    // invalidates every per-subject figure on the page.
  }, [v.bottleCount]);

  const rateUnits = toPositiveNumber(soleSolute?.molecularWeight)
    ? [...MASS_PER_ML_UNITS, ...MOLAR_CONCENTRATION_UNITS]
    : MASS_PER_ML_UNITS;

  return (
    <Stack gap="lg" mt="md">
      <SolutesSection
        stepLabel="Step 1 — Dose per day"
        solutes={solutes}
        onSolutesChange={setSolutes}
        scheduleOutputFeedback={scheduleOutputFeedback}
        canAddSolutes={isTargetDirection}
        footer={<PreparationModeControl value={v.preparation} onChange={changePreparation} />}
      />

      <DrinkingParametersSection
        direction={v.direction}
        intakeMlPerDay={v.intakeMlPerDay}
        animalsPerBottle={v.animalsPerBottle}
        daysBetweenChanges={v.daysBetweenChanges}
        bottleCount={v.bottleCount}
        bottleVolumeMl={bottleMl}
        bodyMassMode={v.bodyMassMode}
        avgBodyWeight={v.avgBodyWeight}
        avgBodyWeightUnit={v.avgBodyWeightUnit}
        totalBodyMass={v.totalBodyMass}
        subjectCount={v.subjectCount}
        derivedAverage={derivedAverage}
        wasteBufferPct={v.wasteBufferPct}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        issues={parameterIssues}
      />

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">
          {isTargetDirection ? 'Step 3 — Concentration to make' : 'Step 3 — What that delivers'}
        </Text>

        {!isTargetDirection && (
          <Group align="flex-end" wrap="wrap" gap="sm" mb="md">
            <NumberInput
              label="Concentration in the bottle"
              placeholder="e.g. 0.05"
              min={0}
              decimalScale={6}
              value={v.knownConcentrationValue}
              onChange={(value) => form.setFieldValue('knownConcentrationValue', value)}
              onBlur={scheduleOutputFeedback}
              w={220}
              {...inputBlue}
            />
            <LabSelect
              label="Unit"
              data={rateUnits}
              value={v.knownConcentrationUnit}
              onChange={(value) => form.setFieldValue('knownConcentrationUnit', value ?? 'mg/ml')}
              onBlur={scheduleOutputFeedback}
              w={110}
            />
          </Group>
        )}

        <Stack gap={6}>
          {solutes.map((solute, i) => (
            <Text key={solute.id} size="sm">
              {solutes.length > 1 ? `${solute.name || `Solute ${i + 1}`}: ` : ''}
              {concentrationsMgPerMl[i] === undefined ? (
                <Text component="span" c="dimmed">
                  fill in the steps above
                </Text>
              ) : (
                <>
                  make the fluid{' '}
                  <strong>{roundTo(concentrationsMgPerMl[i], 6)} mg/mL</strong>{' '}
                  <Text component="span" c="dimmed">
                    ({roundTo(concentrationsMgPerMl[i] * 1000, 4)} mg/L)
                  </Text>
                  {deliveredMgPerDay[i] !== undefined && (
                    <>
                      {' → '}
                      <strong>{roundTo(deliveredMgPerDay[i] * 1000, 4)} µg per subject per day</strong>
                    </>
                  )}
                  {deliveredRates[i] !== undefined && (
                    <> , which is <strong>{roundTo(deliveredRates[i], 4)} mg/kg/day</strong></>
                  )}
                </>
              )}
            </Text>
          ))}
        </Stack>

        {/*
          Said once, plainly, on the page where it is true. Every other
          calculator here computes a dose that will be administered; this one
          computes a dose that will be offered.
        */}
        <Text size="sm" c="orange.7" mt="md">
          <strong>This dose is inferred, not administered.</strong> The animal decides how much it
          drinks, so the figures above are only as good as the intake you measured. Step 5 shows
          how far they move if it drinks more or less.
        </Text>
      </Paper>

      <VehicleRatioTable
        rows={vehicleRows}
        onRowsChange={setVehicleRows}
        route="drinking"
        stepLabel={isStock ? 'Step 4 — Dilution' : 'Step 4 — Fluid composition'}
        onBlur={scheduleOutputFeedback}
        solutes={solutes}
        soluteDosesMg={solutePerBottleMg}
        bodyWeightKg={bodyWeightKg}
        pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
        volumePerDoseUl={bottleMl === undefined ? undefined : bottleMl * 1000}
        volumeLabel="Volume per bottle"
        stockAvailableMl={isStock ? v.stockAvailableMl : undefined}
        onStockAvailableChange={
          isStock ? (value) => form.setFieldValue('stockAvailableMl', value) : undefined
        }
        totalStockNeededMl={totalStockNeededMl}
      />

      {buildsAVehicle && (
        <DissolutionTable
          outputFeedback={outputFeedback}
          totalVolumeMl={totalVolumeMl}
          solutes={solutes}
          soluteBatchMg={soluteBatchMg}
          soluteDosesMg={solutePerBottleMg}
          vehicleRows={vehicleRows}
          pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
          stepLabel="Step 5 — Recipe"
          soluteLabel={isStock ? 'of stock solution' : 'of your solute'}
          soluteIsVolume={isStock}
          soluteVolumeMl={totalStockNeededMl}
        />
      )}

      {soleSolute && (
        <IntakeSensitivityTable
          stepLabel="Step 6 — If they drink more or less"
          concentrationMgPerMl={concentrationsMgPerMl[0]}
          bodyWeightKg={bodyWeightKg}
          targetMgPerKgPerDay={deliveredRates[0]}
          referenceIntakeMlPerDay={intake}
          fromMlPerDay={v.intakeFrom}
          toMlPerDay={v.intakeTo}
          stepMlPerDay={v.intakeStep}
          setFieldValue={form.setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />
      )}

      <PrintActions title="drinking fluid dosing calculator" />
    </Stack>
  );
}
