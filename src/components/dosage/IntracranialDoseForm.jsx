import { useMemo, useState } from 'react';
import { SegmentedControl, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  bolusMinutesPerSite,
  bolusTotalVolumeMl,
  checkReservoir,
  dailyDoseFromTotal,
  durationToHours,
  infusionVolumeMl,
  totalDoseFromDaily,
} from '../../dosage/computeIntracranial';
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
import IntracranialParametersSection from './IntracranialParametersSection';
import VehicleRatioTable from './VehicleRatioTable';
import DissolutionTable from './DissolutionTable';
import RecipeNarrative from './RecipeNarrative';
import PrintActions from './PrintActions';
import { navActiveColor } from '../../theme';

/** ACSF first: what goes into a brain should match what is already there. */
const POWDER_ROWS = [{ vehicleId: 'acsf', parts: '1' }];

/** Stock: the first row IS the stock. See the note in CarrierDosageForm. */
const STOCK_ROWS = [
  { vehicleId: 'dmso', parts: '1', isStock: true },
  { vehicleId: 'acsf', parts: '9' },
];

export default function IntracranialDoseForm() {
  const form = useForm({
    initialValues: {
      preparation: PREPARATION_MODES.none,
      deliveryMode: 'bolus',
      volumePerSite: 1,
      volumePerSiteUnit: 'ul',
      sitesPerSubject: 1,
      bolusRate: '',
      bolusRateUnit: 'ul',
      infusionRate: '',
      infusionRateUnit: 'ul',
      durationValue: '',
      durationUnit: 'day',
      reservoirVolume: '',
      reservoirVolumeUnit: 'ul',
      doseBasis: 'total',
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

  const [solutes, setSolutes] = useState(() => [
    makeSolute({ dosageType: 'per-subject', dosePerSubjectUnit: 'ug' }),
  ]);
  const [vehicleRows, setVehicleRows] = useState(POWDER_ROWS);
  const [outputFeedback, scheduleOutputFeedback] = useOutputFeedback();
  const [units, setUnits] = useState({
    narrativeVolume: 'ul',
    narrativeDose: 'ug',
    narrativeConcMass: 'mg',
    narrativeConcVolume: 'ml',
  });
  const setUnit = (key, value) => setUnits((prev) => ({ ...prev, [key]: value }));

  const isBolus = v.deliveryMode === 'bolus';
  const isStock = v.preparation === PREPARATION_MODES.stock;
  const buildsAVehicle = v.preparation !== PREPARATION_MODES.working;

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

  const changePreparation = (next) => {
    form.setFieldValue('preparation', next);
    if (next === PREPARATION_MODES.stock) setVehicleRows(STOCK_ROWS);
    else if (next === PREPARATION_MODES.none) setVehicleRows(POWDER_ROWS);
    scheduleOutputFeedback();
  };

  const durationHours = durationToHours(v.durationValue, v.durationUnit);

  /**
   * Volume one subject receives.
   *
   * Anatomical either way: a bolus is the volume placed at each site times the
   * number of sites, and an infusion is its rate times its run. Neither is
   * scaled by body mass, which is the whole difference between this page and
   * every other dosing page in the app.
   */
  const totalVolumePerSubjectMl = useMemo(() => {
    if (isBolus) {
      return bolusTotalVolumeMl(
        volumeToMl(v.volumePerSite, v.volumePerSiteUnit),
        v.sitesPerSubject,
      );
    }
    return infusionVolumeMl(volumeToMl(v.infusionRate, v.infusionRateUnit), durationHours);
  }, [
    isBolus, v.volumePerSite, v.volumePerSiteUnit, v.sitesPerSubject,
    v.infusionRate, v.infusionRateUnit, durationHours,
  ]);

  const minutesPerSite = useMemo(
    () =>
      isBolus
        ? bolusMinutesPerSite(
            volumeToMl(v.volumePerSite, v.volumePerSiteUnit),
            volumeToMl(v.bolusRate, v.bolusRateUnit),
          )
        : undefined,
    [isBolus, v.volumePerSite, v.volumePerSiteUnit, v.bolusRate, v.bolusRateUnit],
  );

  const soluteDosesMg = useMemo(
    () =>
      computeSoluteDosesMg(solutes, {
        avgBodyWeight: effectiveAvgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
      }),
    [solutes, effectiveAvgBodyWeight, v.avgBodyWeightUnit],
  );

  /**
   * What each solute amounts to over the whole delivery.
   *
   * A minipump protocol is written per day; the reservoir is filled with a
   * total. Reading one as the other is a fourteen-fold error on a fourteen-day
   * pump, so which one was typed is an explicit choice rather than a guess.
   */
  const perSubjectDosesMg = useMemo(() => {
    if (isBolus || v.doseBasis !== 'daily') return soluteDosesMg;
    return soluteDosesMg.map((mg) => totalDoseFromDaily(mg, durationHours));
  }, [isBolus, v.doseBasis, soluteDosesMg, durationHours]);

  const dosePerSubjectMg = totalDoseMg(perSubjectDosesMg);

  const dailyDoseMg = useMemo(
    () => (isBolus ? undefined : dailyDoseFromTotal(dosePerSubjectMg, durationHours)),
    [isBolus, dosePerSubjectMg, durationHours],
  );

  const concentrationMgPerMl =
    dosePerSubjectMg !== undefined &&
    totalVolumePerSubjectMl !== undefined &&
    totalVolumePerSubjectMl > 0
      ? dosePerSubjectMg / totalVolumePerSubjectMl
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
    () => perSubjectDosesMg.map((mg) => computeSoluteRequiredMg(mg, v.totalSubjects, v.wasteBufferPct)),
    [perSubjectDosesMg, v.totalSubjects, v.wasteBufferPct],
  );

  const totalStockNeededMl = useMemo(() => {
    if (!isStock || totalVolumeMl === undefined) return undefined;
    const split = computeVehicleVolumes(totalVolumeMl, vehicleRows);
    const index = vehicleRows.findIndex((row) => row.isStock);
    if (!split || index === -1) return undefined;
    return split.rows[index].exactMl;
  }, [isStock, totalVolumeMl, vehicleRows]);

  const bodyWeightKg = weightToKg(effectiveAvgBodyWeight, v.avgBodyWeightUnit);

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
            `This run needs ${roundTo(totalVolumePerSubjectMl * 1000, 3)} µL but the reservoir holds ` +
            `${roundTo(volumeToMl(v.reservoirVolume, v.reservoirVolumeUnit) * 1000, 3)} µL — short by ` +
            `${roundTo(reservoir.shortfallMl * 1000, 3)} µL. The pump will empty before the study ` +
            'ends and stop dosing without showing it. Shorten the run, or use a larger pump.',
        });
      }
    }
    return issues;
  }, [v.totalSubjects, isBolus, totalVolumePerSubjectMl, v.reservoirVolume, v.reservoirVolumeUnit]);

  const narrative = (
    <>
      <RecipeNarrative
        volumePerDoseMl={totalVolumePerSubjectMl}
        dosePerSubjectMg={dosePerSubjectMg}
        concentrationMgPerMl={concentrationMgPerMl}
        molecularWeight={solutes.length === 1 ? solutes[0]?.molecularWeight : undefined}
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
      {!isBolus && dailyDoseMg !== undefined && (
        <Text size="sm" mt={6}>
          That is <strong>{roundTo(dailyDoseMg * 1000, 4)} µg per day</strong> over the run.
        </Text>
      )}
      {isBolus && totalVolumePerSubjectMl !== undefined && Number(v.sitesPerSubject) > 1 && (
        <Text size="sm" mt={6}>
          Split between <strong>{v.sitesPerSubject}</strong> sites, each receives{' '}
          <strong>
            {roundTo((totalVolumePerSubjectMl / Number(v.sitesPerSubject)) * 1000, 4)} µL
          </strong>
          {dosePerSubjectMg !== undefined &&
            ` carrying ${roundTo((dosePerSubjectMg / Number(v.sitesPerSubject)) * 1000, 4)} µg`}
          .
        </Text>
      )}
    </>
  );

  return (
    <Stack gap="lg" mt="md">
      <SolutesSection
        stepLabel="Step 1 — Dosage type"
        solutes={solutes}
        onSolutesChange={setSolutes}
        scheduleOutputFeedback={scheduleOutputFeedback}
        newSoluteDefaults={{ dosageType: 'per-subject', dosePerSubjectUnit: 'ug' }}
        footer={
          <>
            {/*
              Only an infusion can be dosed per day, and only then does it need
              saying. On a bolus the question has no meaning.
            */}
            {!isBolus && (
              <div style={{ marginTop: 'var(--mantine-spacing-lg)' }}>
                <Text size="sm" fw={500} mb={6}>
                  Is that dose the total for the run, or per day?
                </Text>
                <SegmentedControl
                  size="xs"
                  color={navActiveColor}
                  value={v.doseBasis}
                  onChange={(value) => {
                    form.setFieldValue('doseBasis', value);
                    scheduleOutputFeedback();
                  }}
                  data={[
                    { value: 'total', label: 'Total for the run' },
                    { value: 'daily', label: 'Per day' },
                  ]}
                />
              </div>
            )}
            <PreparationModeControl value={v.preparation} onChange={changePreparation} />
          </>
        }
      />

      <IntracranialParametersSection
        deliveryMode={v.deliveryMode}
        volumePerSite={v.volumePerSite}
        volumePerSiteUnit={v.volumePerSiteUnit}
        sitesPerSubject={v.sitesPerSubject}
        bolusRate={v.bolusRate}
        bolusRateUnit={v.bolusRateUnit}
        minutesPerSite={minutesPerSite}
        infusionRate={v.infusionRate}
        infusionRateUnit={v.infusionRateUnit}
        durationValue={v.durationValue}
        durationUnit={v.durationUnit}
        reservoirVolume={v.reservoirVolume}
        reservoirVolumeUnit={v.reservoirVolumeUnit}
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
        route="ic"
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

      <PrintActions title="intracranial dosing calculator" />
    </Stack>
  );
}
