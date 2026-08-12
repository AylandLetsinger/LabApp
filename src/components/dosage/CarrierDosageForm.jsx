import { useEffect, useMemo, useState } from 'react';
import { Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { computeDosePerAvgSubjectMg } from '../../dosage/computeDosePerAvgSubject';
import {
  computeCohortVolumeBounds,
  computeDoseRateMgPerG,
} from '../../dosage/computeMealwormOutputs';
import { computeSoluteRequiredMg } from '../../dosage/computeSolutionOutputs';
import {
  computeVehicleVolumes,
  suggestedDoseVolumeUl,
} from '../../dosage/computeVehicleVolumes';
import { concentrationToMgPerMl } from '../../dosage/molarUnits';
import { makeSolute, soluteDosesMg as computeSoluteDosesMg, totalDoseMg } from '../../dosage/solutes';
import { ceilToStep, roundTo, toOptionalNumber, toPositiveNumber } from '../../dosage/numberUtils';
import { massToMg, volumeToMl, weightToG, weightToKg } from '../../dosage/unitConversions';
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
      absorbencyUl: '',
      absorbencyMass: '',
      absorbencyMassUnit: 'mg',
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
      // Optional, and blank rather than pre-filled: a guessed range would
      // silently constrain the suggested volume with numbers nobody chose.
      minBodyWeight: '',
      maxBodyWeight: '',
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

  /** Named carriers are called by their name at the bench; fall back to the noun. */
  const carrierNoun = (v.carrierName ?? '').trim() || carrier.noun;
  const floorWord = carrier.usesSyringe ? 'syringe' : 'pipette';

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

  /**
   * The ceiling on one dose, in microlitres.
   *
   * A worm has a capacity; a solid has an absorbency. Dough that takes 5 uL per
   * 100 mg takes 10 uL per 200 mg, so for a solid the ceiling is a rate times
   * the portion each subject gets — and it follows the portion size instead of
   * needing to be re-entered whenever that changes. With no portion given there
   * is no ceiling, which is reported as "none" rather than as zero.
   */
  const capacityUl = useMemo(() => {
    if (carrier.capacity.kind !== 'per-mass') return toOptionalNumber(v.capacityUl);
    const perMassUl = toPositiveNumber(v.absorbencyUl);
    const perMassMg = massToMg(v.absorbencyMass, v.absorbencyMassUnit);
    if (perMassUl === undefined || perMassMg === undefined || perMassMg <= 0) return undefined;
    if (carrierAmountPerSubjectMg === undefined) return undefined;
    return (perMassUl / perMassMg) * carrierAmountPerSubjectMg;
  }, [
    carrier.capacity.kind, v.capacityUl, v.absorbencyUl, v.absorbencyMass,
    v.absorbencyMassUnit, carrierAmountPerSubjectMg,
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

  /**
   * The cohort, in grams — the canonical unit the dosing table and the bounds
   * both work in. Entered in whatever unit the body mass is entered in, so the
   * two cannot silently disagree.
   */
  const avgBodyWeightG = weightToG(effectiveAvgBodyWeight, v.avgBodyWeightUnit);
  const minBodyWeightG = weightToG(v.minBodyWeight, v.avgBodyWeightUnit);
  const maxBodyWeightG = weightToG(v.maxBodyWeight, v.avgBodyWeightUnit);

  /**
   * One batch, one concentration — so the lightest and heaviest subjects, not
   * the average one, decide how small and how large the average subject's dose
   * volume is allowed to be. With no range given these come back unchanged.
   */
  const cohortBounds = useMemo(
    () =>
      computeCohortVolumeBounds({
        floorUl: loadFloorUl,
        capacityUl,
        avgBodyWeightG,
        minBodyWeightG,
        maxBodyWeightG,
      }),
    [loadFloorUl, capacityUl, avgBodyWeightG, minBodyWeightG, maxBodyWeightG],
  );

  const suggestedUl = suggestedDoseVolumeUl(
    vehicleRows,
    solutes,
    soluteDosesMg,
    cohortBounds.floorUl,
  );

  // Keep the dose volume a REAL value in the field rather than a placeholder,
  // so the stepper increments from it instead of jumping to zero. Rewritten
  // whenever the suggestion moves; the field flashes to say so.
  //
  // Rounded UP, never to nearest: this is a minimum, and a volume rounded down
  // sits below the floor it was derived from. The breach is a fraction of a
  // nanolitre, but it is enough to flag the lightest subject's row red in the
  // dosing table — on the very volume that was chosen to keep it green.
  const roundedSuggestion = suggestedUl > 0 ? ceilToStep(suggestedUl, 0.001) : '';
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

  /**
   * How the volume bounds are explained once a body-mass range moves them.
   *
   * A ceiling of 71 µL on a portion the user told us holds 100 µL is not wrong,
   * but it is unfindable on any piece of their equipment unless the sentence
   * says which subject it belongs to.
   */
  const boundsWording = useMemo(() => {
    if (!cohortBounds.scaled) return {};
    const light = roundTo(cohortBounds.lightestG, 2);
    const heavy = roundTo(cohortBounds.heaviestG, 2);
    const instrumentMin = roundTo(loadFloorUl, 2);
    return {
      floorReason:
        `needed to keep the lightest subject (${light} g) above your ${instrumentMin} µL ` +
        `${floorWord} minimum`,
      belowFloorAdvice:
        'Make the solution more dilute, so every dose is a larger volume.',
      capacityReason:
        capacityUl === undefined
          ? 'that fits'
          : `the heaviest subject (${heavy} g) leaves, from the ${roundTo(capacityUl, 2)} µL a ` +
            `${carrierNoun} holds`,
      overCapacityAdvice:
        `Use a more concentrated solution, or a larger ${carrierNoun}.`,
      boundsNote:
        // "the", not "a": the article would have to agree with a number that
        // changes as the user types.
        `Sized for the ${light}–${heavy} g cohort: the lightest subject sets the floor, the ` +
        `heaviest sets the ceiling. Your ${floorWord} reaches ${instrumentMin} µL and a ` +
        `${carrierNoun} holds ${capacityUl === undefined ? 'an unstated volume' : `${roundTo(capacityUl, 2)} µL`}.`,
    };
  }, [cohortBounds, loadFloorUl, capacityUl, carrierNoun, floorWord]);

  /**
   * No single concentration serves both ends of the range.
   *
   * This is a genuine impossibility, but it is reported WITH a volume rather
   * than instead of one: the user asked to still see the figure, and knowing
   * which end fails by how much is what tells them whether to change the
   * carrier or the dilution. Both remedies are named, because they pull in
   * opposite directions and picking the wrong one makes it worse.
   */
  const cohortIssues = useMemo(() => {
    const issues = [...cohortBounds.issues];
    if (cohortBounds.scaled && !cohortBounds.feasible) {
      issues.push({
        level: 'error',
        message:
          `No single concentration works across ${roundTo(cohortBounds.lightestG, 2)}–` +
          `${roundTo(cohortBounds.heaviestG, 2)} g. The lightest subject needs at least ` +
          `${roundTo(cohortBounds.floorUl, 2)} µL of the batch to stay above your ` +
          `${roundTo(loadFloorUl, 2)} µL ${floorWord} minimum, but the heaviest can take at most ` +
          `${roundTo(cohortBounds.capacityUl, 2)} µL before overflowing the ${carrierNoun}. ` +
          `Use a larger ${carrierNoun} to fix the heavy end, or a more dilute solution to fix the ` +
          'light end — you cannot do both with one batch. Splitting the cohort into two batches ' +
          'also works.',
      });
    }
    return issues;
  }, [cohortBounds, loadFloorUl, carrierNoun, floorWord]);

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
        capacityUl={carrier.capacity.kind === 'per-mass' ? capacityUl : v.capacityUl}
        absorbencyUl={v.absorbencyUl}
        absorbencyMass={v.absorbencyMass}
        absorbencyMassUnit={v.absorbencyMassUnit}
        bodyMassMode={v.bodyMassMode}
        avgBodyWeight={v.avgBodyWeight}
        avgBodyWeightUnit={v.avgBodyWeightUnit}
        totalBodyMass={v.totalBodyMass}
        subjectCount={v.subjectCount}
        derivedAverage={derivedAverage}
        minBodyWeight={v.minBodyWeight}
        maxBodyWeight={v.maxBodyWeight}
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
          tooDiluteAdvice={`make it stronger, or use a larger ${carrier.noun}.`}
          totalDoses={v.totalDoses}
          wasteBufferPct={v.wasteBufferPct}
          syringeMinUl={loadFloorUl}
          maxVolumeUl={capacityUl}
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
          // The cohort bounds, not the raw instrument limits: the suggestion,
          // the hint and the errors then all describe the same batch.
          syringeMinUl={cohortBounds.floorUl}
          maxVolumeUl={cohortBounds.capacityUl}
          floorReason={boundsWording.floorReason}
          belowFloorAdvice={boundsWording.belowFloorAdvice}
          capacityReason={boundsWording.capacityReason}
          boundsNote={boundsWording.boundsNote}
          extraIssues={cohortIssues}
          volumePerDoseUl={v.loadVolumeUl}
          onVolumePerDoseChange={(value) => form.setFieldValue('loadVolumeUl', value)}
          volumeLabel={carrier.volumeLabel}
          overCapacityAdvice={
            boundsWording.overCapacityAdvice ??
            `Reduce the volume, raise the share of the solvent the drug dissolves in, or use a larger ${carrier.noun}.`
          }
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
          carrierNoun={carrierNoun}
          loadColumnLabel={carrier.loadColumnLabel}
          floorWord={floorWord}
          // The range is owned by Step 2, because it also bounds the volume
          // suggested there. Two copies of it could disagree, and the one that
          // lost would do so silently.
          showRangeInputs={false}
          rangeSource="the subject body-mass range in Step 2"
          doseRateMgPerG={doseRateMgPerG}
          stockConcentrationMgPerMl={concentrationMgPerMl}
          minBodyWeightG={minBodyWeightG}
          maxBodyWeightG={maxBodyWeightG}
          stepG={v.stepG}
          capacityUl={capacityUl}
          loadFloorUl={loadFloorUl}
          setFieldValue={form.setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
          stepLabel={`Step ${isWorking ? 4 : 5} — Dosing table by body mass`}
        />
      )}

      <PrintActions title={carrier.printTitle} />
    </Stack>
  );
}
