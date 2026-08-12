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
import { DOSE_UNITS } from '../../constants/doseUnits';
import LabSelect from '../LabSelect';
import IssueList from './IssueList';
import BodyMassFields from './BodyMassFields';
import WasteBufferField from './WasteBufferField';
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
  absorbencyUl,
  absorbencyMass,
  absorbencyMassUnit,
  bodyMassMode,
  avgBodyWeight,
  avgBodyWeightUnit,
  totalBodyMass,
  subjectCount,
  derivedAverage,
  minBodyWeight,
  maxBodyWeight,
  totalDoses,
  wasteBufferPct,
  pipetteMinUl,
  syringeMinUl,
  showPipetteMinimum = true,
  setFieldValue,
  scheduleOutputFeedback,
  issues,
}) {

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
          {carrier.capacity.kind === 'per-mass' ? (
            <Group align="flex-end" wrap="wrap" gap="sm">
              <NumberInput
                label={carrier.capacity.label}
                placeholder="e.g. 5"
                min={0}
                decimalScale={4}
                value={absorbencyUl}
                onChange={(value) => setFieldValue('absorbencyUl', value)}
                onBlur={scheduleOutputFeedback}
                w={230}
                {...inputBlue}
              />
              <Text pb="sm" size="sm">
                µL per
              </Text>
              <NumberInput
                label="Mass of solid"
                placeholder="e.g. 100"
                min={0}
                decimalScale={4}
                value={absorbencyMass}
                onChange={(value) => setFieldValue('absorbencyMass', value)}
                onBlur={scheduleOutputFeedback}
                w={130}
                {...inputBlue}
              />
              <LabSelect
                label="Unit"
                data={DOSE_UNITS}
                value={absorbencyMassUnit}
                onChange={(value) => setFieldValue('absorbencyMassUnit', value ?? 'mg')}
                onBlur={scheduleOutputFeedback}
                w={100}
              />
              <Text pb="sm" size="sm" c="dimmed">
                {capacityUl === undefined
                  ? '→ also needs the amount above'
                  : `→ ceiling ${roundTo(capacityUl, 3)} µL per subject`}
              </Text>
            </Group>
          ) : (
            <>
              <Group align="flex-end" wrap="wrap" gap="sm" mb={4}>
                <NumberInput
                  label={carrier.capacity.label}
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
                min={carrier.capacity.slider.min}
                max={carrier.capacity.slider.max}
                step={carrier.capacity.slider.step}
                value={Number(capacityUl) || 0}
                onChange={(value) => setFieldValue('capacityUl', value)}
                onChangeEnd={scheduleOutputFeedback}
                marks={carrier.capacity.slider.marks}
                color={navActiveColor}
                mb="xl"
                aria-label={`${carrier.capacity.label} in microlitres`}
              />
            </>
          )}
          <Text size="xs" c="dimmed" className="no-print">
            {carrier.capacity.hint}
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

        <BodyMassFields
          bodyMassMode={bodyMassMode}
          avgBodyWeight={avgBodyWeight}
          avgBodyWeightUnit={avgBodyWeightUnit}
          totalBodyMass={totalBodyMass}
          subjectCount={subjectCount}
          derivedAverage={derivedAverage}
          setFieldValue={setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />

        {/*
          The spread of the cohort, not just its middle. One batch carries one
          concentration, so the average subject's dose volume decides everyone
          else's — the lightest subject gets the smallest volume anybody will
          have to measure, and the heaviest the largest the carrier must hold.
          Both ends therefore bound the volume suggested in the next step, and
          without them that suggestion can only be right for the average animal.

          Optional because a range is not always known at planning time, and a
          calculator that refuses to work until it is would be worse than one
          that says what it did not check.
        */}
        <div>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <NumberInput
              label="Lightest subject"
              placeholder="optional"
              min={0}
              decimalScale={6}
              value={minBodyWeight}
              onChange={(value) => setFieldValue('minBodyWeight', value)}
              onBlur={scheduleOutputFeedback}
              w={160}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              to
            </Text>
            <NumberInput
              label="Heaviest subject"
              placeholder="optional"
              min={0}
              decimalScale={6}
              value={maxBodyWeight}
              onChange={(value) => setFieldValue('maxBodyWeight', value)}
              onBlur={scheduleOutputFeedback}
              w={160}
              {...inputBlue}
            />
            <Text pb="sm" size="sm">
              {avgBodyWeightUnit}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={6} className="no-print">
            * optional — with both ends given, the volume suggested in the next step is sized to
            stay above your {carrier.usesSyringe ? 'syringe' : 'pipette'} minimum for the lightest
            subject and inside the {carrierNoun} for the heaviest. Left blank, it is sized for the
            average subject alone and the dosing table cannot be built.
          </Text>
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

        <WasteBufferField
          wasteBufferPct={wasteBufferPct}
          plannedCount={totalDoses}
          setFieldValue={setFieldValue}
          scheduleOutputFeedback={scheduleOutputFeedback}
        />

      </Stack>

      <IssueList issues={issues} />
    </Paper>
  );
}
