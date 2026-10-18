/** The API's response shapes (xbox-clips-api PLAN-v1.md §5, §6). */

export type Reputation = 'good' | 'needs-work' | 'avoid';

export interface PlayerProfile {
  xuid: string;
  gamertag: string;
  gamerscore: number;
  gamerpicUrl: string | null;
  /** Optional: absent from responses cached before these fields were added. */
  bio?: string | null;
  location?: string | null;
  /** Years on the Xbox network (the profile's TenureLevel, read as years). */
  tenureYears?: number | null;
  reputation?: Reputation | null;
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

export interface CareerGame {
  titleId: string;
  name: string;
  imageUrl: string | null;
  gamerscore: number;
  totalGamerscore: number;
  percent: number;
  lastPlayed: string | null;
}

/** Career facts from the player's most recent games. */
export interface CareerStats {
  nowPlaying: CareerGame | null;
  biggestHaul: CareerGame | null;
  onTheBrink: CareerGame | null;
  gamesCounted: number;
  /** The player has more games than were read; the facts cover only the most recent. */
  limited: boolean;
}

export interface PlayerCareer {
  xuid: string;
  /** Null when the player's history is hidden. */
  stats: CareerStats | null;
}

/** Clip metadata without media or views, as used by link previews. */
/** A store screenshot of a game. `url` resizes by query string (`?w=1280`). */
export interface Screenshot {
  url: string;
  /** The store's description of the image, when it has one. */
  caption: string | null;
  width: number;
  height: number;
}

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
