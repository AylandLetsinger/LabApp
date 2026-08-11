import { useMemo, useState } from 'react';
import { Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  mediumVolumeMl,
  perVesselContribution,
  totalSolventPercentVv,
} from '../../dosage/computeInVitro';
import { anyConcentrationToMgPerMl } from '../../dosage/molarUnits';
import { toOptionalNumber, toPositiveNumber } from '../../dosage/numberUtils';
import { makeSolute, soluteDisplayName } from '../../dosage/solutes';
import { volumeToMl } from '../../dosage/unitConversions';
import { VESSELS } from '../../dosage/vessels';
import useOutputFeedback from '../../hooks/useOutputFeedback';
import SolutesSection from './SolutesSection';
import { TARGET_CONCENTRATION_ONLY } from '../../dosage/dosageTypes';
import VesselParametersSection from './VesselParametersSection';
import StockTable from './StockTable';
import InVitroRecipeTable from './InVitroRecipeTable';
import ConcentrationSeriesTable from './ConcentrationSeriesTable';
import PrintActions from './PrintActions';

/** A fresh stock record for a substance that does not have one yet. */
const newStock = () => ({
  concentrationValue: '',
  concentrationUnit: 'mg/ml',
  solventId: 'dmso',
  solventPercent: 100,
});

export default function DirectApplicationForm() {
  const form = useForm({
    initialValues: {
      vesselId: 'well-plate',
      finalVolume: 200,
      finalVolumeUnit: 'ul',
      conditionCount: '',
      replicateCount: 3,
      wasteBufferPct: 0,
      pipetteMinUl: 0.5,
      maxSolventPct: '',
      seriesFrom: '',
      seriesTo: '',
      seriesFactor: 10,
      seriesUnit: 'mg/ml',
    },
  });
  const v = form.values;

  const [solutes, setSolutes] = useState(() => [
    makeSolute({ dosageType: 'target-concentration' }),
  ]);
  const [stocks, setStocks] = useState({});
  const [outputFeedback, scheduleOutputFeedback] = useOutputFeedback();

  const vessel = VESSELS[v.vesselId] ?? VESSELS['well-plate'];

  /** A substance added later needs a stock; one removed leaves its behind. */
  const stockFor = (soluteId) => stocks[soluteId] ?? newStock();
  const filledStocks = useMemo(() => {
    const next = {};
    solutes.forEach((s) => {
      next[s.id] = stocks[s.id] ?? newStock();
    });
    return next;
  }, [solutes, stocks]);

  const finalVolumeMl = volumeToMl(v.finalVolume, v.finalVolumeUnit);
  const maxSolventPct = toPositiveNumber(v.maxSolventPct);
  const pipetteMinMl =
    toPositiveNumber(v.pipetteMinUl) !== undefined ? Number(v.pipetteMinUl) / 1000 : 0;

  /** How many vessels the batch has to cover. */
  const totalVessels = useMemo(() => {
    const conditions = toOptionalNumber(v.conditionCount);
    if (conditions === undefined) return undefined;
    if (!vessel.hasReplicates) return conditions;
    const replicates = toOptionalNumber(v.replicateCount);
    if (replicates === undefined) return undefined;
    return conditions * replicates;
  }, [v.conditionCount, v.replicateCount, vessel.hasReplicates]);

  /** What each substance puts into one vessel. */
  const contributions = useMemo(
    () =>
      solutes.map((solute) => {
        const stock = stockFor(solute.id);
        const targetMgPerMl = anyConcentrationToMgPerMl(
          solute.targetConcentrationValue,
          solute.targetConcentrationUnit,
          solute.molecularWeight,
        );
        const stockMgPerMl = anyConcentrationToMgPerMl(
          stock.concentrationValue,
          stock.concentrationUnit,
          solute.molecularWeight,
        );
        const fraction = (toPositiveNumber(stock.solventPercent) ?? 100) / 100;
        const c = perVesselContribution({
          targetMgPerMl,
          stockMgPerMl,
          finalVolumeMl,
          solventFractionOfStock: fraction,
        });
        return {
          ...c,
          belowPipetteMinimum:
            pipetteMinMl > 0 && c.stockMl !== undefined && c.stockMl > 0 && c.stockMl < pipetteMinMl,
          overVesselVolume:
            c.stockMl !== undefined && finalVolumeMl !== undefined && c.stockMl > finalVolumeMl,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solutes, stocks, finalVolumeMl, pipetteMinMl],
  );

  const totalSolventPct = totalSolventPercentVv(contributions);
  const mediumMl = mediumVolumeMl(finalVolumeMl, contributions);

  /** Batch scale: every vessel, plus whatever margin was asked for. */
  const batchFactor = useMemo(() => {
    if (totalVessels === undefined) return undefined;
    const waste = toOptionalNumber(v.wasteBufferPct) ?? 0;
    return totalVessels * (1 + waste / 100);
  }, [totalVessels, v.wasteBufferPct]);

  const parameterIssues = useMemo(() => {
    const issues = [];
    if (totalVessels === 0) {
      issues.push({
        level: 'error',
        message: `Number of ${vessel.pluralNoun} is 0, so every batch figure below is zero.`,
      });
    }
    return issues;
  }, [totalVessels, vessel.pluralNoun]);

  const soleSolute = solutes.length === 1 ? solutes[0] : undefined;

  return (
    <Stack gap="lg" mt="md">
      <SolutesSection
        stepLabel="Step 1 — What are you adding?"
        solutes={solutes}
        onSolutesChange={setSolutes}
        scheduleOutputFeedback={scheduleOutputFeedback}
        soluteFieldProps={{
          dosageTypeOptions: TARGET_CONCENTRATION_ONLY,
          targetVolumeNoun: vessel.noun,
        }}
        newSoluteDefaults={{ dosageType: 'target-concentration' }}
      />

      <VesselParametersSection
        vesselId={v.vesselId}
        vessel={vessel}
        finalVolume={v.finalVolume}
        finalVolumeUnit={v.finalVolumeUnit}
        conditionCount={v.conditionCount}
        replicateCount={v.replicateCount}
        totalVessels={totalVessels}
        wasteBufferPct={v.wasteBufferPct}
        pipetteMinUl={v.pipetteMinUl}
        maxSolventPct={v.maxSolventPct}
        setFieldValue={form.setFieldValue}
        scheduleOutputFeedback={scheduleOutputFeedback}
        issues={parameterIssues}
      />

      <StockTable
        solutes={solutes}
        stocks={filledStocks}
        onStocksChange={setStocks}
        contributions={contributions}
        vessel={vessel}
        maxSolventPct={maxSolventPct}
        totalSolventPct={totalSolventPct}
        onBlur={scheduleOutputFeedback}
      />

      <InVitroRecipeTable
        outputFeedback={outputFeedback}
        solutes={solutes}
        contributions={contributions}
        mediumMl={mediumMl}
        finalVolumeMl={finalVolumeMl}
        batchFactor={batchFactor}
        totalVessels={totalVessels}
        vessel={vessel}
      />

      {/*
        With two stocks the volume added at each step depends on which one is
        being varied, and the table would have to guess. It appears only when
        there is one substance to vary.
      */}
      {soleSolute && (
        <ConcentrationSeriesTable
          solute={soleSolute}
          stock={stockFor(soleSolute.id)}
          finalVolumeMl={finalVolumeMl}
          pipetteMinUl={v.pipetteMinUl}
          maxSolventPct={maxSolventPct}
          fromValue={v.seriesFrom}
          toValue={v.seriesTo}
          factor={v.seriesFactor}
          unit={v.seriesUnit}
          setFieldValue={form.setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
          stepLabel={`Step 5 — Concentration series${
            soluteDisplayName(soleSolute, 0) ? '' : ''
          }`}
        />
      )}

      <PrintActions title="direct application calculator" />
    </Stack>
  );
}
