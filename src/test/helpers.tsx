import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import type { Clip, Game, PlayerClips, PlayerProfile } from '../api/types';
import { createQueryClient } from '../lib/queries';
import { routes } from '../routes';

export const XUID = '2533274900000001';
export const CLIP_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const HOUR = 3_600_000;

const DAY = 86_400_000;
/** An ISO timestamp `days` from now (negative for the past), so date-based stats don't drift. */
export const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

export function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    clipId: CLIP_ID,
    xuid: XUID,
    gameTitle: 'Example Game',
    titleId: 1,
    caption: '',
    durationSeconds: 30,
    recordedAt: daysFromNow(-3),
    publishedAt: daysFromNow(-3),
    thumbnailUrl: 'https://cdn.test/thumb.png',
    availableUntil: daysFromNow(87),
    views: 3,
    media: { url: 'https://cdn.test/clip-1.mp4', expiresAt: new Date(Date.now() + HOUR).toISOString() },
    ...overrides,
  };
}

export function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    productId: '9N4PT8HGCDHQ',
    rank: 1,
    title: 'Example Game',
    genres: ['Shooter', 'Action & adventure'],
    developer: 'Example Studio',
    publisher: 'Example Publisher',
    releaseDate: '2026-10-06T15:00:00Z',
    rating: 4.5,
    ratingCount: 100,
    platforms: ['XboxSeriesX', 'PC'],
    description: 'An example game.',
    heroImageUrl: 'https://store-images.test/hero',
    boxArtUrl: 'https://store-images.test/box',
    ...overrides,
  };
}

export const profile: PlayerProfile = { xuid: XUID, gamertag: 'TestPlayer', gamerscore: 1234, gamerpicUrl: null };

export function clipsOf(clips: Clip[], access: PlayerClips['access'] = 'public'): PlayerClips {
  return { xuid: XUID, access, total: clips.length, clips };
}

type Handler = (path: string) => { status?: number; body: unknown };

/**
 * A fake API keyed by path prefix (longest match wins). Unmatched paths answer
 * 404, which components that are secondary (the ticker) treat as "leave out".
 */
export function stubRoutes(routes: Record<string, { status?: number; body: unknown } | (() => { status?: number; body: unknown })>) {
  const prefixes = Object.keys(routes).sort((a, b) => b.length - a.length);
  return stubApi((path) => {
    const hit = prefixes.find((p) => path.startsWith(p));
    if (!hit) return apiError('NOT_FOUND', 404);
    const r = routes[hit]!;
    return typeof r === 'function' ? r() : r;
  });
}

/** Stubs fetch with a router over API paths, recording every path requested. */
export function stubApi(handler: Handler) {
  const paths: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const path = url.pathname + url.search;
      paths.push(path);
      const { status = 200, body } = handler(path);
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    }),
  );
  return paths;
}

export function apiError(code: string, status: number, message = `${code} message`) {
  return { status, body: { error: { code, message, status } } };
}

export function renderAt(path: string) {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, router, queryClient };
}
