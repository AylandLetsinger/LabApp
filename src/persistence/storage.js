/**
 * Remembers what was last entered on each page, in this browser only.
 *
 * One localStorage entry per page:
 *
 *   thelabapp:inputs:/dosage/mealworm  →  { version, savedAt, values: { form, solutes, … } }
 *
 * Nothing here is sent anywhere. localStorage never leaves the browser, which
 * is what keeps the Support page's "nothing you type is sent anywhere" true.
 *
 * Every read and write is wrapped, because localStorage can throw: private
 * browsing, storage blocked by policy, a full quota. The fallback in every case
 * is how the app behaved before this existed — nothing remembered — so failing
 * quietly here is the right call, and is the one place in the app it is.
 */

/**
 * Bump this when the SHAPE of any remembered state changes — a field renamed,
 * an array that becomes an object. Every stored entry with an older version is
 * discarded rather than restored into a form that no longer expects it.
 *
 * Adding a field does not need a bump: form values are merged onto the
 * defaults, and solutes are rebuilt through makeSolute(), so a new field simply
 * takes its default.
 */
export const STORAGE_VERSION = 1;

const PREFIX = 'thelabapp:inputs:';

function storageKey(scope) {
  return PREFIX + scope;
}

/** The whole entry for a page, or undefined if there is none worth using. */
export function readEntry(scope) {
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return undefined;
    const entry = JSON.parse(raw);
    if (entry?.version !== STORAGE_VERSION) return undefined;
    if (!entry.values || typeof entry.values !== 'object') return undefined;
    if (Object.keys(entry.values).length === 0) return undefined;
    return entry;
  } catch {
    return undefined;
  }
}

/** One remembered value on a page, or undefined. */
export function readValue(scope, name) {
  return readEntry(scope)?.values[name];
}

/**
 * Store one value, or remove it when it matches the page's default.
 *
 * Removing defaults is what keeps "Start fresh", a Reset button, or typing a
 * value and deleting it again from leaving an entry behind — which would
 * otherwise announce "restored your last entries" over a blank form.
 *
 * A value identical to what is already stored is not rewritten, so simply
 * opening a page does not move its "last used" time.
 */
export function writeValue(scope, name, value, defaultValue) {
  try {
    const entry = readEntry(scope) ?? { version: STORAGE_VERSION, values: {} };
    const serialised = JSON.stringify(value);

    if (serialised === JSON.stringify(defaultValue)) {
      if (!(name in entry.values)) return;
      delete entry.values[name];
    } else {
      if (JSON.stringify(entry.values[name]) === serialised) return;
      entry.values[name] = value;
    }

    if (Object.keys(entry.values).length === 0) {
      window.localStorage.removeItem(storageKey(scope));
      return;
    }
    entry.savedAt = Date.now();
    window.localStorage.setItem(storageKey(scope), JSON.stringify(entry));
  } catch {
    // See the module comment: no storage means no memory, not an error.
  }
}

/** Forget everything remembered for a page. */
export function clearScope(scope) {
  try {
    window.localStorage.removeItem(storageKey(scope));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
