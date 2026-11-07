import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('createApiClient', () => {
  it('builds encoded, same-origin URLs', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL) => json(200, {}));
    const api = createApiClient(fetch);
    await api.getClips('Test Player', 100);
    await api.getClip('123', 'abc');
    expect(fetch.mock.calls.map((c) => String(c[0]))).toEqual([
      '/api/v1/players/Test%20Player/clips?limit=100',
      '/api/v1/clips/123/abc',
    ]);
  });

  it('turns the error envelope into an ApiError carrying the API message', async () => {
    const api = createApiClient(async () =>
      json(404, { error: { code: 'PLAYER_NOT_FOUND', message: 'No player with that gamertag or XUID was found.', status: 404 } }),
    );
    const err = await api.getPlayer('Nobody').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'PLAYER_NOT_FOUND', status: 404, message: 'No player with that gamertag or XUID was found.' });
  });

  it('reports network failures without a status', async () => {
    const api = createApiClient(async () => Promise.reject(new TypeError('offline')));
    await expect(api.getPlayer('x')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('copes with a non-JSON error body', async () => {
    const api = createApiClient(async () => new Response('Bad gateway', { status: 502 }));
    await expect(api.getPlayer('x')).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 502 });
  });
});

describe('the build header', () => {
  it('names the build on every call, and is left out without one', async () => {
    const fetch = vi.fn(async () => Response.json({ games: [] }));
    await createApiClient(fetch, '5824a52a1b4b').getMostPlayed();
    expect(new Headers((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers).get('X-App-Build')).toBe('5824a52a1b4b');
    await createApiClient(fetch, null).getMostPlayed();
    expect(new Headers((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].headers).has('X-App-Build')).toBe(false);
  });
});
