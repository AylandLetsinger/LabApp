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
 * A PERSONAL VENMO IS DELIBERATELY NOT THE DEFAULT. A Venmo handle on a public
 * page shows a real legal name, and Venmo's profile and transaction visibility
 * has historically defaulted to public — meaning who paid, and what they
 * wrote, can be visible to anyone who looks. That is a poor fit for a page any
 * stranger can reach, and a worse one for an account also used for rent.
 *
 * Ko-fi and Buy Me a Coffee both exist for exactly this, keep the recipient's
 * identity to a display name, and take a project rather than a person. Set one
 * up and put it here.
 *
 * Until then this is null, and the page simply does not ask for money.
 */
export const SUPPORT_LINK = null;

/*
 * When ready, replace the line above with something like:
 *
 *   export const SUPPORT_LINK = {
 *     url: 'https://ko-fi.com/thelabapp',
 *     label: 'ko-fi.com/thelabapp',
 *   };
 */
