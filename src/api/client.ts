import type { ApiErrorCode, Clip, Game, GameAchievements, PlayerCareer, PlayerClips, PlayerGames, PlayerProfile, Screenshot } from './types';

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
  getAchievements(identifier: string, titleId: string): Promise<GameAchievements>;
  getGame(productId: string): Promise<Game>;
  getScreenshots(productId: string): Promise<{ screenshots: Screenshot[] }>;
}

export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): ApiClient {
  const base = baseUrl.replace(/\/$/, '');

  async function get<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(base + path, { headers: { Accept: 'application/json' } });
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
    getAchievements: (identifier, titleId) => get(`/api/v1/players/${seg(identifier)}/achievements/${seg(titleId)}`),
    getGame: (productId) => get(`/api/v1/games/${seg(productId)}`),
    getScreenshots: (productId) => get(`/api/v1/games/${seg(productId)}/screenshots`),
  };
}

export const api = createApiClient(import.meta.env.VITE_API_BASE_URL);
