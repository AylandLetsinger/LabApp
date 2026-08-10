import { useMemo, useState } from 'react';
import { Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { dosePerAvgSubjectDisplayUnit } from '../../dosage/computeDosePerAvgSubject';
import {
  computeInjectionSolutionOutputs,
  computeSoluteRequiredMg,
} from '../../dosage/computeSolutionOutputs';
import { toOptionalNumber, roundTo } from '../../dosage/numberUtils';
import { weightToKg } from '../../dosage/unitConversions';
import { DEFAULT_IP_VEHICLE_ROWS } from '../../dosage/vehicles';
import { MOUSE_IP_MAX_VOLUME_ML_PER_G } from '../../constants/doseUnits';
import { makeSolute, soluteDosesMg as computeSoluteDosesMg, totalDoseMg } from '../../dosage/solutes';
import useOutputFeedback from '../../hooks/useOutputFeedback';
import SolutesSection from './SolutesSection';
import SoluteBreakdown from './SoluteBreakdown';
import Step3StudyParametersSection from './Step3StudyParametersSection';
import Step4Outputs from './Step4Outputs';
import VehicleRatioTable from './VehicleRatioTable';
import DissolutionTable from './DissolutionTable';
import PrintActions from './PrintActions';

export default function IntraperitonealDosageForm() {
  const form = useForm({
    initialValues: {
      volPerInjMl: '',

      volPerInjWeight: '',
      volPerInjWeightUnit: 'g',
      avgBodyWeight: '',
      avgBodyWeightUnit: 'g',
      totalInjections: '',
      wasteBufferPct: '',
      pipetteMinUl: 2,
      maxVolumeRateMlPerG: MOUSE_IP_MAX_VOLUME_ML_PER_G,
    },
  });
  const v = form.values;

  const [solutes, setSolutes] = useState(() => [makeSolute()]);
  const [vehicleRows, setVehicleRows] = useState(DEFAULT_IP_VEHICLE_ROWS);
  const [outputFeedback, scheduleOutputFeedback] = useOutputFeedback();
  const [units, setUnits] = useState({
    dosePerSubject: 'mg',
    solute: 'mg',
    volumePerSubject: 'ml',
    totalVolume: 'ml',
    concentrationMass: 'mg',
    concentrationVolume: 'ml',
  });
  const setUnit = (key, value) => setUnits((prev) => ({ ...prev, [key]: value }));

  const soluteDosesMg = useMemo(
    () =>
      computeSoluteDosesMg(solutes, {
        avgBodyWeight: v.avgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
      }),
    [solutes, v.avgBodyWeight, v.avgBodyWeightUnit],
  );
  const dosePerAvgSubjectMg = totalDoseMg(soluteDosesMg);
  const soleSolute = solutes.length === 1 ? solutes[0] : undefined;

  const outputs = useMemo(
    () =>
      computeInjectionSolutionOutputs({
        dosePerAvgSubjectMg,
        volPerInjMl: v.volPerInjMl,
        refBodyWeight: v.volPerInjWeight,
        refBodyWeightUnit: v.volPerInjWeightUnit,
        avgBodyWeight: v.avgBodyWeight,
        avgBodyWeightUnit: v.avgBodyWeightUnit,
        totalInjections: v.totalInjections,
        wasteBufferPct: v.wasteBufferPct,
        maxVolumeRateMlPerG: v.maxVolumeRateMlPerG,
      }),
    [
      dosePerAvgSubjectMg, v.volPerInjMl, v.volPerInjWeight, v.volPerInjWeightUnit,
      v.avgBodyWeight, v.avgBodyWeightUnit, v.totalInjections, v.wasteBufferPct,
      v.maxVolumeRateMlPerG,
    ],
  );

  /** Problems with what was typed into Step 3. */
  const step3Issues = useMemo(() => {
    const issues = [];
    const injections = toOptionalNumber(v.totalInjections);
    if (injections !== undefined && injections === 0) {
      issues.push({
        level: 'error',
        message: 'Total number of injections is 0, so every output below is zero. Enter at least 1.',
      });
    }
    if (v.wasteBufferPct === '' || v.wasteBufferPct === null) {
      issues.push({
        level: 'warning',
        message:
          'Waste buffer is blank, which is treated as 0%. You will make exactly enough with no ' +
          'margin for pipette and syringe dead volume — 10% is a common choice.',
      });
    }
    return issues;
  }, [v.totalInjections, v.wasteBufferPct]);

  /** Problems with the calculated results. */
  const step4Issues = useMemo(() => {
    const issues = [];
    const { volumePerAvgSubjectMl, maxVolumePerSubjectMl } = outputs;
    if (
      volumePerAvgSubjectMl !== undefined &&
      maxVolumePerSubjectMl !== undefined &&
      volumePerAvgSubjectMl > maxVolumePerSubjectMl
    ) {
      issues.push({
        level: 'error',
        message:
          `Volume per subject is ${roundTo(volumePerAvgSubjectMl, 4)} mL, above the ` +
          `${roundTo(maxVolumePerSubjectMl, 4)} mL ceiling for a ${v.avgBodyWeight} ` +
          `${v.avgBodyWeightUnit} subject at ${v.maxVolumeRateMlPerG} mL/g. ` +
          'Reduce the injection volume or use a more concentrated solution.',
      });
    }
    return issues;
  }, [outputs, v.avgBodyWeight, v.avgBodyWeightUnit, v.maxVolumeRateMlPerG]);

  // Keep the "Dose per Avg Subject" unit following the unit the dose was
  // entered in, until the user overrides it.
  const naturalDoseUnit = dosePerAvgSubjectDisplayUnit(
    soleSolute?.dosageType,
    soleSolute?.doseUnit,
    soleSolute?.dosePerSubjectUnit,
  );

  /** How much of each substance the whole batch needs, in order. */
  const soluteBatchMg = soluteDosesMg.map((mg) =>
    computeSoluteRequiredMg(mg, v.totalInjections, v.wasteBufferPct),
  );

  return (
    <Stack gap="lg" mt="md">
      <SolutesSection
        solutes={solutes}
        onSolutesChange={setSolutes}
        scheduleOutputFeedback={scheduleOutputFeedback}
      />

      <Step3StudyParametersSection
        volPerInjMl={v.volPerInjMl}
        volPerInjWeight={v.volPerInjWeight}
        volPerInjWeightUnit={v.volPerInjWeightUnit}
        avgBodyWeight={v.avgBodyWeight}
        avgBodyWeightUnit={v.avgBodyWeightUnit}
        totalInjections={v.totalInjections}
        wasteBufferPct={v.wasteBufferPct}
        pipetteMinUl={v.pipetteMinUl}
        maxVolumeRateMlPerG={v.maxVolumeRateMlPerG}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        issues={step3Issues}
      />

      <Step4Outputs
        outputFeedback={outputFeedback}
        dosePerAvgSubjectMg={dosePerAvgSubjectMg}
        soluteRequiredMg={outputs.soluteRequiredMg}
        volumePerAvgSubjectMl={outputs.volumePerAvgSubjectMl}
        totalVolumeMl={outputs.totalVolumeMl}
        concentrationMgPerMl={outputs.concentrationMgPerMl}
        units={{ ...units, dosePerSubject: units.dosePerSubject || naturalDoseUnit }}
        setUnit={setUnit}
        issues={step4Issues}
        footer={
          <SoluteBreakdown
            solutes={solutes}
            soluteDosesMg={soluteDosesMg}
            bodyWeightKg={weightToKg(v.avgBodyWeight, v.avgBodyWeightUnit)}
          />
        }
      />

      <VehicleRatioTable
        rows={vehicleRows}
        onRowsChange={setVehicleRows}
        route="ip"
        stepLabel="Step 5 — Vehicle ratio"
        onBlur={scheduleOutputFeedback}
        solutes={solutes}
        soluteDosesMg={soluteDosesMg}
        volumePerSubjectMl={outputs.volumePerAvgSubjectMl}
        bodyWeightKg={weightToKg(v.avgBodyWeight, v.avgBodyWeightUnit)}
        pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
      />

      <DissolutionTable
        outputFeedback={outputFeedback}
        totalVolumeMl={outputs.totalVolumeMl}
        solutes={solutes}
        soluteBatchMg={soluteBatchMg}
        soluteDosesMg={soluteDosesMg}
        vehicleRows={vehicleRows}
        pipetteMinUl={toOptionalNumber(v.pipetteMinUl) ?? 0}
        stepLabel="Step 6 — Dissolution & vehicle volumes"
      />
      <PrintActions title="intraperitoneal injection calculator" />
    </Stack>
  );
}
