import { forwardRef } from 'react';
import { Select } from '@mantine/core';
import { inputFieldColor } from '../theme';

const labSelectDefaults = {
  variant: 'filled',
  color: inputFieldColor,
};

/**
 * Mantine Select with Lab App defaults (filled accent). Pass any other Select props;
 * explicit props override defaults.
 */
const LabSelect = forwardRef(function LabSelect(props, ref) {
  return <Select ref={ref} {...labSelectDefaults} {...props} />;
});

LabSelect.displayName = 'LabSelect';

export default LabSelect;
