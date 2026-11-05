/** Tells the API which requests the guard would refuse, while it only reports. */
export const GUARD_HEADER = 'X-Site-Guard';

/**
 * The same-origin check for the API proxy (the API's PLAN-v1.md §6). Browsers set
 * these headers themselves and page scripts cannot change them, so this stops
 * other sites from using their visitors' browsers to call the API. It does not
 * stop scripts, which can send any header.
 *
 * Returns null when the request may pass, otherwise the reason it would be
 * refused. Compares against the request's own origin, so production, the Pages
 * hostname and every preview deployment pass without configuration.
 */
export function refusalReason(request: Request): string | null {
  const own = new URL(request.url).origin;

  // Browsers don't send Origin on same-origin GETs; when present, it must be ours.
  const origin = request.headers.get('Origin');
  if (origin !== null && origin !== own) return 'origin';

  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null) return site === 'same-origin' ? null : `sec-fetch-site:${site}`;

  // Older browsers without Sec-Fetch-Site: fall back to the Referer.
  const referer = request.headers.get('Referer');
  if (referer === null) return 'no-signal';
  try {
    return new URL(referer).origin === own ? null : 'referer';
  } catch {
    return 'referer';
  }
}
