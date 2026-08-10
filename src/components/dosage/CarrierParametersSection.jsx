import {
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DOSE_UNITS, MOUSE_WEIGHT_HINT, WEIGHT_UNITS } from '../../constants/doseUnits';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import { roundTo } from '../../dosage/numberUtils';
import { inputFieldColor, navActiveColor } from '../../theme';

const inputBlue = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * Loading parameters — the physical constraints of the session, independent of
 * whether the drug starts as powder, stock, or a finished solution.
 *
 * What the carrier is changes the labels, the capacity range, and whether a
 * syringe is involved at all. It does not change anything below the capacity
 * control, which is why all of that is shared rather than copied.
 */
export default function CarrierParametersSection({
  carrier,
  carrierName,
  carrierAmount,
  carrierAmountUnit,
  carrierAmountMode,
  carrierRefBodyWeight,
  carrierAmountPerSubjectMg,
  totalCarrierMg,
  capacityUl,
  bodyMassMode,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalBodyMass,
  subjectCount,
  derivedAverage,
  totalDoses,
  wasteBufferPct,
  pipetteMinUl,
  syringeMinUl,
  showPipetteMinimum = true,
  setFieldValue,
  scheduleOutputFeedback,
  issues,
}) {
  // What the waste buffer actually buys, in the unit the user thinks in.
  // At zero it carries the recommendation instead — advice as light text beats
  // a warning about a field nobody has reached yet.
  const plannedDoses = Number(totalDoses);
  const wastePct = Number(wasteBufferPct);
  const bufferOff = !Number.isFinite(wastePct) || wastePct <= 0;
  const spareDoses =
    !bufferOff && Number.isFinite(plannedDoses) && plannedDoses > 0
      ? Math.floor(plannedDoses * (1 + wastePct / 100)) - plannedDoses
      : undefined;

  // Once the carrier has a name, use it: "loading the cookie dough" beats
  // "loading the portion" on a page someone is following at the bench.
  const named = (carrierName ?? '').trim();
  const carrierNoun = named || carrier.noun;
  const substanceNoun = named || carrier.substanceNoun || carrier.noun;

  return (
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="sm">
        Step 2 — Dosing Parameters
      </Text>
      <Stack gap="md">
        {carrier.namable && (
          <TextInput
            label="What is the solid?"
            placeholder="optional, e.g. transgenic cookie dough"
            value={carrierName}
            onChange={(event) => setFieldValue('carrierName', event.currentTarget.value)}
            onBlur={scheduleOutputFeedback}
            w={320}
            {...inputBlue}
          />
        )}

        {/*
          How much carrier each subject gets. Separate from the dose volume and
          from the drug: it is the vehicle for the vehicle, and labs specify it
          by mass ("4 mg of dough per g of mouse") rather than by volume.
        */}
        {carrier.weighed && (
          <div>
            <SegmentedControl
              size="xs"
              color={navActiveColor}
              value={carrierAmountMode}
              onChange={(value) => {
                setFieldValue('carrierAmountMode', value);
                scheduleOutputFeedback();
              }}
              data={[
                { value: 'by-body-weight', label: 'Per body mass' },
                { value: 'per-subject', label: 'Flat per subject' },
              ]}
              mb={8}
            />
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label={`How much ${substanceNoun} per subject?`}
                placeholder="e.g. 4"
                min={0}
                decimalScale={6}
                value={carrierAmount}
                onChange={(value) => setFieldValue('carrierAmount', value)}
                onBlur={scheduleOutputFeedback}
                w={150}
                {...inputBlue}
              />
              <LabSelect
                label="Unit"
                data={DOSE_UNITS}
                value={carrierAmountUnit}
                onChange={(value) => setFieldValue('carrierAmountUnit', value ?? 'mg')}
                onBlur={scheduleOutputFeedback}
                w={100}
              />
              {carrierAmountMode === 'by-body-weight' && (
                <>
                  <Text pb="sm" size="sm">
                    per
                  </Text>
                  <NumberInput
                    label="Body mass"
                    placeholder="e.g. 1"
                    min={0}
                    decimalScale={6}
                    value={carrierRefBodyWeight}
                    onChange={(value) => setFieldValue('carrierRefBodyWeight', value)}
                    onBlur={scheduleOutputFeedback}
                    w={130}
                    {...inputBlue}
                  />
                  <Text pb="sm" size="sm">
                    {avgBodyWeightUnit}
                  </Text>
                </>
              )}
              {carrierAmountPerSubjectMg !== undefined && (
                <Text pb="sm" size="sm" c="dimmed">
                  &rarr; <strong>{roundTo(carrierAmountPerSubjectMg, 4)} mg</strong> each
                  {totalCarrierMg !== undefined &&
                    `, ${roundTo(totalCarrierMg, 4)} mg for the batch`}
                </Text>
              )}
            </Group>
          </div>
        )}

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm" mb={4}>
            <NumberInput
              label={carrier.capacityLabel}
              min={0}
              decimalScale={3}
              value={capacityUl}
              onChange={(value) => setFieldValue('capacityUl', value)}
              onBlur={scheduleOutputFeedback}
              w={260}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              µL
            </Text>
          </Group>
          {/* The slider is a quick way to reach the common sizes; the field
              above is there so an exact value can be typed and cannot be
              nudged by accident. Both edit the same number. */}
          <Slider
            min={carrier.capacitySlider.min}
            max={carrier.capacitySlider.max}
            step={carrier.capacitySlider.step}
            value={Number(capacityUl) || 0}
            onChange={(value) => setFieldValue('capacityUl', value)}
            onChangeEnd={scheduleOutputFeedback}
            marks={carrier.capacitySlider.marks}
            color={navActiveColor}
            mb="xl"
            aria-label={`${carrier.capacityLabel} in microlitres`}
          />
          <Text size="xs" c="dimmed" className="no-print">
            {carrier.capacityHint}
          </Text>
        </div>

        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            {/*
              Two instruments, two floors — but only where there are two. With
              no syringe the pipette both mixes the vehicle and delivers the
              dose, so one field says so rather than two saying the same number.
            */}
            {carrier.usesSyringe && (
              <>
                <NumberInput
                  label={`Syringe minimum (loading the ${carrierNoun})`}
                  placeholder="e.g. 25"
                  min={0}
                  decimalScale={3}
                  value={syringeMinUl}
                  onChange={(value) => setFieldValue('syringeMinUl', value)}
                  onBlur={scheduleOutputFeedback}
                  w={240}
                  {...inputBlue}
                />
                <Text pb="sm" size="sm">
                  µL
                </Text>
              </>
            )}
            {showPipetteMinimum && (
              <>
                <NumberInput
                  label={
                    carrier.usesSyringe
                      ? 'Pipette minimum (mixing the vehicle)'
                      : 'Pipette minimum (mixing and loading)'
                  }
                  placeholder="e.g. 2"
                  min={0}
                  decimalScale={3}
                  value={pipetteMinUl}
                  onChange={(value) => setFieldValue('pipetteMinUl', value)}
                  onBlur={scheduleOutputFeedback}
                  w={260}
                  {...inputBlue}
                />
                <Text pb="sm" size="sm">
                  µL
                </Text>
              </>
            )}
          </Group>
        </div>

        <div>
          <SegmentedControl
            size="xs"
            color={navActiveColor}
            value={bodyMassMode}
            onChange={(value) => {
              setFieldValue('bodyMassMode', value);
              scheduleOutputFeedback();
            }}
            data={[
              { value: 'average', label: 'Average body mass' },
              { value: 'total', label: 'Total body mass' },
            ]}
            mb={8}
          />
          {bodyMassMode === 'total' ? (
            <>
              <Group align="flex-end" wrap="wrap" gap="sm">
                <NumberInput
                  label="Total body mass, all subjects"
                  placeholder="e.g. 900"
                  min={0}
                  decimalScale={6}
                  value={totalBodyMass}
                  onChange={(value) => setFieldValue('totalBodyMass', value)}
                  onBlur={scheduleOutputFeedback}
                  w={200}
                  {...inputBlue}
                />
                <LabSelect
                  label="Unit"
                  data={WEIGHT_UNITS}
                  value={avgBodyWeightUnit}
                  onChange={(value) => setFieldValue('avgBodyWeightUnit', value ?? 'g')}
                  onBlur={scheduleOutputFeedback}
                  w={100}
                />
                <NumberInput
                  label="across how many subjects?"
                  placeholder="e.g. 40"
                  min={0}
                  allowDecimal={false}
                  value={subjectCount}
                  onChange={(value) => setFieldValue('subjectCount', value)}
                  onBlur={scheduleOutputFeedback}
                  w={190}
                  {...inputBlue}
                />
                {derivedAverage !== undefined && (
                  <Text pb="sm" size="sm" c="dimmed">
                    &rarr; <strong>{derivedAverage}</strong> {avgBodyWeightUnit} each
                  </Text>
                )}
              </Group>
              <Text size="xs" c="dimmed" mt={6} className="no-print">
                * exact if you weighed every subject; the average is worked out for you
              </Text>
            </>
          ) : (
            <>
              <Group align="flex-end" wrap="wrap" gap="sm">
                <NumberInput
                  label="Average body mass per subject"
                  placeholder="e.g. 25"
                  min={0}
                  decimalScale={6}
                  value={avgBodyWeight}
                  onChange={(value) => setFieldValue('avgBodyWeight', value)}
                  onBlur={scheduleOutputFeedback}
                  {...inputBlue}
                />
                <LabSelect
                  label="Unit"
                  data={WEIGHT_UNITS}
                  value={avgBodyWeightUnit}
                  onChange={(value) => setFieldValue('avgBodyWeightUnit', value ?? 'g')}
                  onBlur={scheduleOutputFeedback}
                  w={100}
                />
              </Group>
              <Text size="xs" c="dimmed" mt={6} className="no-print">
                {MOUSE_WEIGHT_HINT}
              </Text>
            </>
          )}
        </div>

        <NumberInput
          label="Total number of dosages to prepare"
          placeholder="count"
          min={0}
          allowDecimal={false}
          value={totalDoses}
          onChange={(value) => setFieldValue('totalDoses', value)}
          onBlur={scheduleOutputFeedback}
          w={260}
          {...inputBlue}
        />

        <Group align="flex-end" wrap="wrap" gap="sm">
          <NumberInput
            label="Waste buffer"
            placeholder="e.g. 10"
            min={0}
            max={100}
            decimalScale={2}
            value={wasteBufferPct}
            onChange={(value) => setFieldValue('wasteBufferPct', value)}
            onBlur={scheduleOutputFeedback}
            {...inputBlue}
          />
          <Text pb="sm" size="sm">
            %
          </Text>
          {bufferOff ? (
            <Text pb="sm" size="sm" c="dimmed">
              &rarr; 10% is recommended
            </Text>
          ) : (
            spareDoses !== undefined && (
              <Text pb="sm" size="sm" c="dimmed">
                &rarr; enough for <strong>{plannedDoses + spareDoses}</strong> dosages,{' '}
                {spareDoses} spare
              </Text>
            )
          )}
        </Group>

      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
