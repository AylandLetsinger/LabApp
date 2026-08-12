/**
 * Where the Support page points.
 *
 * Both live here so changing a handle or a platform is one edit, and so no
 * component hard-codes a personal account.
 */

/** The lab this was written in and for. */
export const LAB_WEBSITE = 'https://sites.edb.utexas.edu/tpaml/';

/**
 * Where a contribution goes, or null for none.
 *
 * Ko-fi rather than a personal Venmo, and the reason is worth keeping: a Venmo
 * handle on a public page carries a real legal name, and Venmo's profile and
 * transaction visibility has historically defaulted to public — meaning who
 * paid, and what they wrote, can be visible to anyone who looks. A project
 * account under a display name is the right shape for a page strangers reach.
 *
 * `embedSrc` is Ko-fi's own widget. It is the one third-party thing this site
 * loads, it appears on the Support page and nowhere else, and the page says so
 * — the claim of no tracking is only worth making while it is true.
 */
export const SUPPORT_LINK = {
  url: 'https://ko-fi.com/thelabapp',
  label: 'ko-fi.com/thelabapp',
  embedSrc: 'https://ko-fi.com/thelabapp/?hidefeed=true&widget=true&embed=true&preview=true',
};
