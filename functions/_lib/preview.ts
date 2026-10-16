import type { ClipPreview } from '../../src/api/types';

/** How long the function waits for preview metadata before serving the page unchanged. */
export const PREVIEW_TIMEOUT_MS = 1500;

export interface PreviewTags {
  title: string;
  description: string;
  image: string | null;
  url: string;
}

export function previewTags(clip: ClipPreview, pageUrl: string): PreviewTags {
  const game = clip.gameTitle || 'Xbox';
  return {
    title: clip.caption || `${game} clip`,
    description: `A ${clip.durationSeconds}-second clip from ${game}.`,
    image: clip.thumbnailUrl,
    url: pageUrl,
  };
}

/**
 * Asks the API for the clip's cached metadata over the service binding. Any
 * failure, including a timeout, returns null: a missing preview is acceptable,
 * a broken clip page is not (PLAN-v1.md §3).
 */
export async function fetchPreview(api: Fetcher, xuid: string, clipId: string, request: Request): Promise<ClipPreview | null> {
  const headers = new Headers({ Accept: 'application/json' });
  // Lets the API's per-IP limit see the visitor rather than this function.
  // TODO(Q1): confirm the API receives this over a service binding.
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) headers.set('CF-Connecting-IP', ip);
  try {
    // The hostname is arbitrary: a service binding routes by binding, not by DNS.
    const res = await api.fetch(`https://api.internal/api/v1/clips/${xuid}/${clipId}/preview`, {
      headers,
      signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as ClipPreview;
  } catch {
    return null;
  }
}

const escapeAttr = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * Replaces the page's generic preview tags with the clip's. Existing og:* and
 * twitter:* tags are removed, the <title> is replaced, and the clip's tags are
 * appended to <head>.
 */
export function applyPreview(page: Response, tags: PreviewTags): Response {
  const meta: [string, string, string][] = [
    ['property', 'og:site_name', 'Xbox Clips'],
    ['property', 'og:type', 'video.other'],
    ['property', 'og:title', tags.title],
    ['property', 'og:description', tags.description],
    ['property', 'og:url', tags.url],
    ...(tags.image ? ([['property', 'og:image', tags.image]] as [string, string, string][]) : []),
    ['name', 'twitter:card', tags.image ? 'summary_large_image' : 'summary'],
    ['name', 'description', tags.description],
  ];
  const html = meta.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`).join('');

  const transformed = new HTMLRewriter()
    .on('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]', {
      element: (el) => void el.remove(),
    })
    .on('title', {
      element: (el) => void el.setInnerContent(tags.title),
    })
    .on('head', {
      element: (el) => void el.append(html, { html: true }),
    })
    .transform(page);

  const res = new Response(transformed.body, transformed);
  // The body differs from the static file, so its validator no longer applies.
  res.headers.delete('ETag');
  return res;
}
