import { Container, Text, Title } from '@mantine/core';
import { Navigate, useParams } from 'react-router-dom';
import IntraperitonealDosageForm from '../components/dosage/IntraperitonealDosageForm';
import { getDosageMethodLabel } from '../dosageDeliveryMethods';

export default function Dosage() {
  const { method } = useParams();

  if (method && !getDosageMethodLabel(method)) {
    return <Navigate to="/dosage" replace />;
  }

  const deliveryLabel = method ? getDosageMethodLabel(method) : null;
  const isIpInjection = method === 'intraperitoneal-injection';

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

      {isIpInjection ? (
        <>
          <Text size="sm" c="dimmed" maw={640}>
            This calculator estimates dosage and preparation values for intraperitoneal injection. Blue
            fields are for your inputs; outputs can be added in a later step.
          </Text>
          <IntraperitonealDosageForm />
        </>
      ) : method ? (
        <Text c="dimmed">Dosage workflow and inputs for this delivery method will go here.</Text>
      ) : null}
    </Container>
  );
}
