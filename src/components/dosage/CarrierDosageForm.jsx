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
import { makeSolute, soluteDosesMg as computeSoluteDosesMg, totalDoseMg } from '../../dosage/solutes';
import { roundTo, toOptionalNumber, toPositiveNumber } from '../../dosage/numberUtils';
import { volumeToMl, weightToKg } from '../../dosage/unitConversions';
import useOutputFeedback from '../../hooks/useOutputFeedback';
import SolutesSection from './SolutesSection';
import SoluteBreakdown from './SoluteBreakdown';
import CarrierParametersSection from './CarrierParametersSection';
import CarrierDosingTable from './CarrierDosingTable';
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
  { vehicleId: 'dmso', parts: '1', isStock: true },
  { vehicleId: 'saline', parts: '9' },
];

export default function CarrierDosageForm({ carrier }) {
  const form = useForm({
    initialValues: {
      preparation: PREPARATION_MODES.none,
      capacityUl: carrier.defaultCapacityUl,
      carrierName: '',
      carrierAmount: '',
      carrierAmountUnit: 'mg',
      carrierAmountMode: 'by-body-weight',
      carrierRefBodyWeight: 1,
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
      // Two tools, two floors where there are two: the insulin syringe loads
      // the worm, the pipette makes up the vehicle. Where the dose is pipetted
      // straight onto the carrier there is only the pipette, and the syringe
      // figure is never read.
      syringeMinUl: carrier.defaultSyringeMinUl ?? 0,
      pipetteMinUl: 2,
      minBodyWeightG: 18,
      maxBodyWeightG: 35,
      stepG: 1,
    },
  });
  const v = form.values;

  // Solutes live outside the Mantine form for the same reason vehicle rows do:
  // they are a list that grows and shrinks, not a fixed set of named fields.
  const [solutes, setSolutes] = useState(() => [makeSolute()]);
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

  /**
   * The smallest dose volume that can actually be delivered.
   *
   * A syringe loads a worm; a pipette loads a lump of peanut butter. Whichever
   * instrument touches the carrier sets the floor, and for the pipette it is
   * the same figure that governs mixing the vehicle — one number, read twice,
   * rather than two fields the user has to keep in step.
   */
  const loadFloorUl = carrier.usesSyringe
    ? toOptionalNumber(v.syringeMinUl) ?? 0
    : toOptionalNumber(v.pipetteMinUl) ?? 0;

  // With no syringe the pipette delivers the dose, so its minimum matters even
  // in working mode, where there is no vehicle left to mix.
  const showPipetteMinimum = buildsAVehicle || !carrier.usesSyringe;

  /**
   * How much carrier one subject gets, in milligrams.
   *
   * Structurally identical to a dose — a flat mass, or a mass per unit of body
   * mass — so it is computed by the same function rather than by a second
   * implementation that could drift from it.
   */
  const carrierAmountPerSubjectMg = useMemo(() => {
    if (!carrier.weighed) return undefined;
    return computeDosePerAvgSubjectMg({
      dosageType: v.carrierAmountMode,
      doseAmount: v.carrierAmount,
      doseUnit: v.carrierAmountUnit,
      refBodyWeight: v.carrierRefBodyWeight,
      // The carrier rate is written in the same unit the body mass is entered
      // in, so "4 mg per 1 g" cannot silently become "per 1 kg".
      refBodyWeightUnit: v.avgBodyWeightUnit,
      avgBodyWeight: effectiveAvgBodyWeight,
      avgBodyWeightUnit: v.avgBodyWeightUnit,
      dosePerSubject: v.carrierAmount,
      dosePerSubjectUnit: v.carrierAmountUnit,
    });
  }, [
    carrier.weighed, v.carrierAmountMode, v.carrierAmount, v.carrierAmountUnit,
    v.carrierRefBodyWeight, v.avgBodyWeightUnit, effectiveAvgBodyWeight,
  ]);

  /** Switching what you start with changes what the table means, so reset it. */
  const changePreparation = (next) => {
    form.setFieldValue('preparation', next);
    if (next === PREPARATION_MODES.stock) setVehicleRows(STOCK_ROWS);
    else if (next === PREPARATION_MODES.none) setVehicleRows(POWDER_ROWS);
    scheduleOutputFeedback();
  };

  /** Per-solute dose, in order, and the combined mass one dose carries. */
  const soluteDosesMg = useMemo(
    () =>
      computeSoluteDosesMg(solutes, {
        avgBodyWeight: effectiveAvgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
      }),
    [solutes, effectiveAvgBodyWeight, v.avgBodyWeightUnit],
  );
  const dosePerSubjectMg = totalDoseMg(soluteDosesMg);

  // The dosing-table-by-body-mass scales a rate, and only a single substance
  // dosed by body weight has one unambiguous rate to scale.
  const soleSolute = solutes.length === 1 ? solutes[0] : undefined;
  const doseRateMgPerG = useMemo(
    () =>
      soleSolute?.dosageType === 'by-body-weight'
        ? computeDoseRateMgPerG({
            doseAmount: soleSolute.doseAmount,
            doseUnit: soleSolute.doseUnit,
            refBodyWeight: soleSolute.bodyWeightAmount,
            refBodyWeightUnit: soleSolute.bodyWeightUnit,
            molecularWeightGPerMol: soleSolute.molecularWeight,
          })
        : undefined,
    [soleSolute],
  );

  const suggestedUl = suggestedDoseVolumeUl(
    vehicleRows,
    solutes,
    soluteDosesMg,
    loadFloorUl,
  );

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

  /** Carrier for the whole batch, on the same spares allowance as the solution. */
  const totalCarrierMg = useMemo(
    () => computeSoluteRequiredMg(carrierAmountPerSubjectMg, v.totalDoses, v.wasteBufferPct),
    [carrierAmountPerSubjectMg, v.totalDoses, v.wasteBufferPct],
  );

  /** How much of each substance the whole batch needs, in order. */
  const soluteBatchMg = useMemo(
    () => soluteDosesMg.map((mg) => computeSoluteRequiredMg(mg, v.totalDoses, v.wasteBufferPct)),
    [soluteDosesMg, v.totalDoses, v.wasteBufferPct],
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
      soleSolute?.molecularWeight,
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
      <SolutesSection
        stepLabel="Step 1 — Dosage type"
        solutes={solutes}
        onSolutesChange={setSolutes}
        scheduleOutputFeedback={scheduleOutputFeedback}
        canAddSolutes={!isWorking}
        footer={<PreparationModeControl value={v.preparation} onChange={changePreparation} />}
      />

      <CarrierParametersSection
        carrier={carrier}
        carrierName={v.carrierName}
        carrierAmount={v.carrierAmount}
        carrierAmountUnit={v.carrierAmountUnit}
        carrierAmountMode={v.carrierAmountMode}
        carrierRefBodyWeight={v.carrierRefBodyWeight}
        carrierAmountPerSubjectMg={carrierAmountPerSubjectMg}
        totalCarrierMg={totalCarrierMg}
        capacityUl={v.capacityUl}
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
        showPipetteMinimum={showPipetteMinimum}
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
          dosePerSubjectMg={dosePerSubjectMg}
          totalDoses={v.totalDoses}
          wasteBufferPct={v.wasteBufferPct}
          syringeMinUl={loadFloorUl}
          maxVolumeUl={toOptionalNumber(v.capacityUl)}
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
          solutes={solutes}
          soluteDosesMg={soluteDosesMg}
          bodyWeightKg={weightToKg(effectiveAvgBodyWeight, v.avgBodyWeightUnit)}
          pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
          syringeMinUl={loadFloorUl}
          maxVolumeUl={toOptionalNumber(v.capacityUl)}
          volumePerDoseUl={v.loadVolumeUl}
          onVolumePerDoseChange={(value) => form.setFieldValue('loadVolumeUl', value)}
          volumeLabel={carrier.volumeLabel}
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
          footer={
            <RecipeNarrative
              volumePerDoseMl={volumeToMl(effectiveLoadUl, 'ul')}
              dosePerSubjectMg={dosePerSubjectMg}
              concentrationMgPerMl={concentrationMgPerMl}
              doseRateMgPerKg={achievedDoseRateMgPerKg}
              molecularWeight={soleSolute?.molecularWeight}
              units={units}
              setUnit={setUnit}
              perSoluteFooter={
                <SoluteBreakdown
                  solutes={solutes}
                  soluteDosesMg={soluteDosesMg}
                  bodyWeightKg={weightToKg(effectiveAvgBodyWeight, v.avgBodyWeightUnit)}
                />
              }            />
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
          molecularWeight={soleSolute?.molecularWeight}
          units={units}
          setUnit={setUnit}
        />
      )}

      {soleSolute?.dosageType === 'by-body-weight' && (
        <CarrierDosingTable
          doseRateMgPerG={doseRateMgPerG}
          stockConcentrationMgPerMl={concentrationMgPerMl}
          minBodyWeightG={v.minBodyWeightG}
          maxBodyWeightG={v.maxBodyWeightG}
          stepG={v.stepG}
          carrier={carrier}
        carrierName={v.carrierName}
        carrierAmount={v.carrierAmount}
        carrierAmountUnit={v.carrierAmountUnit}
        carrierAmountMode={v.carrierAmountMode}
        carrierRefBodyWeight={v.carrierRefBodyWeight}
        carrierAmountPerSubjectMg={carrierAmountPerSubjectMg}
        totalCarrierMg={totalCarrierMg}
        capacityUl={v.capacityUl}
          syringeMinUl={v.syringeMinUl}
          setFieldValue={form.setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
          stepLabel={`Step ${isWorking ? 4 : 5} — Dosing table by body mass`}
        />
      )}

      <PrintActions title={carrier.printTitle} />
    </Stack>
  );
}
