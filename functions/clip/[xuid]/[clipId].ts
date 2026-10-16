import { isClipId, isXuid } from '../../../src/lib/validation';
import { applyPreview, fetchPreview, previewTags } from '../../_lib/preview';

/**
 * Adds the clip's link-preview tags to the app page, so chat apps unfurl a clip
 * link with its title and thumbnail (PLAN-v1.md §7). People get the same page and
 * the app boots as usual. Every failure path serves the page unchanged.
 */
export const onRequestGet: PagesFunction<Env, 'xuid' | 'clipId'> = async ({ request, env, params }) => {
  // The single-page app's root document; fetched explicitly rather than through the
  // not-found fallback, so the result never depends on how /clip/* is resolved.
  const page = await env.ASSETS.fetch(new URL('/', request.url));

  const xuid = String(params.xuid);
  const clipId = String(params.clipId);
  if (!page.ok || !isXuid(xuid) || !isClipId(clipId)) return page;

  const clip = await fetchPreview(env.API, xuid, clipId.toLowerCase(), request);
  if (!clip) return page;

  return applyPreview(page, previewTags(clip, request.url));
};
