import { useMemo, useState } from 'react';
import { Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { computeSoluteRequiredMg } from '../../dosage/computeSolutionOutputs';
import { computeVehicleVolumes } from '../../dosage/computeVehicleVolumes';
import { concentrationToMgPerMl } from '../../dosage/molarUnits';
import { roundTo, toOptionalNumber, toPositiveNumber } from '../../dosage/numberUtils';
import { weightToKg } from '../../dosage/unitConversions';
import { DEFAULT_IP_VEHICLE_ROWS } from '../../dosage/vehicles';
import { MOUSE_IP_MAX_VOLUME_ML_PER_G } from '../../constants/doseUnits';
import { PREPARATION_MODES } from '../../dosage/preparationModes';
import { makeSolute, soluteDosesMg as computeSoluteDosesMg, totalDoseMg } from '../../dosage/solutes';
import useOutputFeedback from '../../hooks/useOutputFeedback';
import SolutesSection from './SolutesSection';
import SoluteBreakdown from './SoluteBreakdown';
import PreparationModeControl from './PreparationModeControl';
import InjectionParametersSection from './InjectionParametersSection';
import WorkingSolutionSection from './WorkingSolutionSection';
import VehicleRatioTable from './VehicleRatioTable';
import DissolutionTable from './DissolutionTable';
import RecipeNarrative from './RecipeNarrative';
import PrintActions from './PrintActions';

/** Powder: the published 1:1:18 ethanol : Emulphor : saline vehicle. */
const POWDER_ROWS = DEFAULT_IP_VEHICLE_ROWS;

/** Stock: the first row IS the stock. See the note in CarrierDosageForm. */
const STOCK_ROWS = [
  { vehicleId: 'dmso', parts: '1', isStock: true },
  { vehicleId: 'saline', parts: '9' },
];

export default function IntraperitonealDosageForm() {
  const form = useForm({
    initialValues: {
      preparation: PREPARATION_MODES.none,
      volPerInjMl: '',
      volPerInjWeight: '',
      volPerInjWeightUnit: 'g',
      bodyMassMode: 'average',
      avgBodyWeight: '',
      avgBodyWeightUnit: 'g',
      totalBodyMass: '',
      subjectCount: '',
      totalInjections: '',
      wasteBufferPct: 0,
      pipetteMinUl: 2,
      maxVolumeRateMlPerG: MOUSE_IP_MAX_VOLUME_ML_PER_G,
      stockAvailableMl: '',
      workingConcentrationValue: '',
      workingConcentrationMassUnit: 'mg',
      workingConcentrationVolumeUnit: 'ml',
      workingAvailableMl: '',
    },
  });
  const v = form.values;

  const [solutes, setSolutes] = useState(() => [makeSolute()]);
  const [vehicleRows, setVehicleRows] = useState(POWDER_ROWS);
  const [outputFeedback, scheduleOutputFeedback] = useOutputFeedback();
  const [units, setUnits] = useState({
    narrativeVolume: 'ml',
    narrativeDose: 'mg',
    narrativeConcMass: 'mg',
    narrativeConcVolume: 'ml',
  });
  const setUnit = (key, value) => setUnits((prev) => ({ ...prev, [key]: value }));

  /** A weighed total is exact; everything downstream still wants one average. */
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

  const soluteDosesMg = useMemo(
    () =>
      computeSoluteDosesMg(solutes, {
        avgBodyWeight: effectiveAvgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
      }),
    [solutes, effectiveAvgBodyWeight, v.avgBodyWeightUnit],
  );
  const dosePerAvgSubjectMg = totalDoseMg(soluteDosesMg);
  const soleSolute = solutes.length === 1 ? solutes[0] : undefined;

  const bodyWeightKg = weightToKg(effectiveAvgBodyWeight, v.avgBodyWeightUnit);

  /** In working mode the concentration is given; otherwise it is derived. */
  const workingConcentrationMgPerMl = toPositiveNumber(
    concentrationToMgPerMl(
      v.workingConcentrationValue,
      v.workingConcentrationMassUnit,
      v.workingConcentrationVolumeUnit,
      soleSolute?.molecularWeight,
    ),
  );

  /**
   * Volume per subject, in millilitres.
   *
   * Formulating from powder or stock, this is the protocol's rate times the
   * animal: 5 mL/kg of a 25 g mouse is 0.125 mL. With a finished solution it is
   * the other way round — dose divided by the concentration already in the
   * bottle — and no rate can change it.
   */
  const volumePerSubjectMl = useMemo(() => {
    if (isWorking) {
      if (dosePerAvgSubjectMg === undefined || workingConcentrationMgPerMl === undefined) {
        return undefined;
      }
      return dosePerAvgSubjectMg / workingConcentrationMgPerMl;
    }
    const rateMl = toPositiveNumber(v.volPerInjMl);
    const refKg = weightToKg(v.volPerInjWeight, v.volPerInjWeightUnit);
    if (rateMl === undefined || refKg === undefined || refKg <= 0) return undefined;
    if (bodyWeightKg === undefined) return undefined;
    return (rateMl / refKg) * bodyWeightKg;
  }, [
    isWorking, dosePerAvgSubjectMg, workingConcentrationMgPerMl, v.volPerInjMl,
    v.volPerInjWeight, v.volPerInjWeightUnit, bodyWeightKg,
  ]);

  /** The tolerated ceiling for this animal, from the rate the user set. */
  const maxVolumePerSubjectMl = useMemo(() => {
    const rate = toPositiveNumber(v.maxVolumeRateMlPerG);
    if (rate === undefined || bodyWeightKg === undefined) return undefined;
    return rate * bodyWeightKg * 1000; // mL per gram x grams
  }, [v.maxVolumeRateMlPerG, bodyWeightKg]);

  const totalVolumeMl = useMemo(() => {
    const injections = toOptionalNumber(v.totalInjections);
    const waste = toOptionalNumber(v.wasteBufferPct) ?? 0;
    if (volumePerSubjectMl === undefined || injections === undefined || injections < 0) {
      return undefined;
    }
    return volumePerSubjectMl * injections * (1 + waste / 100);
  }, [volumePerSubjectMl, v.totalInjections, v.wasteBufferPct]);

  /** How much of each substance the whole batch needs, in order. */
  const soluteBatchMg = useMemo(
    () => soluteDosesMg.map((mg) => computeSoluteRequiredMg(mg, v.totalInjections, v.wasteBufferPct)),
    [soluteDosesMg, v.totalInjections, v.wasteBufferPct],
  );

  /** How much stock the whole batch consumes — the stock row's share of it. */
  const totalStockNeededMl = useMemo(() => {
    if (!isStock || totalVolumeMl === undefined) return undefined;
    const split = computeVehicleVolumes(totalVolumeMl, vehicleRows);
    const index = vehicleRows.findIndex((row) => row.isStock);
    if (!split || index === -1) return undefined;
    return split.rows[index].exactMl;
  }, [isStock, totalVolumeMl, vehicleRows]);

  const concentrationMgPerMl = isWorking
    ? workingConcentrationMgPerMl
    : dosePerAvgSubjectMg !== undefined && volumePerSubjectMl !== undefined && volumePerSubjectMl > 0
      ? dosePerAvgSubjectMg / volumePerSubjectMl
      : undefined;

  const achievedDoseRateMgPerKg =
    dosePerAvgSubjectMg !== undefined && bodyWeightKg !== undefined && bodyWeightKg > 0
      ? dosePerAvgSubjectMg / bodyWeightKg
      : undefined;

  const parameterIssues = useMemo(() => {
    const issues = [];
    const injections = toOptionalNumber(v.totalInjections);
    if (injections !== undefined && injections === 0) {
      issues.push({
        level: 'error',
        message: 'Number of injections is 0, so every batch figure below is zero. Enter at least 1.',
      });
    }
    if (
      volumePerSubjectMl !== undefined &&
      maxVolumePerSubjectMl !== undefined &&
      volumePerSubjectMl > maxVolumePerSubjectMl
    ) {
      issues.push({
        level: 'error',
        message:
          `Volume per subject is ${roundTo(volumePerSubjectMl, 4)} mL, above the ` +
          `${roundTo(maxVolumePerSubjectMl, 4)} mL ceiling for a ${roundTo(Number(effectiveAvgBodyWeight), 4)} ` +
          `${v.avgBodyWeightUnit} subject at ${v.maxVolumeRateMlPerG} mL/g. ` +
          'Reduce the injection volume, or use a more concentrated solution.',
      });
    }
    return issues;
  }, [
    v.totalInjections, volumePerSubjectMl, maxVolumePerSubjectMl, effectiveAvgBodyWeight,
    v.avgBodyWeightUnit, v.maxVolumeRateMlPerG,
  ]);

  const narrative = (
    <RecipeNarrative
      volumePerDoseMl={volumePerSubjectMl}
      dosePerSubjectMg={dosePerAvgSubjectMg}
      concentrationMgPerMl={concentrationMgPerMl}
      doseRateMgPerKg={achievedDoseRateMgPerKg}
      molecularWeight={soleSolute?.molecularWeight}
      units={units}
      setUnit={setUnit}
      perSoluteFooter={
        <SoluteBreakdown
          solutes={solutes}
          soluteDosesMg={soluteDosesMg}
          bodyWeightKg={bodyWeightKg}
        />
      }
    />
  );

  return (
    <Stack gap="lg" mt="md">
      <SolutesSection
        stepLabel="Step 1 — Dosage type"
        solutes={solutes}
        onSolutesChange={setSolutes}
        scheduleOutputFeedback={scheduleOutputFeedback}
        canAddSolutes={!isWorking}
        footer={<PreparationModeControl value={v.preparation} onChange={changePreparation} />}
      />

      <InjectionParametersSection
        volPerInjMl={v.volPerInjMl}
        volPerInjWeight={v.volPerInjWeight}
        volPerInjWeightUnit={v.volPerInjWeightUnit}
        bodyMassMode={v.bodyMassMode}
        avgBodyWeight={v.avgBodyWeight}
        avgBodyWeightUnit={v.avgBodyWeightUnit}
        totalBodyMass={v.totalBodyMass}
        subjectCount={v.subjectCount}
        derivedAverage={derivedAverage}
        totalInjections={v.totalInjections}
        wasteBufferPct={v.wasteBufferPct}
        pipetteMinUl={v.pipetteMinUl}
        maxVolumeRateMlPerG={v.maxVolumeRateMlPerG}
        showInjectionVolume={!isWorking}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        issues={parameterIssues}
      />

      {isWorking ? (
        <WorkingSolutionSection
          stepLabel="Step 3 — Your working solution"
          concentrationValue={v.workingConcentrationValue}
          concentrationMassUnit={v.workingConcentrationMassUnit}
          concentrationVolumeUnit={v.workingConcentrationVolumeUnit}
          molecularWeight={soleSolute?.molecularWeight}
          soluteCount={solutes.length}
          availableMl={v.workingAvailableMl}
          dosePerSubjectMg={dosePerAvgSubjectMg}
          totalDoses={v.totalInjections}
          wasteBufferPct={v.wasteBufferPct}
          syringeMinUl={0}
          maxVolumeUl={
            maxVolumePerSubjectMl === undefined ? undefined : maxVolumePerSubjectMl * 1000
          }
          setFieldValue={form.setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />
      ) : (
        <VehicleRatioTable
          rows={vehicleRows}
          onRowsChange={setVehicleRows}
          route="ip"
          stepLabel={isStock ? 'Step 3 — Dilution' : 'Step 3 — Vehicle formulation'}
          onBlur={scheduleOutputFeedback}
          solutes={solutes}
          soluteDosesMg={soluteDosesMg}
          bodyWeightKg={bodyWeightKg}
          pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
          maxVolumeUl={
            maxVolumePerSubjectMl === undefined ? undefined : maxVolumePerSubjectMl * 1000
          }
          volumePerDoseUl={
            volumePerSubjectMl === undefined ? undefined : volumePerSubjectMl * 1000
          }
          volumeLabel="Volume per injection"
          overCapacityAdvice="Reduce the injection volume, or use a more concentrated solution."
          stockAvailableMl={isStock ? v.stockAvailableMl : undefined}
          onStockAvailableChange={
            isStock ? (value) => form.setFieldValue('stockAvailableMl', value) : undefined
          }
          totalStockNeededMl={totalStockNeededMl}
        />
      )}

      {buildsAVehicle && (
        <DissolutionTable
          outputFeedback={outputFeedback}
          totalVolumeMl={totalVolumeMl}
          solutes={solutes}
          soluteBatchMg={soluteBatchMg}
          soluteDosesMg={soluteDosesMg}
          vehicleRows={vehicleRows}
          pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
          stepLabel="Step 4 — Recipe"
          soluteLabel={isStock ? 'of stock solution' : 'of your solute'}
          soluteIsVolume={isStock}
          soluteVolumeMl={totalStockNeededMl}
          footer={narrative}
        />
      )}

      {isWorking && narrative}

      <PrintActions title="intraperitoneal injection calculator" />
    </Stack>
  );
}
