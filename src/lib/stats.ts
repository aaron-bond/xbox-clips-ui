import type { Clip, Reputation } from '../api/types';

const DAY = 86_400_000;

/** "Today", "Yesterday", "12 days ago". Clips are never older than about 90 days. */
export function daysAgo(iso: string, now = Date.now()): string {
  const days = Math.floor((now - Date.parse(iso)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/** Total duration of a reel: "1:58", or "1:02:05" past an hour. */
export function reelLength(clips: Clip[]): string {
  const total = Math.round(clips.reduce((sum, c) => sum + c.durationSeconds, 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** The most recent clip's recording date, for "last clip". */
export function latestRecordedAt(clips: Clip[]): string | null {
  return clips.reduce<string | null>((latest, c) => (!latest || c.recordedAt > latest ? c.recordedAt : latest), null);
}

/** Within this window, a clip's coming deletion is worth telling the visitor about. */
export const EXPIRY_NOTICE_WINDOW = 30 * DAY;

/** The clip that leaves Xbox soonest, if that is within the notice window. */
export function nextToExpire(clips: Clip[], now = Date.now()): Clip | null {
  const soonest = [...clips].sort((a, b) => Date.parse(a.availableUntil) - Date.parse(b.availableUntil))[0];
  if (!soonest) return null;
  const left = Date.parse(soonest.availableUntil) - now;
  return left > 0 && left <= EXPIRY_NOTICE_WINDOW ? soonest : null;
}

/** Real view counts are usually zero; a zero is noise, so it is not shown. */
export const viewsWorthShowing = (clip: Clip) => clip.views > 0;

const REPUTATION_LABELS: Record<Reputation, string> = { good: 'Good player', 'needs-work': 'Needs work', avoid: 'Avoid me' };

/** Xbox's own names for its reputation tiers. */
export const reputationLabel = (r: Reputation | null | undefined) => (r ? REPUTATION_LABELS[r] : null);

/** "22 years on Xbox", "1 year on Xbox"; null when unknown. */
export function tenureLabel(years: number | null | undefined): string | null {
  if (years === null || years === undefined || years < 1) return null;
  return `${years} ${years === 1 ? 'year' : 'years'} on Xbox`;
}

/**
 * The game with the most clips in this reel, with its latest clip (whose
 * thumbnail can stand in for game art). Ties go to the game clipped most
 * recently, and the others it tied with are named.
 */
export function mostClipped(clips: Clip[]): { game: string; count: number; tiedWith: string[]; latest: Clip } | null {
  const byGame = new Map<string, { count: number; latest: Clip }>();
  for (const c of clips) {
    if (!c.gameTitle) continue;
    const entry = byGame.get(c.gameTitle);
    if (!entry) byGame.set(c.gameTitle, { count: 1, latest: c });
    else {
      entry.count++;
      if (c.recordedAt > entry.latest.recordedAt) entry.latest = c;
    }
  }
  const ranked = [...byGame.entries()].sort(
    (a, b) => b[1].count - a[1].count || b[1].latest.recordedAt.localeCompare(a[1].latest.recordedAt),
  );
  const top = ranked[0];
  if (!top) return null;
  return {
    game: top[0],
    count: top[1].count,
    tiedWith: ranked.slice(1).filter((r) => r[1].count === top[1].count).map((r) => r[0]),
    latest: top[1].latest,
  };
}
