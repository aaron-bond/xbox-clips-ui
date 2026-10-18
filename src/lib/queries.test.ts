import { describe, expect, it } from 'vitest';
import { makeClip } from '../test/helpers';
import { MEDIA_EXPIRY_MARGIN, msUntilMediaStale, PLAYER_DATA_STALE } from './queries';

describe('msUntilMediaStale', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  const expiring = (iso: string) => makeClip({ media: { url: 'u', expiresAt: iso } });

  it('stays fresh for the player-data window while URLs have longer left', () => {
    expect(msUntilMediaStale([expiring('2026-10-16T13:00:00Z'), expiring('2026-10-16T12:30:00Z')], now)).toBe(PLAYER_DATA_STALE);
  });

  it('goes stale the margin before the earliest URL expires, when that is sooner', () => {
    const ms = msUntilMediaStale([expiring('2026-10-16T13:00:00Z'), expiring('2026-10-16T12:08:00Z')], now);
    expect(ms).toBe(8 * 60_000 - MEDIA_EXPIRY_MARGIN);
  });

  it('is immediately stale inside the margin, never negative', () => {
    expect(msUntilMediaStale([expiring('2026-10-16T12:02:00Z')], now)).toBe(0);
  });

  it('uses the player-data window when no clip has media', () => {
    expect(msUntilMediaStale([makeClip({ media: null })], now)).toBe(PLAYER_DATA_STALE);
  });
});
