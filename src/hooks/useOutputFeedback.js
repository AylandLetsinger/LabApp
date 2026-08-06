import { useCallback, useEffect, useRef, useState } from 'react';

/** Minimum time to show "updating" before the check (the math itself is instant). */
const OUTPUT_LOADING_MS = 320;
const OUTPUT_OK_MS = 2600;

/**
 * Transient "updating -> updated" state for output panels, shared by every
 * calculator so the timers are only written once.
 *
 * @returns {[ 'idle' | 'loading' | 'ok', () => void ]}
 */
export default function useOutputFeedback() {
  const [state, setState] = useState('idle');
  const timers = useRef({ load: null, ok: null });

  const schedule = useCallback(() => {
    if (timers.current.load) clearTimeout(timers.current.load);
    if (timers.current.ok) clearTimeout(timers.current.ok);
    setState('loading');
    timers.current.load = window.setTimeout(() => {
      setState('ok');
      timers.current.load = null;
      timers.current.ok = window.setTimeout(() => {
        setState('idle');
        timers.current.ok = null;
      }, OUTPUT_OK_MS);
    }, OUTPUT_LOADING_MS);
  }, []);

  useEffect(
    () => () => {
      if (timers.current.load) clearTimeout(timers.current.load);
      if (timers.current.ok) clearTimeout(timers.current.ok);
    },
    [],
  );

  return [state, schedule];
}
