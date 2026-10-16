import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('createApiClient', () => {
  it('builds encoded URLs against the base', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL) => json(200, {}));
    const api = createApiClient('https://api.test/', fetch);
    await api.getClips('Major Nelson', 100);
    await api.getClip('123', 'abc');
    expect(fetch.mock.calls.map((c) => String(c[0]))).toEqual([
      'https://api.test/api/v1/players/Major%20Nelson/clips?limit=100',
      'https://api.test/api/v1/clips/123/abc',
    ]);
  });

  it('turns the error envelope into an ApiError carrying the API message', async () => {
    const api = createApiClient('https://api.test', async () =>
      json(404, { error: { code: 'PLAYER_NOT_FOUND', message: 'No player with that gamertag or XUID was found.', status: 404 } }),
    );
    const err = await api.getPlayer('Nobody').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'PLAYER_NOT_FOUND', status: 404, message: 'No player with that gamertag or XUID was found.' });
  });

  it('reports network failures without a status', async () => {
    const api = createApiClient('https://api.test', async () => Promise.reject(new TypeError('offline')));
    await expect(api.getPlayer('x')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('copes with a non-JSON error body', async () => {
    const api = createApiClient('https://api.test', async () => new Response('Bad gateway', { status: 502 }));
    await expect(api.getPlayer('x')).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 502 });
  });
});
