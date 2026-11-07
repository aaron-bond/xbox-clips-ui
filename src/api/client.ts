import { currentBuild } from '../lib/build';
import type { ApiErrorCode, Clip, Game, GameAchievements, NearestCompletion, PlayerCareer, PlayerClips, PlayerGames, PlayerMythics, PlayerProfile, Screenshot } from './types';

/**
 * A failure response from the API, or a network failure. `message` is the API's
 * fixed, user-safe text for the code, so it can be shown as is.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode | 'NETWORK_ERROR',
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClient {
  getPlayer(identifier: string): Promise<PlayerProfile>;
  getClips(identifier: string, limit: number): Promise<PlayerClips>;
  getClip(xuid: string, clipId: string): Promise<Clip>;
  getMostPlayed(): Promise<{ games: Game[] }>;
  getCareer(identifier: string): Promise<PlayerCareer>;
  getGames(identifier: string): Promise<PlayerGames>;
  getMythics(identifier: string): Promise<PlayerMythics>;
  getNearestCompletion(identifier: string): Promise<NearestCompletion>;
  getAchievements(identifier: string, titleId: string): Promise<GameAchievements>;
  getGame(productId: string): Promise<Game>;
  getScreenshots(productId: string): Promise<{ screenshots: Screenshot[] }>;
}

/**
 * Paths are relative: the site serves the API on its own origin at /api/*
 * (functions/api/[[path]].ts). Each call names the build that made it, so the
 * API's logs show which build a request came from (PLAN-v1.md §15).
 */
export function createApiClient(fetchImpl: typeof fetch = (...a) => fetch(...a), build: string | null = currentBuild()): ApiClient {
  const headers: Record<string, string> = { Accept: 'application/json', ...(build ? { 'X-App-Build': build } : {}) };
  async function get<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(path, { headers });
    } catch {
      throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.', 0);
    }
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = (body as { error?: { code?: ApiErrorCode; message?: string } } | null)?.error;
      throw new ApiError(err?.code ?? 'INTERNAL_ERROR', err?.message ?? 'Something went wrong.', res.status);
    }
    return body as T;
  }

  const seg = encodeURIComponent;
  return {
    getPlayer: (identifier) => get(`/api/v1/players/${seg(identifier)}`),
    getClips: (identifier, limit) => get(`/api/v1/players/${seg(identifier)}/clips?limit=${limit}`),
    getClip: (xuid, clipId) => get(`/api/v1/clips/${seg(xuid)}/${seg(clipId)}`),
    getMostPlayed: () => get('/api/v1/games/most-played'),
    getCareer: (identifier) => get(`/api/v1/players/${seg(identifier)}/career`),
    getGames: (identifier) => get(`/api/v1/players/${seg(identifier)}/games`),
    getMythics: (identifier) => get(`/api/v1/players/${seg(identifier)}/mythics`),
    getNearestCompletion: (identifier) => get(`/api/v1/players/${seg(identifier)}/nearest-completion`),
    getAchievements: (identifier, titleId) => get(`/api/v1/players/${seg(identifier)}/achievements/${seg(titleId)}`),
    getGame: (productId) => get(`/api/v1/games/${seg(productId)}`),
    getScreenshots: (productId) => get(`/api/v1/games/${seg(productId)}/screenshots`),
  };
}

export const api = createApiClient();
