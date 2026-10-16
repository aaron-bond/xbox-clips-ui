import { describe, expect, it } from 'vitest';
import { makeClip } from '../test/helpers';
import { MEDIA_EXPIRY_MARGIN, msUntilMediaStale } from './queries';

describe('msUntilMediaStale', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  const expiring = (iso: string) => makeClip({ media: { url: 'u', expiresAt: iso } });

  it('goes stale the margin before the earliest URL expires', () => {
    const ms = msUntilMediaStale([expiring('2026-10-16T13:00:00Z'), expiring('2026-10-16T12:30:00Z')], now);
    expect(ms).toBe(30 * 60_000 - MEDIA_EXPIRY_MARGIN);
  });

  it('is immediately stale inside the margin, never negative', () => {
    expect(msUntilMediaStale([expiring('2026-10-16T12:02:00Z')], now)).toBe(0);
  });

  it('uses a default when no clip has media', () => {
    expect(msUntilMediaStale([makeClip({ media: null })], now)).toBe(10 * 60_000);
  });
});
