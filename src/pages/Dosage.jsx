import { Container, Text, Title } from '@mantine/core';
import { Navigate, useParams } from 'react-router-dom';
import LiquidDoseForm from '../components/dosage/LiquidDoseForm';
import CarrierDosageForm from '../components/dosage/CarrierDosageForm';
import DirectApplicationForm from '../components/dosage/DirectApplicationForm';
import { CARRIERS } from '../dosage/carriers';
import { LIQUID_ROUTES } from '../dosage/liquidRoutes';
import { getDosageMethodLabel } from '../dosageDeliveryMethods';

/** Delivery methods that have a working calculator, and their intro copy. */
const IMPLEMENTED_METHODS = {
  'direct-application': {
    Form: DirectApplicationForm,
    intro:
      'Works out what to add to a well or a bath to reach a target concentration, and how much solvent goes in with it. No animal, so no mg/kg — the limit here is the solvent, and it is yours to set.',
  },
  'intraperitoneal-injection': {
    Form: LiquidDoseForm,
    props: { route: LIQUID_ROUTES['intraperitoneal-injection'] },
    intro:
      'Works out dosage and preparation volumes for intraperitoneal injection. Blue fields are your inputs; grey fields are calculated.',
  },
  'subcutaneous-injection': {
    Form: LiquidDoseForm,
    props: { route: LIQUID_ROUTES['subcutaneous-injection'] },
    intro:
      'Works out dosage and preparation volumes for subcutaneous injection, including how much goes into each site when the dose is split. This app holds no published subcutaneous solvent-tolerability figures, so no solvent warnings appear here — Step 2 says so rather than leaving you to infer it from silence.',
  },
  'oral-gavage': {
    Form: LiquidDoseForm,
    props: { route: LIQUID_ROUTES['oral-gavage'] },
    intro:
      'Works out dosage and preparation volumes for oral gavage. Solvent tolerability is judged against published ORAL figures, never intraperitoneal ones. Gavage is often a suspension rather than a solution — methylcellulose and CMC are in the solvent list, and for those the solubility box is meant to stay empty.',
  },
  mealworm: {
    Form: CarrierDosageForm,
    props: { carrier: CARRIERS.mealworm },
    intro:
      'Works out what to load into a mealworm for oral delivery. One worm per mouse, bounded by how much liquid the worm absorbs before it leaks.',
  },
  solid: {
    Form: CarrierDosageForm,
    props: { carrier: CARRIERS.solid },
    intro:
      'Works out what to load into an edible solid — peanut butter, gelatin, jelly, cookie dough. No syringe, so the pipette sets the smallest dose, and the ceiling is whatever your lab has decided a portion carries.',
  },
};

export default function Dosage() {
  const { method } = useParams();

  if (method && !getDosageMethodLabel(method)) {
    return <Navigate to="/dosage" replace />;
  }

  const deliveryLabel = method ? getDosageMethodLabel(method) : null;
  const implemented = method ? IMPLEMENTED_METHODS[method] : undefined;
  const Form = implemented?.Form;

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="md">
        {deliveryLabel ? `Dosage Calculator — ${deliveryLabel}` : 'Dosage Calculator'}
      </Title>
      {!deliveryLabel && (
        <Text c="dimmed" mb="sm">
          Choose a delivery method from the Dosage menu.
        </Text>
      )}

      {Form ? (
        <Form {...(implemented.props ?? {})} />
      ) : method ? (
        <Text c="dimmed">Dosage workflow and inputs for this delivery method will go here.</Text>
      ) : null}
    </Container>
  );
}
