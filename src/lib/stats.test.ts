import { describe, expect, it } from 'vitest';
import { daysFromNow, makeClip } from '../test/helpers';
import { daysAgo, latestRecordedAt, mostClipped, nextToExpire, reputationLabel, tenureLabel, viewsWorthShowing } from './stats';

describe('stats', () => {
  it('describes how long ago a clip was recorded', () => {
    expect(daysAgo(daysFromNow(-0.2))).toBe('Today');
    expect(daysAgo(daysFromNow(-1.2))).toBe('Yesterday');
    expect(daysAgo(daysFromNow(-41.2))).toBe('41 days ago');
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

  it('labels tenure and reputation, or nothing when unknown', () => {
    expect(tenureLabel(22)).toBe('22 years on Xbox');
    expect(tenureLabel(1)).toBe('1 year on Xbox');
    expect(tenureLabel(0)).toBeNull();
    expect(tenureLabel(undefined)).toBeNull();
    expect(reputationLabel('needs-work')).toBe('Needs work');
    expect(reputationLabel(null)).toBeNull();
  });

  it('finds the most clipped game, breaking ties by the latest clip', () => {
    const c = (game: string, days: number) => makeClip({ gameTitle: game, recordedAt: daysFromNow(-days) });
    const a5 = c('A', 5);
    expect(mostClipped([a5, c('B', 1), c('A', 9)])).toEqual({ game: 'A', count: 2, tiedWith: [], latest: a5 });
    expect(mostClipped([c('Old', 40), c('New', 2)])).toMatchObject({ game: 'New', count: 1, tiedWith: ['Old'] });
    expect(mostClipped([])).toBeNull();
  });
});
