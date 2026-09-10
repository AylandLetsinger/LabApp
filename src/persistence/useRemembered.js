import { useContext, useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import { RememberContext } from './RememberContext';
import { readValue, writeValue } from './storage';

/**
 * Drop-in replacements for useState and useForm that remember the last value
 * on this page, in this browser.
 *
 * `name` identifies the value within the page — 'form', 'solutes' — and must be
 * unique on it. The page itself comes from RememberedInputs, so the same form
 * used by three routes (IP, SC, gavage) keeps three separate memories.
 *
 * Restored values are shape-checked before use rather than trusted: a stored
 * value that no longer fits the form is dropped in favour of the default. The
 * last line of defence is RememberedInputs' error boundary, which clears a
 * page's memory if restoring it makes the page crash.
 */

function resolve(initial) {
  return typeof initial === 'function' ? initial() : initial;
}

/** Arrays restore into arrays, objects into objects, strings into strings. */
function sameKind(stored, fallback) {
  if (Array.isArray(stored) || Array.isArray(fallback)) {
    return Array.isArray(stored) && Array.isArray(fallback);
  }
  return typeof stored === typeof fallback;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Restore only the fields the defaults still declare, and only when the stored
 * value is the same kind as the default. An empty string is accepted either
 * way, because a cleared NumberInput holds '' where its default held a number.
 * A field added since the last visit keeps its default.
 */
function mergeKnownFields(defaults, stored) {
  if (!isPlainObject(stored)) return defaults;
  const merged = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (!(key in stored)) continue;
    const restored = stored[key];
    const fallback = defaults[key];
    if (restored === '' || fallback === '' || fallback === null || sameKind(restored, fallback)) {
      merged[key] = restored;
    }
  }
  return merged;
}

/**
 * Like useState, remembered.
 *
 * A plain-object value is merged onto its default field by field. Anything
 * else needs `normalize`, which rebuilds a restored value into its current
 * shape and returns undefined to reject it. Solutes pass it through makeSolute(), so a field
 * added to solutes after someone's last visit arrives with its default.
 */
export function useRememberedState(name, initial, { normalize } = {}) {
  const memory = useContext(RememberContext);
  const scope = memory?.scope;
  const [defaultValue] = useState(() => resolve(initial));

  const [value, setValue] = useState(() => {
    if (!scope) return defaultValue;
    const stored = readValue(scope, name);
    if (stored === undefined) return defaultValue;
    if (normalize) return normalize(stored) ?? defaultValue;
    if (isPlainObject(defaultValue)) return mergeKnownFields(defaultValue, stored);
    return sameKind(stored, defaultValue) ? stored : defaultValue;
  });

  useEffect(() => {
    if (scope && memory.interacted.current) writeValue(scope, name, value, defaultValue);
  }, [memory, scope, name, value, defaultValue]);

  return [value, setValue];
}

/**
 * Like Mantine's useForm, remembered. Fields are restored through
 * mergeKnownFields, so only ones the form still declares come back.
 */
export function useRememberedForm(name, config) {
  const memory = useContext(RememberContext);
  const scope = memory?.scope;
  const [defaults] = useState(config.initialValues);

  const [initialValues] = useState(() =>
    scope ? mergeKnownFields(defaults, readValue(scope, name)) : defaults,
  );

  const form = useForm({ ...config, initialValues });

  useEffect(() => {
    if (scope && memory.interacted.current) writeValue(scope, name, form.values, defaults);
  }, [memory, scope, name, form.values, defaults]);

  return form;
}

/**
 * Whether this page mounted with a remembered value for `name`.
 *
 * For the rare effect that writes into a form on mount. The mealworm and solid
 * pages copy a suggested load volume into their field whenever the suggestion
 * changes; on a restored visit that would overwrite a volume the person had
 * deliberately typed over the suggestion, silently, while the notice above
 * tells them these are their last entries.
 */
export function useWasRestored(name) {
  const scope = useContext(RememberContext)?.scope;
  const [restored] = useState(() => (scope ? readValue(scope, name) !== undefined : false));
  return restored;
}

/**
 * A `normalize` for a list of plain objects: each item is merged onto
 * `itemDefaults` the way form fields are. An empty or malformed list is
 * rejected and the page falls back to its default.
 */
export function listOf(itemDefaults) {
  return (stored) => {
    if (!Array.isArray(stored) || stored.length === 0) return undefined;
    if (!stored.every(isPlainObject)) return undefined;
    return stored.map((item) => mergeKnownFields(itemDefaults, item));
  };
}
