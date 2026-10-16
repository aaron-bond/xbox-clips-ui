export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function clipTitle(clip: { caption: string; gameTitle: string }): string {
  return clip.caption || (clip.gameTitle ? `${clip.gameTitle} clip` : 'Xbox clip');
}

/** The share link is the clip page's own URL (PLAN-v1.md §3). */
export function clipPath(xuid: string, clipId: string): string {
  return `/clip/${xuid}/${clipId}`;
}
