import { useMemo, useState } from 'react';
import { Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  bolusSeconds,
  bolusVolumeMl,
  checkReservoir,
  durationToHours,
  infusionVolumeMl,
  sessionDose,
  sessionVolumeMl,
} from '../../dosage/computeIntravenous';
import { computeSoluteRequiredMg } from '../../dosage/computeSolutionOutputs';
import { computeVehicleVolumes } from '../../dosage/computeVehicleVolumes';
import { roundTo, toOptionalNumber, toPositiveNumber } from '../../dosage/numberUtils';
import { PREPARATION_MODES } from '../../dosage/preparationModes';
import { makeSolute, soluteDosesMg as computeSoluteDosesMg, totalDoseMg } from '../../dosage/solutes';
import { volumeToMl, weightToKg } from '../../dosage/unitConversions';
import useOutputFeedback from '../../hooks/useOutputFeedback';
import SolutesSection from './SolutesSection';
import SoluteBreakdown from './SoluteBreakdown';
import PreparationModeControl from './PreparationModeControl';
import IvParametersSection from './IvParametersSection';
import VehicleRatioTable from './VehicleRatioTable';
import DissolutionTable from './DissolutionTable';
import RecipeNarrative from './RecipeNarrative';
import PrintActions from './PrintActions';

/** Saline: what goes into a vein should be isotonic and boring. */
const POWDER_ROWS = [{ vehicleId: 'saline', parts: '1' }];

const STOCK_ROWS = [
  { vehicleId: 'dmso', parts: '1', isStock: true },
  { vehicleId: 'saline', parts: '9' },
];

export default function IvDoseForm() {
  const form = useForm({
    initialValues: {
      preparation: PREPARATION_MODES.none,
      deliveryMode: 'bolus',
      volPerInjMl: '',
      volPerInjWeight: 1,
      volPerInjWeightUnit: 'kg',
      infusionsPerSubject: 1,
      bolusRate: '',
      bolusRateUnit: 'ul',
      infusionRate: '',
      infusionRateUnit: 'ul',
      durationValue: '',
      durationUnit: 'hour',
      reservoirVolume: '',
      reservoirVolumeUnit: 'ul',
      bodyMassMode: 'average',
      avgBodyWeight: '',
      avgBodyWeightUnit: 'g',
      totalBodyMass: '',
      subjectCount: '',
      totalSubjects: '',
      wasteBufferPct: 0,
      pipetteMinUl: 2,
      stockAvailableMl: '',
    },
  });
  const v = form.values;

  const [solutes, setSolutes] = useState(() => [makeSolute()]);
  const [vehicleRows, setVehicleRows] = useState(POWDER_ROWS);
  const [outputFeedback, scheduleOutputFeedback] = useOutputFeedback();
  const [units, setUnits] = useState({
    narrativeVolume: 'ul',
    narrativeDose: 'mg',
    narrativeConcMass: 'mg',
    narrativeConcVolume: 'ml',
  });
  const setUnit = (key, value) => setUnits((prev) => ({ ...prev, [key]: value }));

  const isBolus = v.deliveryMode === 'bolus';
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

  const changePreparation = (next) => {
    form.setFieldValue('preparation', next);
    if (next === PREPARATION_MODES.stock) setVehicleRows(STOCK_ROWS);
    else if (next === PREPARATION_MODES.none) setVehicleRows(POWDER_ROWS);
    scheduleOutputFeedback();
  };

  const durationHours = durationToHours(v.durationValue, v.durationUnit);

  /** One bolus, scaled to the animal as an intraperitoneal dose would be. */
  const volumePerInfusionMl = useMemo(
    () =>
      isBolus
        ? bolusVolumeMl(
            v.volPerInjMl,
            weightToKg(v.volPerInjWeight, v.volPerInjWeightUnit),
            bodyWeightKg,
          )
        : undefined,
    [isBolus, v.volPerInjMl, v.volPerInjWeight, v.volPerInjWeightUnit, bodyWeightKg],
  );

  /**
   * Everything one subject receives.
   *
   * A single bolus is one infusion; a self-administration session is many, and
   * the total is what the vehicle burden and the batch are worked out from.
   */
  const totalVolumePerSubjectMl = useMemo(() => {
    if (isBolus) return sessionVolumeMl(volumePerInfusionMl, v.infusionsPerSubject);
    return infusionVolumeMl(volumeToMl(v.infusionRate, v.infusionRateUnit), durationHours);
  }, [
    isBolus, volumePerInfusionMl, v.infusionsPerSubject,
    v.infusionRate, v.infusionRateUnit, durationHours,
  ]);

  const secondsPerInfusion = useMemo(
    () =>
      isBolus
        ? bolusSeconds(volumePerInfusionMl, volumeToMl(v.bolusRate, v.bolusRateUnit))
        : undefined,
    [isBolus, volumePerInfusionMl, v.bolusRate, v.bolusRateUnit],
  );

  /** What Step 1 asks for: the dose of a single administration. */
  const unitDosesMg = useMemo(
    () =>
      computeSoluteDosesMg(solutes, {
        avgBodyWeight: effectiveAvgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
      }),
    [solutes, effectiveAvgBodyWeight, v.avgBodyWeightUnit],
  );

  /**
   * What the session comes to.
   *
   * Self-administration protocols state the unit dose — what one lever press
   * earns — and the exposure that matters is the sum. Thirty infusions of
   * 0.5 mg/kg is 15 mg/kg, which is a different conversation from 0.5.
   */
  const perSubjectDosesMg = useMemo(() => {
    if (!isBolus) return unitDosesMg;
    return unitDosesMg.map((mg) => sessionDose(mg, v.infusionsPerSubject));
  }, [isBolus, unitDosesMg, v.infusionsPerSubject]);

  const dosePerSubjectMg = totalDoseMg(perSubjectDosesMg);
  const unitDoseMg = totalDoseMg(unitDosesMg);

  const concentrationMgPerMl =
    dosePerSubjectMg !== undefined &&
    totalVolumePerSubjectMl !== undefined &&
    totalVolumePerSubjectMl > 0
      ? dosePerSubjectMg / totalVolumePerSubjectMl
      : undefined;

  const achievedDoseRateMgPerKg =
    dosePerSubjectMg !== undefined && bodyWeightKg !== undefined && bodyWeightKg > 0
      ? dosePerSubjectMg / bodyWeightKg
      : undefined;

  const totalVolumeMl = useMemo(() => {
    const subjects = toOptionalNumber(v.totalSubjects);
    const waste = toOptionalNumber(v.wasteBufferPct) ?? 0;
    if (totalVolumePerSubjectMl === undefined || subjects === undefined || subjects < 0) {
      return undefined;
    }
    return totalVolumePerSubjectMl * subjects * (1 + waste / 100);
  }, [totalVolumePerSubjectMl, v.totalSubjects, v.wasteBufferPct]);

  const soluteBatchMg = useMemo(
    () =>
      perSubjectDosesMg.map((mg) => computeSoluteRequiredMg(mg, v.totalSubjects, v.wasteBufferPct)),
    [perSubjectDosesMg, v.totalSubjects, v.wasteBufferPct],
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
    const subjects = toOptionalNumber(v.totalSubjects);
    if (subjects !== undefined && subjects === 0) {
      issues.push({
        level: 'error',
        message: 'Number of subjects is 0, so every batch figure below is zero. Enter at least 1.',
      });
    }
    if (!isBolus) {
      const reservoir = checkReservoir(
        totalVolumePerSubjectMl,
        volumeToMl(v.reservoirVolume, v.reservoirVolumeUnit),
      );
      if (reservoir && !reservoir.fits) {
        issues.push({
          level: 'error',
          message:
            `This run needs ${roundTo(totalVolumePerSubjectMl * 1000, 3)} µL but the syringe holds ` +
            `${roundTo(volumeToMl(v.reservoirVolume, v.reservoirVolumeUnit) * 1000, 3)} µL — short ` +
            `by ${roundTo(reservoir.shortfallMl * 1000, 3)} µL. The line will empty before the run ` +
            'ends and stop dosing without showing it. Shorten the run, or use a larger syringe.',
        });
      }
    }
    return issues;
  }, [v.totalSubjects, isBolus, totalVolumePerSubjectMl, v.reservoirVolume, v.reservoirVolumeUnit]);

  const repeated = isBolus && Number(v.infusionsPerSubject) > 1;

  const narrative = (
    <>
      <RecipeNarrative
        volumePerDoseMl={totalVolumePerSubjectMl}
        dosePerSubjectMg={dosePerSubjectMg}
        concentrationMgPerMl={concentrationMgPerMl}
        doseRateMgPerKg={achievedDoseRateMgPerKg}
        molecularWeight={soleSolute?.molecularWeight}
        units={units}
        setUnit={setUnit}
        perSoluteFooter={
          <SoluteBreakdown
            solutes={solutes}
            soluteDosesMg={perSubjectDosesMg}
            bodyWeightKg={bodyWeightKg}
          />
        }
      />
      {/*
        The unit dose is what Step 1 was given; the session total is what the
        animal ends up with. Showing only one of them is how 0.5 mg/kg gets
        read as the exposure when the exposure was 15.
      */}
      {repeated && unitDoseMg !== undefined && volumePerInfusionMl !== undefined && (
        <Text size="sm" mt={6}>
          Each of the <strong>{v.infusionsPerSubject}</strong> infusions is{' '}
          <strong>{roundTo(volumePerInfusionMl * 1000, 3)} µL</strong> carrying{' '}
          <strong>{roundTo(unitDoseMg * 1000, 4)} µg</strong>
          {bodyWeightKg > 0 && ` (${roundTo(unitDoseMg / bodyWeightKg, 4)} mg/kg each)`}.
        </Text>
      )}
    </>
  );

  return (
    <Stack gap="lg" mt="md">
      <SolutesSection
        stepLabel={repeated ? 'Step 1 — Dose per infusion' : 'Step 1 — Dosage type'}
        solutes={solutes}
        onSolutesChange={setSolutes}
        scheduleOutputFeedback={scheduleOutputFeedback}
        footer={<PreparationModeControl value={v.preparation} onChange={changePreparation} />}
      />

      <IvParametersSection
        deliveryMode={v.deliveryMode}
        volPerInjMl={v.volPerInjMl}
        volPerInjWeight={v.volPerInjWeight}
        volPerInjWeightUnit={v.volPerInjWeightUnit}
        infusionsPerSubject={v.infusionsPerSubject}
        bolusRate={v.bolusRate}
        bolusRateUnit={v.bolusRateUnit}
        bolusSecondsValue={secondsPerInfusion}
        infusionRate={v.infusionRate}
        infusionRateUnit={v.infusionRateUnit}
        durationValue={v.durationValue}
        durationUnit={v.durationUnit}
        reservoirVolume={v.reservoirVolume}
        reservoirVolumeUnit={v.reservoirVolumeUnit}
        volumePerInfusionMl={volumePerInfusionMl}
        totalVolumePerSubjectMl={totalVolumePerSubjectMl}
        bodyMassMode={v.bodyMassMode}
        avgBodyWeight={v.avgBodyWeight}
        avgBodyWeightUnit={v.avgBodyWeightUnit}
        totalBodyMass={v.totalBodyMass}
        subjectCount={v.subjectCount}
        derivedAverage={derivedAverage}
        totalSubjects={v.totalSubjects}
        wasteBufferPct={v.wasteBufferPct}
        pipetteMinUl={v.pipetteMinUl}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        issues={parameterIssues}
      />

      <VehicleRatioTable
        rows={vehicleRows}
        onRowsChange={setVehicleRows}
        route="iv"
        stepLabel={isStock ? 'Step 3 — Dilution' : 'Step 3 — Vehicle formulation'}
        onBlur={scheduleOutputFeedback}
        solutes={solutes}
        soluteDosesMg={perSubjectDosesMg}
        bodyWeightKg={bodyWeightKg}
        pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
        volumePerDoseUl={
          totalVolumePerSubjectMl === undefined ? undefined : totalVolumePerSubjectMl * 1000
        }
        volumeLabel="Volume per subject"
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
          soluteDosesMg={perSubjectDosesMg}
          vehicleRows={vehicleRows}
          pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
          stepLabel="Step 4 — Recipe"
          soluteLabel={isStock ? 'of stock solution' : 'of your solute'}
          soluteIsVolume={isStock}
          soluteVolumeMl={totalStockNeededMl}
          footer={narrative}
        />
      )}

      <PrintActions title="intravenous dosing calculator" />
    </Stack>
  );
}
