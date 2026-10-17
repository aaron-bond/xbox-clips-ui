/** The API's response shapes (xbox-clips-api PLAN-v1.md §5, §6). */

export interface PlayerProfile {
  xuid: string;
  gamertag: string;
  gamerscore: number;
  gamerpicUrl: string | null;
}

export interface ClipMedia {
  url: string;
  /** The URL must not be used past this. */
  expiresAt: string;
}

export interface Clip {
  clipId: string;
  xuid: string;
  gameTitle: string;
  titleId: number | null;
  caption: string;
  durationSeconds: number;
  recordedAt: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  /** Estimate: Xbox deletes clips about 90 days after upload. */
  availableUntil: string;
  views: number;
  /** Null when the API is serving cached data and holds no live URL. */
  media: ClipMedia | null;
}

export interface PlayerClips {
  xuid: string;
  /** 'restricted' means capture privacy hides the clips; distinct from having none. */
  access: 'public' | 'restricted';
  total: number;
  clips: Clip[];
}

/** A game from the Xbox Store's most-played ranking. */
export interface Game {
  productId: string;
  rank: number;
  title: string;
  genres: string[];
  developer: string | null;
  publisher: string | null;
  releaseDate: string | null;
  rating: number | null;
  ratingCount: number;
  /** Store platform codes: XboxSeriesX, XboxOne, PC, XCloud, Handheld. */
  platforms: string[];
  description: string;
  /** Store image URLs; always request a size with `storeImage()`. */
  heroImageUrl: string | null;
  boxArtUrl: string | null;
}

/** Clip metadata without media or views, as used by link previews. */
export type ClipPreview = Omit<Clip, 'views' | 'media'>;

export type ApiErrorCode =
  | 'INVALID_IDENTIFIER'
  | 'NOT_FOUND'
  | 'PLAYER_NOT_FOUND'
  | 'CLIP_NOT_FOUND'
  | 'CLIP_EXPIRED'
  | 'GAME_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_RATE_LIMIT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';
