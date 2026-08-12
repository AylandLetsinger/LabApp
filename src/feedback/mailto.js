/**
 * Getting a note from a user to a maintainer, on a site with no server.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT
 * --------------------------------
 * This builds a `mailto:` link. Pressing it hands the message to whatever mail
 * client the reader's device has registered and opens it, prefilled. It does
 * NOT send anything: the reader still has to press send in their own client,
 * and if they abandon it there, nobody hears about it.
 *
 * That is a real limitation and it is chosen deliberately over the
 * alternatives, which are worse for this app:
 *
 *   A FORM SERVICE (Formspree, Web3Forms and the like) would post directly and
 *   capture everything, including notes people abandon. It needs an account,
 *   and a key in a public repository. It is the right upgrade the moment the
 *   volume of notes justifies it — nothing here has to change but this file.
 *
 *   A BACKEND would be the same trade with more work and a bill.
 *
 * The address lives here rather than in a component so there is one place to
 * change it, and so no page can quietly send to a different one.
 */

/** Where notes go. */
export const FEEDBACK_EMAIL = 'AylandLetsinger@gmail.com';

/** Every subject starts this way, so the inbox can filter on it. */
export const SUBJECT_PREFIX = 'TheLabApp';

/**
 * The page a note came from, in a form worth reading in a subject line.
 *
 * A note saying "the volume is wrong" is close to useless without it, and the
 * reader should not have to remember to say where they were.
 */
export function pageLabel(pathname) {
  if (!pathname || pathname === '/') return 'home';
  return pathname.replace(/^\//, '').replace(/\/$/, '');
}

/**
 * A mailto URL for a note.
 *
 * Everything is encoded, including newlines, because an unencoded line break
 * truncates the body in several mail clients.
 *
 * @param {object} p
 * @param {string} [p.pathname] Where the reader was.
 * @param {string} [p.name]
 * @param {string} [p.email] Their address, for a reply.
 * @param {string} p.message
 * @returns {string}
 */
export function noteMailtoUrl({ pathname, name, email, message }) {
  const where = pageLabel(pathname);
  const subject = `${SUBJECT_PREFIX} - ${where}`;

  const lines = [];
  if (message) lines.push(message.trim(), '');
  lines.push('---');
  lines.push(`Page: ${where}`);
  if (name?.trim()) lines.push(`From: ${name.trim()}`);
  if (email?.trim()) lines.push(`Reply to: ${email.trim()}`);
  lines.push(`Sent: ${new Date().toISOString()}`);

  return (
    `mailto:${FEEDBACK_EMAIL}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(lines.join('\n'))}`
  );
}
