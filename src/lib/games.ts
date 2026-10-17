import type { Game } from '../api/types';

/** Store images are huge (up to 3840 px); always ask for the width needed. */
export function storeImage(url: string | null, width: number): string | undefined {
  return url ? `${url}?w=${width}` : undefined;
}

export function storeImageSet(url: string | null, widths: number[]): string | undefined {
  return url ? widths.map((w) => `${url}?w=${w} ${w}w`).join(', ') : undefined;
}

const PLATFORM_LABELS: Record<string, string> = {
  XboxSeriesX: 'Xbox Series X|S',
  XboxOne: 'Xbox One',
  PC: 'PC',
  XCloud: 'Cloud',
  Handheld: 'Handheld',
};

export const platformLabels = (game: Game) => game.platforms.map((p) => PLATFORM_LABELS[p] ?? p);

/** An average from a handful of ratings misleads; show it only with enough behind it. */
export const MIN_RATINGS_SHOWN = 20;
export const showRating = (game: Game) => game.rating !== null && game.ratingCount >= MIN_RATINGS_SHOWN;

export const releaseYear = (game: Game) => (game.releaseDate ? new Date(game.releaseDate).getFullYear() : null);

export const gamePath = (productId: string) => `/game/${productId}`;
