import { describe, expect, it, vi } from 'vitest';
import { onRequest } from './api/[[path]]';
import { refusalReason } from './_lib/guard';

const URL_ = 'https://xboxclips.io/api/v1/games/most-played';

const req = (headers: Record<string, string>, url = URL_) => new Request(url, { headers });

function run(request: Request, mode: string) {
  const env = { API_GUARD: mode, API: { fetch: vi.fn(async (r: Request) => Response.json({ seen: r.headers.get('X-Site-Guard') })) } };
  const ctx = { request, env } as unknown as Parameters<typeof onRequest>[0];
  return { response: onRequest(ctx) as Promise<Response>, env };
}

describe('refusalReason', () => {
  it('passes a same-origin request', () => {
    expect(refusalReason(req({ 'Sec-Fetch-Site': 'same-origin' }))).toBeNull();
  });

  it('passes a preview deployment calling its own origin', () => {
    const url = 'https://abc123.xbox-clips-ui.pages.dev/api/v1/games/most-played';
    expect(refusalReason(req({ 'Sec-Fetch-Site': 'same-origin' }, url))).toBeNull();
  });

  it('refuses cross-site, same-site and direct navigation', () => {
    expect(refusalReason(req({ 'Sec-Fetch-Site': 'cross-site' }))).toBe('sec-fetch-site:cross-site');
    expect(refusalReason(req({ 'Sec-Fetch-Site': 'same-site' }))).toBe('sec-fetch-site:same-site');
    expect(refusalReason(req({ 'Sec-Fetch-Site': 'none' }))).toBe('sec-fetch-site:none');
  });

  it('refuses a foreign Origin even when Sec-Fetch-Site claims same-origin', () => {
    expect(refusalReason(req({ Origin: 'https://example.com', 'Sec-Fetch-Site': 'same-origin' }))).toBe('origin');
  });

  it('falls back to the Referer without Sec-Fetch-Site', () => {
    expect(refusalReason(req({ Referer: 'https://xboxclips.io/player/TestPlayer' }))).toBeNull();
    expect(refusalReason(req({ Referer: 'https://example.com/' }))).toBe('referer');
    expect(refusalReason(req({ Referer: 'not a url' }))).toBe('referer');
  });

  it('refuses a request with no signal at all', () => {
    expect(refusalReason(req({}))).toBe('no-signal');
  });
});

describe('onRequest', () => {
  it('forwards a same-origin request unmarked, with the visitor IP', async () => {
    const request = req({ 'Sec-Fetch-Site': 'same-origin', 'CF-Connecting-IP': '203.0.113.7', 'X-Site-Guard': 'forged' });
    const { response, env } = run(request, 'enforce');
    expect(await (await response).json()).toEqual({ seen: null });
    const forwarded = env.API.fetch.mock.calls[0]![0];
    expect(forwarded.url).toBe(URL_);
    expect(forwarded.headers.get('CF-Connecting-IP')).toBe('203.0.113.7');
  });

  it('in report mode, forwards a cross-site request marked with the reason', async () => {
    const { response } = run(req({ 'Sec-Fetch-Site': 'cross-site' }), 'report');
    expect(await (await response).json()).toEqual({ seen: 'sec-fetch-site:cross-site' });
  });

  it('in enforce mode, refuses a cross-site request without calling the API', async () => {
    const { response, env } = run(req({}), 'enforce');
    const res = await response;
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: 'FORBIDDEN', status: 403 } });
    expect(env.API.fetch).not.toHaveBeenCalled();
  });
});
