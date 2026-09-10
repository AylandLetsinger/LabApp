import { createContext } from 'react';

/**
 * `{ scope, interacted }` for the page the remembered-input hooks write for.
 *
 * `scope` is the page's path. `interacted` is a ref that turns true on the
 * first keystroke, click or input inside the page; nothing is written before
 * then. Several pages fill a field in on their own when they mount — the
 * mealworm page copies its suggested load volume in — and without the gate,
 * opening a page and touching nothing would be remembered as "your entries".
 *
 * Null outside RememberedInputs, and the hooks then behave exactly like
 * useState and useForm — so a component used somewhere unwrapped simply
 * forgets, rather than writing into another page's entry.
 */
export const RememberContext = createContext(null);
