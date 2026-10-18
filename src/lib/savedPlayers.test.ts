import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearRecent, MAX_PINNED, MAX_RECENT, recordVisit, removeRecent, togglePin, useSavedPlayers } from './savedPlayers';
import { renderHook } from '@testing-library/react';

const player = (n: number) => ({ xuid: `${1000 + n}`, gamertag: `Player ${n}`, gamerpicUrl: null });
const current = () => renderHook(() => useSavedPlayers()).result.current;
const tags = (list: { gamertag: string }[]) => list.map((p) => p.gamertag);

describe('saved players', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps recent visits newest first, each once, up to the limit', () => {
    for (let n = 1; n <= MAX_RECENT + 2; n++) recordVisit(player(n));
    recordVisit(player(5));
    const { recent } = current();
    expect(recent).toHaveLength(MAX_RECENT);
    expect(tags(recent).slice(0, 2)).toEqual(['Player 5', `Player ${MAX_RECENT + 2}`]);
    expect(tags(recent).filter((t) => t === 'Player 5')).toHaveLength(1);
  });

  it('moves a pinned player out of recent, and back to the top of recent when unpinned', () => {
    recordVisit(player(1));
    recordVisit(player(2));
    togglePin(player(1));
    expect(tags(current().pinned)).toEqual(['Player 1']);
    expect(tags(current().recent)).toEqual(['Player 2']);
    togglePin(player(1));
    expect(current().pinned).toEqual([]);
    expect(tags(current().recent)).toEqual(['Player 1', 'Player 2']);
  });

  it('refreshes a pinned player on a visit without adding them to recent', () => {
    togglePin(player(1));
    recordVisit({ ...player(1), gamertag: 'Renamed', gamerpicUrl: 'https://img.test/pic' });
    expect(current().pinned[0]).toMatchObject({ gamertag: 'Renamed', gamerpicUrl: 'https://img.test/pic' });
    expect(current().recent).toEqual([]);
  });

  it('pins no more than the limit', () => {
    for (let n = 1; n <= MAX_PINNED + 1; n++) togglePin(player(n));
    expect(current().pinned).toHaveLength(MAX_PINNED);
    expect(tags(current().pinned)).not.toContain(`Player ${MAX_PINNED + 1}`);
  });

  it('removes and clears recent players without touching pinned ones', () => {
    togglePin(player(1));
    recordVisit(player(2));
    recordVisit(player(3));
    removeRecent(player(3).xuid);
    expect(tags(current().recent)).toEqual(['Player 2']);
    clearRecent();
    expect(current().recent).toEqual([]);
    expect(tags(current().pinned)).toEqual(['Player 1']);
  });

  it('treats unreadable or unavailable storage as empty', () => {
    localStorage.setItem('xboxclips.players.v1', '{not json');
    expect(current()).toEqual({ pinned: [], recent: [] });
    localStorage.setItem('xboxclips.players.v1', JSON.stringify({ pinned: [{ gamertag: 'No xuid' }], recent: 'nope' }));
    expect(current()).toEqual({ pinned: [], recent: [] });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(current()).toEqual({ pinned: [], recent: [] });
  });
});
