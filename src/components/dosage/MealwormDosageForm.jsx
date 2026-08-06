import { useMemo, useState } from 'react';
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
import { checkSolubilityCeiling } from '../../dosage/computeMealwormOutputs';
import { computeSoluteRequiredMg } from '../../dosage/computeSolutionOutputs';
import { computeVehiclePercents } from '../../dosage/computeVehicleVolumes';
import { roundTo, toOptionalNumber } from '../../dosage/numberUtils';
import { volumeToMl, weightToKg } from '../../dosage/unitConversions';
import { DEFAULT_ORAL_VEHICLE_ROWS, getVehicle } from '../../dosage/vehicles';
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
      bodyWeightUnit: 'g',
      wormCapacityUl: 250,
      loadVolumeUl: '',
      stockConcentrationMgPerMl: '',
      avgBodyWeight: '',
      avgBodyWeightUnit: 'g',
      totalDoses: '',
      wasteBufferPct: '',
      solubilityMgPerMl: '',
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
  const effectiveLoadUl = isConcentrationMode ? toOptionalNumber(v.loadVolumeUl) : volumeMode.loadVolumeUl;
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

  /**
   * Can the vehicle dissolve the drug at the concentration this plan needs?
   * The primary solvent is taken to be the first non-aqueous row of the
   * vehicle — the one the drug is actually dissolved in.
   */
  const requiredConcentrationMgPerMl = isConcentrationMode
    ? concentrationMode.requiredConcentrationMgPerMl
    : toOptionalNumber(v.stockConcentrationMgPerMl);

  const primarySolvent = useMemo(() => {
    const percents = computeVehiclePercents(vehicleRows.map((r) => r.parts));
    if (!percents) return undefined;
    const index = vehicleRows.findIndex((r) => {
      const vehicle = getVehicle(r.vehicleId);
      return vehicle && !vehicle.isAqueous;
    });
    if (index === -1) return undefined;
    return { vehicle: getVehicle(vehicleRows[index].vehicleId), percentVv: percents[index] };
  }, [vehicleRows]);

  const solubility = useMemo(
    () =>
      checkSolubilityCeiling({
        requiredConcentrationMgPerMl,
        solubilityMgPerMl: v.solubilityMgPerMl,
        primarySolventPercentVv: primarySolvent?.percentVv,
      }),
    [requiredConcentrationMgPerMl, v.solubilityMgPerMl, primarySolvent],
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

      <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
        This calculator works out what to <strong>load into the worm</strong>. Whether the mouse eats
        it is a bench observation, not a calculation — record consumption separately.
      </Alert>

      <Step2DosageTypeSection
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
        solubilityMgPerMl={v.solubilityMgPerMl}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        issues={parameterIssues}
      />

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">
          Step 4 — Output
        </Text>
        <Text size="sm" c="dimmed" mb="md" className="no-print">
          {isConcentrationMode
            ? 'Load the same volume into every worm; mix the solution at the concentration below.'
            : 'Mix one stock at your chosen concentration; load the volume below into each worm.'}
        </Text>

        <Stack gap="md">
          <DosageOutputRow
            label="Dose loaded per subject"
            canonicalValue={dosePerSubjectMg}
            kind="mass"
            unit={units.dosePerSubject}
            onUnitChange={(u) => setUnit('dosePerSubject', u)}
          />

          {isConcentrationMode ? (
            <DosageOutputRow
              label="Concentration to mix (per mL)"
              canonicalValue={concentrationMode.requiredConcentrationMgPerMl}
              kind="mass"
              unit={units.solute}
              onUnitChange={(u) => setUnit('solute', u)}
              decimals={6}
            />
          ) : (
            <DosageOutputRow
              label="Volume to load per worm"
              canonicalValue={volumeToMl(volumeMode.loadVolumeUl, 'ul')}
              kind="volume"
              unit={units.loadVolume}
              onUnitChange={(u) => setUnit('loadVolume', u)}
            />
          )}

          <DosageOutputRow
            label="Total solution to prepare"
            canonicalValue={totalVolumeMl}
            kind="volume"
            unit={units.totalVolume}
            onUnitChange={(u) => setUnit('totalVolume', u)}
          />

          <DosageOutputRow
            label="Total solute required"
            canonicalValue={soluteRequiredMg}
            kind="mass"
            unit={units.solute}
            onUnitChange={(u) => setUnit('solute', u)}
          />
        </Stack>

        {solubility && primarySolvent && (
          <Alert
            color={solubility.achievable ? 'blue' : 'red'}
            variant="light"
            mt="md"
            icon={<IconInfoCircle size={18} />}
            title={solubility.achievable ? 'Solubility check' : 'This vehicle cannot dissolve the drug'}
          >
            {solubility.achievable ? (
              <Text size="sm">
                At {roundTo(primarySolvent.percentVv, 1)}% {primarySolvent.vehicle.label}, the
                strongest solution you can make is{' '}
                <strong>{roundTo(solubility.ceilingMgPerMl, 3)} mg/mL</strong>. This plan needs{' '}
                {roundTo(solubility.requiredMgPerMl, 3)} mg/mL, so it fits.
              </Text>
            ) : (
              <Text size="sm">
                This plan needs <strong>{roundTo(solubility.requiredMgPerMl, 3)} mg/mL</strong>, but
                at {roundTo(primarySolvent.percentVv, 1)}% {primarySolvent.vehicle.label} the ceiling
                is <strong>{roundTo(solubility.ceilingMgPerMl, 3)} mg/mL</strong> — solubility ×
                solvent fraction. Raise {primarySolvent.vehicle.label} to at least{' '}
                <strong>{roundTo(solubility.minSolventFraction, 1)}%</strong>, load a larger volume
                per worm, or find a solvent the drug is more soluble in. A surfactant can beat this
                ceiling by holding the compound in emulsion, so treat it as &quot;check at the
                bench&quot; rather than proof it is impossible.
              </Text>
            )}
          </Alert>
        )}

        {!isConcentrationMode && window && (
          <Alert
            color={window.feasible ? 'blue' : 'red'}
            variant="light"
            mt="md"
            icon={<IconInfoCircle size={18} />}
            title="Workable stock concentration"
          >
            {window.feasible ? (
              <Text size="sm">
                For {v.minBodyWeightG}–{v.maxBodyWeightG} g subjects, a {v.wormCapacityUl} µL worm
                and a {v.syringeMinUl} µL syringe, your stock must be between{' '}
                <strong>{roundTo(window.minMgPerMl, 3)} mg/mL</strong> and{' '}
                <strong>
                  {Number.isFinite(window.maxMgPerMl) ? `${roundTo(window.maxMgPerMl, 3)} mg/mL` : 'no upper limit'}
                </strong>
                . Outside that range some animals cannot be dosed accurately.
              </Text>
            ) : (
              <Text size="sm">
                No stock concentration works for this combination. The heaviest subject needs more
                volume than the worm holds, while the lightest needs less than the pipette can
                deliver. Use a larger worm, a finer pipette, or a narrower weight range.
              </Text>
            )}
          </Alert>
        )}

        {/* Loading problems are reported against the Step 3 inputs that cause
            them, so they are deliberately not repeated here. */}
      </Paper>

      <VehicleRatioTable
        rows={vehicleRows}
        onRowsChange={setVehicleRows}
        route="oral"
        stepLabel="Step 5 — Vehicle ratio"
        onBlur={scheduleOutputFeedback}
        volumePerSubjectMl={volumeToMl(effectiveLoadUl, 'ul')}
        bodyWeightKg={weightToKg(v.avgBodyWeight, v.avgBodyWeightUnit)}
      />

      <DissolutionTable
        outputFeedback={outputFeedback}
        totalVolumeMl={totalVolumeMl}
        soluteRequiredMg={soluteRequiredMg}
        vehicleRows={vehicleRows}
        pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
        stepLabel="Step 5b — Dissolution & vehicle volumes"
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
