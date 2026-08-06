import { Container, Text, Title } from '@mantine/core';
import { Navigate, useParams } from 'react-router-dom';
import IntraperitonealDosageForm from '../components/dosage/IntraperitonealDosageForm';
import MealwormDosageForm from '../components/dosage/MealwormDosageForm';
import { getDosageMethodLabel } from '../dosageDeliveryMethods';

/** Delivery methods that have a working calculator, and their intro copy. */
const IMPLEMENTED_METHODS = {
  'intraperitoneal-injection': {
    Form: IntraperitonealDosageForm,
    intro:
      'Works out dosage and preparation volumes for intraperitoneal injection. Blue fields are your inputs; grey fields are calculated.',
  },
  mealworm: {
    Form: MealwormDosageForm,
    intro:
      'Works out what to load into a mealworm for oral delivery. One worm per mouse, bounded by how much liquid the worm absorbs before it leaks.',
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
        Dosage Calculator
      </Title>
      {deliveryLabel ? (
        <Text mb="sm">Delivery method: {deliveryLabel}</Text>
      ) : (
        <Text c="dimmed" mb="sm">
          Choose a delivery method from the Dosage menu.
        </Text>
      )}

      {Form ? (
        <>
          <Text size="sm" c="dimmed" maw={640} className="no-print">
            {implemented.intro}
          </Text>
          <Form />
        </>
      ) : method ? (
        <Text c="dimmed">Dosage workflow and inputs for this delivery method will go here.</Text>
      ) : null}
    </Container>
  );
}
