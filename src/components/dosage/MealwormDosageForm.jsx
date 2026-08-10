import { useEffect, useMemo, useState } from 'react';
import { Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { computeDosePerAvgSubjectMg } from '../../dosage/computeDosePerAvgSubject';
import { computeDoseRateMgPerG } from '../../dosage/computeMealwormOutputs';
import { computeSoluteRequiredMg } from '../../dosage/computeSolutionOutputs';
import {
  computeVehicleVolumes,
  suggestedDoseVolumeUl,
} from '../../dosage/computeVehicleVolumes';
import { concentrationToMgPerMl } from '../../dosage/molarUnits';
import { roundTo, toOptionalNumber, toPositiveNumber } from '../../dosage/numberUtils';
import { volumeToMl, weightToKg } from '../../dosage/unitConversions';
import useOutputFeedback from '../../hooks/useOutputFeedback';
import Step2DosageTypeSection from './Step2DosageTypeSection';
import MealwormParametersSection from './MealwormParametersSection';
import MealwormDosingTable from './MealwormDosingTable';
import RecipeNarrative from './RecipeNarrative';
import PreparationModeControl from './PreparationModeControl';
import { PREPARATION_MODES } from '../../dosage/preparationModes';
import WorkingSolutionSection from './WorkingSolutionSection';
import VehicleRatioTable from './VehicleRatioTable';
import DissolutionTable from './DissolutionTable';
import PrintActions from './PrintActions';

/** Powder: one solvent to start with, and the user adds what they need. */
const POWDER_ROWS = [{ vehicleId: 'saline', parts: '1' }];

/**
 * Stock: the first row IS the stock. Its concentration plays exactly the part
 * solubility plays for powder — volume required = dose / concentration — so
 * the whole vehicle table works on it unchanged. `vehicleId` records what the
 * stock is dissolved in, which is what lets the solvent it carries appear in
 * the burden and miscibility checks instead of vanishing.
 */
const STOCK_ROWS = [
  { vehicleId: 'dmso', parts: '1', solubilityMgPerMl: '', isStock: true },
  { vehicleId: 'saline', parts: '9' },
];

export default function MealwormDosageForm() {
  const form = useForm({
    initialValues: {
      preparation: PREPARATION_MODES.none,
      dosageType: 'by-body-weight',
      dosePerSubject: '',
      dosePerSubjectUnit: 'mg',
      doseAmount: '',
      doseUnit: 'mg',
      bodyWeightAmount: '',
      bodyWeightUnit: 'kg',
      molecularWeight: '',
      wormCapacityUl: 100,
      loadVolumeUl: '',
      stockAvailableMl: '',
      workingConcentrationValue: '',
      workingConcentrationMassUnit: 'mg',
      workingConcentrationVolumeUnit: 'ml',
      workingAvailableMl: '',
      bodyMassMode: 'average',
      avgBodyWeight: '',
      avgBodyWeightUnit: 'g',
      totalBodyMass: '',
      subjectCount: '',
      totalDoses: '',
      wasteBufferPct: 0,
      // Two tools, two floors: the insulin syringe loads the worm, the pipette
      // makes up the vehicle.
      syringeMinUl: 25,
      pipetteMinUl: 2,
      minBodyWeightG: 18,
      maxBodyWeightG: 35,
      stepG: 1,
    },
  });
  const v = form.values;

  const [vehicleRows, setVehicleRows] = useState(POWDER_ROWS);
  const [outputFeedback, scheduleOutputFeedback] = useOutputFeedback();
  const [units, setUnits] = useState({
    dosePerSubject: 'mg',
    solute: 'mg',
    loadVolume: 'ul',
    totalVolume: 'ml',
    narrativeVolume: 'ul',
    narrativeDose: 'mg',
    narrativeConcMass: 'mg',
    narrativeConcVolume: 'ml',
  });
  const setUnit = (key, value) => setUnits((prev) => ({ ...prev, [key]: value }));

  /**
   * Whichever way the body mass was entered, everything downstream wants one
   * number: the average. A total is exact when every subject was weighed, so
   * it is worth supporting — but it is converted here rather than threaded
   * through as a second code path.
   */
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

  const isStock = v.preparation === PREPARATION_MODES.stock;
  const isWorking = v.preparation === PREPARATION_MODES.working;
  const buildsAVehicle = !isWorking;

  /** Switching what you start with changes what the table means, so reset it. */
  const changePreparation = (next) => {
    form.setFieldValue('preparation', next);
    if (next === PREPARATION_MODES.stock) setVehicleRows(STOCK_ROWS);
    else if (next === PREPARATION_MODES.none) setVehicleRows(POWDER_ROWS);
    scheduleOutputFeedback();
  };

  const dosePerSubjectMg = useMemo(
    () =>
      computeDosePerAvgSubjectMg({
        dosageType: v.dosageType,
        doseAmount: v.doseAmount,
        doseUnit: v.doseUnit,
        refBodyWeight: v.bodyWeightAmount,
        refBodyWeightUnit: v.bodyWeightUnit,
        avgBodyWeight: effectiveAvgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
        dosePerSubject: v.dosePerSubject,
        dosePerSubjectUnit: v.dosePerSubjectUnit,
        molecularWeightGPerMol: v.molecularWeight,
      }),
    [
      v.dosageType, v.doseAmount, v.doseUnit, v.bodyWeightAmount, v.bodyWeightUnit,
      effectiveAvgBodyWeight, v.avgBodyWeightUnit, v.dosePerSubject, v.dosePerSubjectUnit,
      v.molecularWeight,
    ],
  );

  const doseRateMgPerG = useMemo(
    () =>
      v.dosageType === 'by-body-weight'
        ? computeDoseRateMgPerG({
            doseAmount: v.doseAmount,
            doseUnit: v.doseUnit,
            refBodyWeight: v.bodyWeightAmount,
            refBodyWeightUnit: v.bodyWeightUnit,
            molecularWeightGPerMol: v.molecularWeight,
          })
        : undefined,
    [v.dosageType, v.doseAmount, v.doseUnit, v.bodyWeightAmount, v.bodyWeightUnit, v.molecularWeight],
  );

  const suggestedUl = suggestedDoseVolumeUl(vehicleRows, dosePerSubjectMg, Number(v.syringeMinUl), v.molecularWeight);

  // Keep the dose volume a REAL value in the field rather than a placeholder,
  // so the stepper increments from it instead of jumping to zero. Rewritten
  // whenever the suggestion moves; the field flashes to say so.
  const roundedSuggestion = suggestedUl > 0 ? roundTo(suggestedUl, 3) : '';
  useEffect(() => {
    if (roundedSuggestion !== '') form.setFieldValue('loadVolumeUl', roundedSuggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundedSuggestion]);

  const typedUl = toOptionalNumber(v.loadVolumeUl);
  const effectiveLoadUl = typedUl !== undefined && typedUl > 0 ? typedUl : suggestedUl || undefined;

  const totalVolumeMl = useMemo(() => {
    const loadMl = volumeToMl(effectiveLoadUl, 'ul');
    const doses = toOptionalNumber(v.totalDoses);
    const waste = toOptionalNumber(v.wasteBufferPct) ?? 0;
    if (loadMl === undefined || doses === undefined || doses < 0) return undefined;
    return loadMl * doses * (1 + waste / 100);
  }, [effectiveLoadUl, v.totalDoses, v.wasteBufferPct]);

  const soluteRequiredMg = useMemo(
    () => computeSoluteRequiredMg(dosePerSubjectMg, v.totalDoses, v.wasteBufferPct),
    [dosePerSubjectMg, v.totalDoses, v.wasteBufferPct],
  );

  /** How much stock the whole batch consumes — the stock row's share of it. */
  const totalStockNeededMl = useMemo(() => {
    if (!isStock || totalVolumeMl === undefined) return undefined;
    const split = computeVehicleVolumes(totalVolumeMl, vehicleRows);
    const index = vehicleRows.findIndex((row) => row.isStock);
    if (!split || index === -1) return undefined;
    return split.rows[index].exactMl;
  }, [isStock, totalVolumeMl, vehicleRows]);

  // Delivered per kilogram, derived rather than read back from the input, so
  // it is present even when nobody entered a rate. Protocols are written in
  // mg/kg, which is exactly when that matters.
  const achievedDoseRateMgPerKg = useMemo(() => {
    const kg = weightToKg(effectiveAvgBodyWeight, v.avgBodyWeightUnit);
    if (dosePerSubjectMg === undefined || kg === undefined || kg <= 0) return undefined;
    return dosePerSubjectMg / kg;
  }, [dosePerSubjectMg, effectiveAvgBodyWeight, v.avgBodyWeightUnit]);

  const parameterIssues = useMemo(() => {
    const doses = toOptionalNumber(v.totalDoses);
    if (doses !== undefined && doses === 0) {
      return [
        {
          level: 'error',
          message: 'Number of dosages is 0, so every batch figure below is zero. Enter at least 1.',
        },
      ];
    }
    return [];
  }, [v.totalDoses]);

  /** In working mode the concentration is given; otherwise it is derived. */
  const workingConcentrationMgPerMl = toPositiveNumber(
    concentrationToMgPerMl(
      v.workingConcentrationValue,
      v.workingConcentrationMassUnit,
      v.workingConcentrationVolumeUnit,
      v.molecularWeight,
    ),
  );

  const concentrationMgPerMl = isWorking
    ? workingConcentrationMgPerMl
    : dosePerSubjectMg !== undefined && effectiveLoadUl > 0
      ? dosePerSubjectMg / (effectiveLoadUl / 1000)
      : undefined;

  const workingVolumePerDoseUl =
    isWorking && dosePerSubjectMg !== undefined && concentrationMgPerMl !== undefined
      ? (dosePerSubjectMg / concentrationMgPerMl) * 1000
      : undefined;

  return (
    <Stack gap="lg" mt="md">
      <Step2DosageTypeSection
        stepLabel="Step 1 — Dosage type"
        dosageType={v.dosageType}
        dosePerSubject={v.dosePerSubject}
        dosePerSubjectUnit={v.dosePerSubjectUnit}
        doseAmount={v.doseAmount}
        doseUnit={v.doseUnit}
        bodyWeightAmount={v.bodyWeightAmount}
        bodyWeightUnit={v.bodyWeightUnit}
        molecularWeight={v.molecularWeight}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        footer={<PreparationModeControl value={v.preparation} onChange={changePreparation} />}
      />

      <MealwormParametersSection
        wormCapacityUl={v.wormCapacityUl}
        bodyMassMode={v.bodyMassMode}
        avgBodyWeight={v.avgBodyWeight}
        avgBodyWeightUnit={v.avgBodyWeightUnit}
        totalBodyMass={v.totalBodyMass}
        subjectCount={v.subjectCount}
        derivedAverage={derivedAverage}
        totalDoses={v.totalDoses}
        wasteBufferPct={v.wasteBufferPct}
        pipetteMinUl={v.pipetteMinUl}
        syringeMinUl={v.syringeMinUl}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        issues={parameterIssues}
        showPipetteMinimum={buildsAVehicle}
      />

      {isWorking ? (
        <WorkingSolutionSection
          stepLabel="Step 3 — Your working solution"
          concentrationValue={v.workingConcentrationValue}
          concentrationMassUnit={v.workingConcentrationMassUnit}
          concentrationVolumeUnit={v.workingConcentrationVolumeUnit}
          molecularWeight={v.molecularWeight}
          availableMl={v.workingAvailableMl}
          dosePerSubjectMg={dosePerSubjectMg}
          totalDoses={v.totalDoses}
          wasteBufferPct={v.wasteBufferPct}
          syringeMinUl={toOptionalNumber(v.syringeMinUl) ?? 0}
          maxVolumeUl={toOptionalNumber(v.wormCapacityUl)}
          setFieldValue={form.setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />
      ) : (
        <VehicleRatioTable
          rows={vehicleRows}
          onRowsChange={setVehicleRows}
          route="oral"
          stepLabel={isStock ? 'Step 3 — Dilution' : 'Step 3 — Vehicle formulation'}
          onBlur={scheduleOutputFeedback}
          dosePerSubjectMg={dosePerSubjectMg}
          bodyWeightKg={weightToKg(effectiveAvgBodyWeight, v.avgBodyWeightUnit)}
          pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
          syringeMinUl={toOptionalNumber(v.syringeMinUl) ?? 0}
          maxVolumeUl={toOptionalNumber(v.wormCapacityUl)}
          volumePerDoseUl={v.loadVolumeUl}
          onVolumePerDoseChange={(value) => form.setFieldValue('loadVolumeUl', value)}
          volumeLabel="Volume loaded per worm"
          stockAvailableMl={isStock ? v.stockAvailableMl : undefined}
          onStockAvailableChange={
            isStock ? (value) => form.setFieldValue('stockAvailableMl', value) : undefined
          }
          totalStockNeededMl={totalStockNeededMl}
          molecularWeight={v.molecularWeight}
        />
      )}

      {buildsAVehicle && (
        <DissolutionTable
          outputFeedback={outputFeedback}
          totalVolumeMl={totalVolumeMl}
          soluteRequiredMg={soluteRequiredMg}
          vehicleRows={vehicleRows}
          pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
          stepLabel="Step 4 — Recipe"
          molecularWeight={v.molecularWeight}
          soluteLabel={isStock ? 'of stock solution' : 'of your solute'}
          soluteIsVolume={isStock}
          soluteVolumeMl={totalStockNeededMl}
          footer={
            <RecipeNarrative
              volumePerDoseMl={volumeToMl(effectiveLoadUl, 'ul')}
              dosePerSubjectMg={dosePerSubjectMg}
              concentrationMgPerMl={concentrationMgPerMl}
              doseRateMgPerKg={achievedDoseRateMgPerKg}
              molecularWeight={v.molecularWeight}
              units={units}
              setUnit={setUnit}
            />
          }
        />
      )}

      {isWorking && (
        <RecipeNarrative
          volumePerDoseMl={
            workingVolumePerDoseUl === undefined ? undefined : workingVolumePerDoseUl / 1000
          }
          dosePerSubjectMg={dosePerSubjectMg}
          concentrationMgPerMl={concentrationMgPerMl}
          doseRateMgPerKg={achievedDoseRateMgPerKg}
          molecularWeight={v.molecularWeight}
          units={units}
          setUnit={setUnit}
        />
      )}

      {v.dosageType === 'by-body-weight' && (
        <MealwormDosingTable
          doseRateMgPerG={doseRateMgPerG}
          stockConcentrationMgPerMl={concentrationMgPerMl}
          minBodyWeightG={v.minBodyWeightG}
          maxBodyWeightG={v.maxBodyWeightG}
          stepG={v.stepG}
          wormCapacityUl={v.wormCapacityUl}
          syringeMinUl={v.syringeMinUl}
          setFieldValue={form.setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
          stepLabel={`Step ${isWorking ? 4 : 5} — Dosing table by body mass`}
        />
      )}

      <PrintActions title="mealworm oral dosing calculator" />
    </Stack>
  );
}
