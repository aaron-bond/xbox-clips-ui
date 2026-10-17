import { QueryClient, queryOptions } from '@tanstack/react-query';
import { api, type ApiClient } from '../api/client';
import type { Clip, Game, PlayerClips } from '../api/types';

const MINUTE = 60_000;

/** A clip's data goes stale this long before its media URL expires (PLAN-v1.md §3). */
export const MEDIA_EXPIRY_MARGIN = 5 * MINUTE;

/**
 * Tuned for the shared upstream budget (PLAN-v1.md §2): never retry, never
 * refetch on focus or reconnect. Every request is one the visitor caused.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 10 * MINUTE,
      },
    },
  });
}

/** Milliseconds until the earliest media URL among these clips is too close to expiry. */
export function msUntilMediaStale(clips: Clip[], now = Date.now()): number {
  const expiries = clips.flatMap((c) => (c.media ? [Date.parse(c.media.expiresAt)] : []));
  if (expiries.length === 0) return 10 * MINUTE;
  return Math.max(0, Math.min(...expiries) - MEDIA_EXPIRY_MARGIN - now);
}

export const keys = {
  player: (identifier: string) => ['player', identifier.toLowerCase()] as const,
  clips: (identifier: string) => ['clips', identifier.toLowerCase()] as const,
  clip: (xuid: string, clipId: string) => ['clip', xuid, clipId.toLowerCase()] as const,
  mostPlayed: () => ['games', 'most-played'] as const,
  game: (productId: string) => ['game', productId.toUpperCase()] as const,
};

/** The shelf asks for the API's whole first page. */
export const SHELF_LIMIT = 100;

export const playerQuery = (identifier: string, client: ApiClient = api) =>
  queryOptions({ queryKey: keys.player(identifier), queryFn: () => client.getPlayer(identifier) });

export const clipsQuery = (identifier: string, client: ApiClient = api) =>
  queryOptions({
    queryKey: keys.clips(identifier),
    queryFn: () => client.getClips(identifier, SHELF_LIMIT),
    staleTime: (q) => (q.state.data ? msUntilMediaStale(q.state.data.clips) : 0),
  });

/**
 * One clip. When the visitor arrives from a shelf, the clip is seeded from that
 * cached list, so opening it costs no request while its URL is still fresh.
 */
export const clipQuery = (queryClient: QueryClient, xuid: string, clipId: string, client: ApiClient = api) =>
  queryOptions({
    queryKey: keys.clip(xuid, clipId),
    queryFn: () => client.getClip(xuid, clipId),
    staleTime: (q) => (q.state.data ? msUntilMediaStale([q.state.data]) : 0),
    initialData: () => findCachedClip(queryClient, xuid, clipId)?.clip,
    initialDataUpdatedAt: () => findCachedClip(queryClient, xuid, clipId)?.updatedAt,
  });

function findCachedClip(queryClient: QueryClient, xuid: string, clipId: string) {
  const id = clipId.toLowerCase();
  for (const [key, data] of queryClient.getQueriesData<PlayerClips>({ queryKey: ['clips'] })) {
    const clip = data?.clips.find((c) => c.xuid === xuid && c.clipId === id);
    if (clip) return { clip, updatedAt: queryClient.getQueryState(key)?.dataUpdatedAt };
  }
  return undefined;
}

/** The ranking changes slowly and the API caches it for hours. */
export const mostPlayedQuery = (client: ApiClient = api) =>
  queryOptions({ queryKey: keys.mostPlayed(), queryFn: () => client.getMostPlayed(), staleTime: 30 * MINUTE });

/**
 * One game. Opened from the front page, it is seeded from the cached ranking,
 * so it costs no request; a direct visit asks the API.
 */
export const gameQuery = (queryClient: QueryClient, productId: string, client: ApiClient = api) =>
  queryOptions({
    queryKey: keys.game(productId),
    queryFn: () => client.getGame(productId),
    staleTime: 30 * MINUTE,
    initialData: () => findCachedGame(queryClient, productId),
    initialDataUpdatedAt: () => queryClient.getQueryState(keys.mostPlayed())?.dataUpdatedAt,
  });

function findCachedGame(queryClient: QueryClient, productId: string): Game | undefined {
  const id = productId.toUpperCase();
  return queryClient.getQueryData<{ games: Game[] }>(keys.mostPlayed())?.games.find((g) => g.productId === id);
}
