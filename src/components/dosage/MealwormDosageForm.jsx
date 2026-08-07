import { useEffect, useMemo, useState } from 'react';
import { Alert, Paper, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { computeDosePerAvgSubjectMg } from '../../dosage/computeDosePerAvgSubject';
import {
  computeDoseRateMgPerG,
  computeMealwormConcentrationMode,
  computeMealwormVolumeMode,
  computeWorkableConcentrationWindow,
} from '../../dosage/computeMealwormOutputs';
import { computeSoluteRequiredMg } from '../../dosage/computeSolutionOutputs';
import { suggestedDoseVolumeUl } from '../../dosage/computeVehicleVolumes';
import { roundTo, toOptionalNumber } from '../../dosage/numberUtils';
import { volumeToMl, weightToKg } from '../../dosage/unitConversions';
import { DEFAULT_ORAL_VEHICLE_ROWS } from '../../dosage/vehicles';
import useOutputFeedback from '../../hooks/useOutputFeedback';
import Step2DosageTypeSection from './Step2DosageTypeSection';
import MealwormParametersSection from './MealwormParametersSection';
import MealwormDosingTable from './MealwormDosingTable';
import DosageOutputRow from './DosageOutputRow';
import VehicleRatioTable from './VehicleRatioTable';
import DissolutionTable from './DissolutionTable';
import PrintActions from './PrintActions';

export default function MealwormDosageForm() {
  const form = useForm({
    initialValues: {
      mode: 'concentration',
      dosageType: 'by-body-weight',
      dosePerSubject: '',
      dosePerSubjectUnit: 'mg',
      doseAmount: '',
      doseUnit: 'mg',
      bodyWeightAmount: '',
      bodyWeightUnit: 'kg',
      wormCapacityUl: 250,
      loadVolumeUl: '',
      stockConcentrationMgPerMl: '',
      avgBodyWeight: '',
      avgBodyWeightUnit: 'g',
      totalDoses: '',
      wasteBufferPct: '',
      // Two different tools with two different floors: the insulin syringe
      // loads the worm, the pipette makes up the vehicle.
      syringeMinUl: 25,
      pipetteMinUl: 2,
      minBodyWeightG: 18,
      maxBodyWeightG: 35,
      stepG: 1,
    },
  });
  const v = form.values;

  const [vehicleRows, setVehicleRows] = useState(DEFAULT_ORAL_VEHICLE_ROWS);
  const [outputFeedback, scheduleOutputFeedback] = useOutputFeedback();
  const [units, setUnits] = useState({
    dosePerSubject: 'mg',
    solute: 'mg',
    loadVolume: 'ul',
    totalVolume: 'ml',
  });
  const setUnit = (key, value) => setUnits((prev) => ({ ...prev, [key]: value }));

  const dosePerSubjectMg = useMemo(
    () =>
      computeDosePerAvgSubjectMg({
        dosageType: v.dosageType,
        doseAmount: v.doseAmount,
        doseUnit: v.doseUnit,
        refBodyWeight: v.bodyWeightAmount,
        refBodyWeightUnit: v.bodyWeightUnit,
        avgBodyWeight: v.avgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
        dosePerSubject: v.dosePerSubject,
        dosePerSubjectUnit: v.dosePerSubjectUnit,
      }),
    [
      v.dosageType, v.doseAmount, v.doseUnit, v.bodyWeightAmount, v.bodyWeightUnit,
      v.avgBodyWeight, v.avgBodyWeightUnit, v.dosePerSubject, v.dosePerSubjectUnit,
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
          })
        : undefined,
    [v.dosageType, v.doseAmount, v.doseUnit, v.bodyWeightAmount, v.bodyWeightUnit],
  );

  const concentrationMode = useMemo(
    () =>
      computeMealwormConcentrationMode({
        dosePerSubjectMg,
        loadVolumeUl: v.loadVolumeUl,
        wormCapacityUl: v.wormCapacityUl,
        pipetteMinUl: v.syringeMinUl,
        totalDoses: v.totalDoses,
        wasteBufferPct: v.wasteBufferPct,
      }),
    [
      dosePerSubjectMg, v.loadVolumeUl, v.wormCapacityUl, v.syringeMinUl,
      v.totalDoses, v.wasteBufferPct,
    ],
  );

  const volumeMode = useMemo(
    () =>
      computeMealwormVolumeMode({
        dosePerSubjectMg,
        stockConcentrationMgPerMl: v.stockConcentrationMgPerMl,
        wormCapacityUl: v.wormCapacityUl,
        pipetteMinUl: v.syringeMinUl,
      }),
    [dosePerSubjectMg, v.stockConcentrationMgPerMl, v.wormCapacityUl, v.syringeMinUl],
  );

  const window = useMemo(
    () =>
      computeWorkableConcentrationWindow({
        doseRateMgPerG,
        minBodyWeightG: v.minBodyWeightG,
        maxBodyWeightG: v.maxBodyWeightG,
        wormCapacityUl: v.wormCapacityUl,
        pipetteMinUl: v.syringeMinUl,
      }),
    [doseRateMgPerG, v.minBodyWeightG, v.maxBodyWeightG, v.wormCapacityUl, v.syringeMinUl],
  );

  const isConcentrationMode = v.mode === 'concentration';

  // The batch to mix. In volume mode the per-worm volume is what was solved
  // for, so the batch is built from that instead of a typed volume.
  const suggestedUl = suggestedDoseVolumeUl(vehicleRows, dosePerSubjectMg, Number(v.syringeMinUl));

  // Keep the dose volume a REAL value in the field rather than a placeholder,
  // so the stepper arrows increment from it instead of jumping to zero. It is
  // overwritten whenever the suggestion moves; the field flashes to say so.
  const roundedSuggestion = suggestedUl > 0 ? roundTo(suggestedUl, 3) : '';
  useEffect(() => {
    if (roundedSuggestion !== '') form.setFieldValue('loadVolumeUl', roundedSuggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundedSuggestion]);

  const typedUl = toOptionalNumber(v.loadVolumeUl);
  const effectiveLoadUl = isConcentrationMode
    ? (typedUl !== undefined && typedUl > 0 ? typedUl : suggestedUl || undefined)
    : volumeMode.loadVolumeUl;
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

  const parameterIssues = useMemo(() => {
    const issues = [];
    const doses = toOptionalNumber(v.totalDoses);
    if (doses !== undefined && doses === 0) {
      issues.push({
        level: 'error',
        message: 'Number of loaded worms is 0, so every batch figure below is zero. Enter at least 1.',
      });
    }
    if (v.wasteBufferPct === '' || v.wasteBufferPct === null) {
      issues.push({
        level: 'warning',
        message:
          'Waste buffer is blank, which is treated as 0%. Loading worms wastes solution — 10% is ' +
          'a common choice.',
      });
    }
    return [...issues, ...(isConcentrationMode ? concentrationMode.issues : volumeMode.issues)];
  }, [v.totalDoses, v.wasteBufferPct, isConcentrationMode, concentrationMode.issues, volumeMode.issues]);

  return (
    <Stack gap="lg" mt="md">
      <PrintActions title="mealworm oral dosing calculator" />

      <Step2DosageTypeSection
        stepLabel="Step 1 — Dosage type"
        dosageType={v.dosageType}
        dosePerSubject={v.dosePerSubject}
        dosePerSubjectUnit={v.dosePerSubjectUnit}
        doseAmount={v.doseAmount}
        doseUnit={v.doseUnit}
        bodyWeightAmount={v.bodyWeightAmount}
        bodyWeightUnit={v.bodyWeightUnit}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
      />

      <MealwormParametersSection
        mode={v.mode}
        wormCapacityUl={v.wormCapacityUl}
        loadVolumeUl={v.loadVolumeUl}
        stockConcentrationMgPerMl={v.stockConcentrationMgPerMl}
        avgBodyWeight={v.avgBodyWeight}
        avgBodyWeightUnit={v.avgBodyWeightUnit}
        totalDoses={v.totalDoses}
        wasteBufferPct={v.wasteBufferPct}
        pipetteMinUl={v.pipetteMinUl}
        syringeMinUl={v.syringeMinUl}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        issues={parameterIssues}
      />

      <VehicleRatioTable
        rows={vehicleRows}
        onRowsChange={setVehicleRows}
        route="oral"
        stepLabel="Step 3 — Vehicle formulation"
        onBlur={scheduleOutputFeedback}
        dosePerSubjectMg={dosePerSubjectMg}
        bodyWeightKg={weightToKg(v.avgBodyWeight, v.avgBodyWeightUnit)}
        pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
        syringeMinUl={toOptionalNumber(v.syringeMinUl) ?? 0}
        maxVolumeUl={toOptionalNumber(v.wormCapacityUl)}
        volumePerDoseUl={v.loadVolumeUl}
        onVolumePerDoseChange={(value) => form.setFieldValue('loadVolumeUl', value)}
        volumeLabel="Volume loaded per worm"
      />

      {!isConcentrationMode && window && (
        <Alert
          color={window.feasible ? 'blue' : 'red'}
          variant="light"
          icon={<IconInfoCircle size={18} />}
          title="Workable stock concentration"
        >
          {window.feasible ? (
            <Text size="sm">
              For {v.minBodyWeightG}–{v.maxBodyWeightG} g subjects, a {v.wormCapacityUl} µL worm and
              a {v.syringeMinUl} µL syringe, your stock must be between{' '}
              <strong>{roundTo(window.minMgPerMl, 3)} mg/mL</strong> and{' '}
              <strong>
                {Number.isFinite(window.maxMgPerMl)
                  ? `${roundTo(window.maxMgPerMl, 3)} mg/mL`
                  : 'no upper limit'}
              </strong>
              . Outside that range some subjects cannot be dosed accurately.
            </Text>
          ) : (
            <Text size="sm">
              No stock concentration works for this combination. The heaviest subject needs more
              volume than the worm holds, while the lightest needs less than the syringe can
              deliver. Use a larger worm, a finer syringe, or a narrower weight range.
            </Text>
          )}
        </Alert>
      )}

      <DissolutionTable
        outputFeedback={outputFeedback}
        totalVolumeMl={totalVolumeMl}
        soluteRequiredMg={soluteRequiredMg}
        vehicleRows={vehicleRows}
        pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
        stepLabel="Step 4 — Recipe"
        summary={
          <Stack gap="md" mb="md">
            <DosageOutputRow
              label="Dose loaded per subject"
              canonicalValue={dosePerSubjectMg}
              kind="mass"
              unit={units.dosePerSubject}
              onUnitChange={(u) => setUnit('dosePerSubject', u)}
            />
            <DosageOutputRow
              label={isConcentrationMode ? 'Concentration to mix (per mL)' : 'Stock concentration'}
              canonicalValue={
                isConcentrationMode
                  ? concentrationMode.requiredConcentrationMgPerMl
                  : toOptionalNumber(v.stockConcentrationMgPerMl)
              }
              kind="mass"
              unit={units.solute}
              onUnitChange={(u) => setUnit('solute', u)}
              decimals={6}
            />
            <DosageOutputRow
              label="Volume per dose"
              canonicalValue={volumeToMl(effectiveLoadUl, 'ul')}
              kind="volume"
              unit={units.loadVolume}
              onUnitChange={(u) => setUnit('loadVolume', u)}
            />
            <DosageOutputRow
              label="Total solution to prepare"
              canonicalValue={totalVolumeMl}
              kind="volume"
              unit={units.totalVolume}
              onUnitChange={(u) => setUnit('totalVolume', u)}
            />
          </Stack>
        }
      />

      {!isConcentrationMode && (
        <MealwormDosingTable
          doseRateMgPerG={doseRateMgPerG}
          stockConcentrationMgPerMl={v.stockConcentrationMgPerMl}
          minBodyWeightG={v.minBodyWeightG}
          maxBodyWeightG={v.maxBodyWeightG}
          stepG={v.stepG}
          wormCapacityUl={v.wormCapacityUl}
          pipetteMinUl={v.syringeMinUl}
          setFieldValue={form.setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />
      )}
    </Stack>
  );
}
