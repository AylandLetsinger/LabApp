import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  computeDosePerAvgSubjectMg,
  dosePerAvgSubjectDisplayUnit,
} from '../../dosage/computeDosePerAvgSubject';
import { computeIpSolutionStep4 } from '../../dosage/computeIpSolutionOutputs';
import { computeVehicleRecipeVolumesMl } from '../../dosage/computeIpVehicleRecipeVolumes';
import { toOptionalNumber } from '../../dosage/numberUtils';
import { mgToMassUnit } from '../../dosage/unitConversions';
import Step2DosageTypeSection from './Step2DosageTypeSection';
import Step3StudyParametersSection from './Step3StudyParametersSection';
import Step4Outputs from './Step4Outputs';
import Step5VehicleRatioTable from './Step5VehicleRatioTable';
import Step6DissolutionTable from './Step6DissolutionTable';

/** Minimum time to show “updating” before check (feels intentional even though math is sync). */
const OUTPUT_LOADING_MS = 320;
const OUTPUT_OK_MS = 2600;

export default function IntraperitonealDosageForm() {
  const form = useForm({
    initialValues: {
      dosageType: 'by-body-weight',
      dosePerSubject: '',
      dosePerSubjectUnit: 'mg',
      doseAmount: '',
      doseUnit: 'mg',
      bodyWeightAmount: '',
      bodyWeightUnit: 'kg',
      volPerInjMl: '',
      volPerInjG: '',
      avgBodyWeightG: '',
      avgBodyWeightUnit: 'g',
      totalInjections: '',
      wasteBufferPct: '',
      /** Step 6 vehicle ratio (parts by volume) — UI only for now. */
      vehicleRatioDmso: '',
      vehicleRatioEthanol: '',
      vehicleRatioEmulphor: '',
      vehicleRatioSaline: '',
    },
  });
  const {
    dosageType,
    dosePerSubject,
    dosePerSubjectUnit,
    doseAmount,
    doseUnit,
    bodyWeightAmount,
    bodyWeightUnit,
    volPerInjMl,
    volPerInjG,
    avgBodyWeightG,
    avgBodyWeightUnit,
    totalInjections,
    wasteBufferPct,
    vehicleRatioDmso,
    vehicleRatioEthanol,
    vehicleRatioEmulphor,
    vehicleRatioSaline,
  } = form.values;

  /** After leaving a Step 2–3 field: brief “loading” then green check on Step 4 (calcs stay live). */
  const [outputFeedback, setOutputFeedback] = useState('idle');
  const outputFeedbackTimers = useRef({ load: null, ok: null });

  const scheduleOutputFeedback = useCallback(() => {
    if (outputFeedbackTimers.current.load) clearTimeout(outputFeedbackTimers.current.load);
    if (outputFeedbackTimers.current.ok) clearTimeout(outputFeedbackTimers.current.ok);
    setOutputFeedback('loading');
    outputFeedbackTimers.current.load = window.setTimeout(() => {
      setOutputFeedback('ok');
      outputFeedbackTimers.current.load = null;
      outputFeedbackTimers.current.ok = window.setTimeout(() => {
        setOutputFeedback('idle');
        outputFeedbackTimers.current.ok = null;
      }, OUTPUT_OK_MS);
    }, OUTPUT_LOADING_MS);
  }, []);

  useEffect(
    () => () => {
      if (outputFeedbackTimers.current.load) clearTimeout(outputFeedbackTimers.current.load);
      if (outputFeedbackTimers.current.ok) clearTimeout(outputFeedbackTimers.current.ok);
    },
    [],
  );

  /** %(v/v) from ratio parts / sum(parts); null if incomplete or total ≤ 0. */
  const vehicleVvPercents = useMemo(() => {
    const parts = [
      toOptionalNumber(vehicleRatioDmso),
      toOptionalNumber(vehicleRatioEthanol),
      toOptionalNumber(vehicleRatioEmulphor),
      toOptionalNumber(vehicleRatioSaline),
    ];
    if (parts.some((v) => v === undefined || v < 0)) return null;
    const total = parts.reduce((sum, v) => sum + v, 0);
    if (total <= 0) return null;
    return parts.map((v) => (v / total) * 100);
  }, [vehicleRatioDmso, vehicleRatioEthanol, vehicleRatioEmulphor, vehicleRatioSaline]);

  const vehicleRatioRows = [
    {
      label: 'DMSO (Dimethyl Sulfoxide)',
      value: vehicleRatioDmso,
      onChange: (v) => form.setFieldValue('vehicleRatioDmso', v),
      placeholder: '-',
      ariaLabel: 'DMSO ratio parts',
      rowIndex: 0,
    },
    {
      label: 'Ethanol',
      value: vehicleRatioEthanol,
      onChange: (v) => form.setFieldValue('vehicleRatioEthanol', v),
      placeholder: '-',
      ariaLabel: 'Ethanol ratio parts',
      rowIndex: 1,
    },
    {
      label: 'Emulphor',
      value: vehicleRatioEmulphor,
      onChange: (v) => form.setFieldValue('vehicleRatioEmulphor', v),
      placeholder: '-',
      ariaLabel: 'Emulphor ratio parts',
      rowIndex: 2,
    },
    {
      label: 'Saline',
      value: vehicleRatioSaline,
      onChange: (v) => form.setFieldValue('vehicleRatioSaline', v),
      placeholder: '-',
      ariaLabel: 'Saline ratio parts',
      rowIndex: 3,
    },
  ];

  const dosePerAvgSubjectMg = useMemo(
    () =>
      computeDosePerAvgSubjectMg({
        dosageType,
        doseAmount,
        doseUnit,
        refBodyWeight: bodyWeightAmount,
        refBodyWeightUnit: bodyWeightUnit,
        avgBodyWeight: avgBodyWeightG,
        avgBodyWeightUnit,
        dosePerSubject,
        dosePerSubjectUnit,
      }),
    [
      dosageType,
      doseAmount,
      doseUnit,
      bodyWeightAmount,
      bodyWeightUnit,
      avgBodyWeightG,
      avgBodyWeightUnit,
      dosePerSubject,
      dosePerSubjectUnit,
    ],
  );

  const dosePerAvgDisplayUnit = dosePerAvgSubjectDisplayUnit(
    dosageType,
    doseUnit,
    dosePerSubjectUnit,
  );
  const dosePerAvgDisplayValue =
    dosePerAvgSubjectMg === undefined
      ? undefined
      : mgToMassUnit(dosePerAvgSubjectMg, dosePerAvgDisplayUnit);

  const { soluteRequiredMg, volumePerAvgSubjectMl, totalVolumeMl, concentrationMgPerMl } = useMemo(
    () =>
      computeIpSolutionStep4({
        dosePerAvgSubjectMg,
        volPerInjMl,
        volPerInjG,
        avgBodyWeightG,
        totalInjections,
        wasteBufferPct,
      }),
    [
      dosePerAvgSubjectMg,
      volPerInjMl,
      volPerInjG,
      avgBodyWeightG,
      totalInjections,
      wasteBufferPct,
    ],
  );

  const soluteDisplayValue =
    soluteRequiredMg === undefined ? undefined : mgToMassUnit(soluteRequiredMg, dosePerAvgDisplayUnit);

  const dissolutionSteps = useMemo(() => {
    const volsMl = computeVehicleRecipeVolumesMl(totalVolumeMl, [
      vehicleRatioDmso,
      vehicleRatioEthanol,
      vehicleRatioEmulphor,
      vehicleRatioSaline,
    ]);
    if (soluteRequiredMg === undefined || !Number.isFinite(soluteRequiredMg) || volsMl === null) {
      return null;
    }
    const [dmsOMl, ethanolMl, emulphorMl, salineMl] = volsMl;
    return [
      {
        lead: 'Dissolve',
        value: `${Number(soluteRequiredMg.toFixed(4))}`,
        unit: 'mg',
        tail: 'of your solute',
      },
      {
        lead: 'in',
        value: `${Math.round(dmsOMl * 1000)}`,
        unit: 'µL',
        tail: 'in DMSO',
      },
      {
        lead: 'in',
        value: `${Math.round(ethanolMl * 1000)}`,
        unit: 'µL',
        tail: 'in Ethanol',
      },
      {
        lead: 'in',
        value: `${Math.round(emulphorMl * 1000)}`,
        unit: 'µL',
        tail: 'in Emulphor',
      },
      {
        lead: 'in',
        value: `${Number(salineMl.toFixed(4))}`,
        unit: 'mL',
        tail: 'in Saline',
      },
    ];
  }, [
    totalVolumeMl,
    vehicleRatioDmso,
    vehicleRatioEthanol,
    vehicleRatioEmulphor,
    vehicleRatioSaline,
    soluteRequiredMg,
  ]);

  const step2Props = {
    dosageType,
    dosePerSubject,
    dosePerSubjectUnit,
    doseAmount,
    doseUnit,
    bodyWeightAmount,
    bodyWeightUnit,
    setFieldValue: form.setFieldValue,
    scheduleOutputFeedback,
  };

  const step3Props = {
    volPerInjMl,
    volPerInjG,
    avgBodyWeightG,
    avgBodyWeightUnit,
    totalInjections,
    wasteBufferPct,
    setFieldValue: form.setFieldValue,
    scheduleOutputFeedback,
  };

  return (
    <Stack gap="lg" mt="md">
      <Step2DosageTypeSection {...step2Props} />

      <Step3StudyParametersSection {...step3Props} />

      <Step4Outputs
        outputFeedback={outputFeedback}
        dosePerAvgDisplayValue={dosePerAvgDisplayValue}
        dosePerAvgDisplayUnit={dosePerAvgDisplayUnit}
        soluteDisplayValue={soluteDisplayValue}
        volumePerAvgSubjectMl={volumePerAvgSubjectMl}
        totalVolumeMl={totalVolumeMl}
        concentrationMgPerMl={concentrationMgPerMl}
      />

      <Step5VehicleRatioTable
        vehicleRatioRows={vehicleRatioRows}
        vehicleVvPercents={vehicleVvPercents}
        scheduleOutputFeedback={scheduleOutputFeedback}
      />

      <Step6DissolutionTable outputFeedback={outputFeedback} dissolutionSteps={dissolutionSteps} />
    </Stack>
  );
}
