import { describe, expect, it } from 'vitest';
import { daysFromNow, makeClip } from '../test/helpers';
import { daysAgo, latestRecordedAt, nextToExpire, reelLength, viewsWorthShowing } from './stats';

describe('stats', () => {
  it('describes how long ago a clip was recorded', () => {
    expect(daysAgo(daysFromNow(-0.2))).toBe('Today');
    expect(daysAgo(daysFromNow(-1.2))).toBe('Yesterday');
    expect(daysAgo(daysFromNow(-41.2))).toBe('41 days ago');
  });

  it('totals a reel, past an hour too', () => {
    expect(reelLength([makeClip({ durationSeconds: 59 }), makeClip({ durationSeconds: 59 })])).toBe('1:58');
    expect(reelLength([makeClip({ durationSeconds: 3725 })])).toBe('1:02:05');
    expect(reelLength([])).toBe('0:00');
  });

  it('finds the latest recording', () => {
    const a = makeClip({ recordedAt: daysFromNow(-10) });
    const b = makeClip({ recordedAt: daysFromNow(-2) });
    expect(latestRecordedAt([a, b])).toBe(b.recordedAt);
    expect(latestRecordedAt([])).toBeNull();
  });

  it('flags only a clip leaving within 30 days', () => {
    const soon = makeClip({ gameTitle: 'Soon', availableUntil: daysFromNow(21) });
    const later = makeClip({ gameTitle: 'Later', availableUntil: daysFromNow(60) });
    expect(nextToExpire([later, soon])?.gameTitle).toBe('Soon');
    expect(nextToExpire([later])).toBeNull();
    expect(nextToExpire([makeClip({ availableUntil: daysFromNow(-1) })])).toBeNull();
  });

  it('treats zero views as not worth showing', () => {
    expect(viewsWorthShowing(makeClip({ views: 0 }))).toBe(false);
    expect(viewsWorthShowing(makeClip({ views: 3 }))).toBe(true);
  });
});
