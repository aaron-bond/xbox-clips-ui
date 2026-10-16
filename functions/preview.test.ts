import { describe, expect, it, vi } from 'vitest';
import { onRequestGet } from './clip/[xuid]/[clipId]';
import { applyPreview, previewTags } from './_lib/preview';

const XUID = '2533274900000001';
const CLIP_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const PAGE = `<!doctype html><html><head><title>Xbox Clips</title>
<meta name="description" content="generic" />
<meta property="og:title" content="Xbox Clips" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary" />
</head><body><div id="root"></div></body></html>`;

const preview = {
  clipId: CLIP_ID,
  xuid: XUID,
  gameTitle: 'Example Game',
  titleId: 1,
  caption: 'Big <win> & "more"',
  durationSeconds: 29,
  recordedAt: '2026-10-01T18:19:00Z',
  publishedAt: '2026-10-01T18:20:30Z',
  thumbnailUrl: 'https://cdn.test/thumb.png',
  availableUntil: '2026-12-30T18:20:30Z',
};

function run(path: string, api: (req: Request) => Promise<Response>, headers: Record<string, string> = {}) {
  const [, , xuid, clipId] = path.split('/');
  const env = {
    ASSETS: { fetch: vi.fn(async () => new Response(PAGE, { headers: { 'Content-Type': 'text/html', ETag: '"abc"' } })) },
    API: { fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(new Request(input, init))) },
  };
  const request = new Request(`https://xboxclips.io${path}`, { headers });
  const ctx = { request, env, params: { xuid, clipId } } as unknown as Parameters<typeof onRequestGet>[0];
  return { response: onRequestGet(ctx) as Promise<Response>, env };
}

describe('applyPreview', () => {
  it('replaces generic tags with escaped clip tags', async () => {
    const html = await applyPreview(new Response(PAGE), previewTags(preview, 'https://xboxclips.io/clip/x/y')).text();
    expect(html).toContain('<title>Big &lt;win&gt; &amp; "more"</title>');
    expect(html).toContain('<meta property="og:title" content="Big &#60;win&#62; &#38; &#34;more&#34;" />');
    expect(html).toContain('<meta property="og:image" content="https://cdn.test/thumb.png" />');
    expect(html).toContain('<meta property="og:type" content="video.other" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).not.toContain('content="website"');
    expect(html).not.toContain('content="generic"');
    expect(html.match(/og:title/g)).toHaveLength(1);
  });
});

describe('onRequestGet', () => {
  it('serves the page with clip tags, asking the API over the binding with the visitor IP', async () => {
    const { response, env } = run(`/clip/${XUID}/${CLIP_ID}`, async () => Response.json(preview), {
      'CF-Connecting-IP': '203.0.113.7',
    });
    const res = await response;
    expect(res.status).toBe(200);
    expect(res.headers.get('ETag')).toBeNull();
    expect(await res.text()).toContain('og:image');
    const apiRequest = new Request(...(env.API.fetch.mock.calls[0] as [RequestInfo, RequestInit]));
    expect(new URL(apiRequest.url).pathname).toBe(`/api/v1/clips/${XUID}/${CLIP_ID}/preview`);
    expect(apiRequest.headers.get('CF-Connecting-IP')).toBe('203.0.113.7');
  });

  it('serves the page unchanged when the API fails or errors', async () => {
    for (const api of [async () => new Response('{}', { status: 404 }), async () => Promise.reject(new Error('down'))]) {
      const html = await (await run(`/clip/${XUID}/${CLIP_ID}`, api).response).text();
      expect(html).toContain('content="website"');
    }
  });

  it('does not call the API for malformed params', async () => {
    const { response, env } = run(`/clip/${XUID}/not-a-clip`, async () => Response.json(preview));
    expect(await (await response).text()).toContain('content="website"');
    expect(env.API.fetch).not.toHaveBeenCalled();
  });
});
