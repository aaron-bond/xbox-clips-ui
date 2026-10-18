import { useSyncExternalStore } from 'react';

/**
 * Pinned and recent players, kept in this browser's local storage only: nothing
 * here is ever sent to the API (PLAN-v1.md §12). Every read and write tolerates
 * storage being unavailable (private windows, blocked site data), in which case
 * the lists are simply empty.
 */

export interface SavedPlayer {
  xuid: string;
  gamertag: string;
  gamerpicUrl: string | null;
  /** When the player's page last loaded, or when they were pinned. ISO 8601. */
  at: string;
}

export interface SavedPlayers {
  pinned: SavedPlayer[];
  recent: SavedPlayer[];
}

export const MAX_PINNED = 12;
export const MAX_RECENT = 8;

const KEY = 'xboxclips.players.v1';
const CHANGE = 'xboxclips:players';
const EMPTY: SavedPlayers = { pinned: [], recent: [] };

const isPlayer = (p: unknown): p is SavedPlayer =>
  !!p &&
  typeof (p as SavedPlayer).xuid === 'string' &&
  typeof (p as SavedPlayer).gamertag === 'string' &&
  typeof (p as SavedPlayer).at === 'string';

let cache: { raw: string | null; value: SavedPlayers } | null = null;

function read(): SavedPlayers {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore needs the same object back while nothing has changed.
  if (cache && cache.raw === raw) return cache.value;
  let value = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<SavedPlayers>) : null;
    if (parsed) {
      value = {
        pinned: (Array.isArray(parsed.pinned) ? parsed.pinned : []).filter(isPlayer).slice(0, MAX_PINNED),
        recent: (Array.isArray(parsed.recent) ? parsed.recent : []).filter(isPlayer).slice(0, MAX_RECENT),
      };
    }
  } catch {
    // Unreadable data is treated as none.
  }
  cache = { raw, value };
  return value;
}

function write(next: SavedPlayers) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the change lasts only until the page reloads.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  // `storage` fires when another tab changes the lists.
  window.addEventListener(CHANGE, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener('storage', onChange);
  };
}

const without = (list: SavedPlayer[], xuid: string) => list.filter((p) => p.xuid !== xuid);

/** A player's page loaded: they go to the top of Recent, or refresh their pinned entry. */
export function recordVisit(player: Omit<SavedPlayer, 'at'>, now = new Date()) {
  const { pinned, recent } = read();
  const entry = { ...player, at: now.toISOString() };
  if (pinned.some((p) => p.xuid === player.xuid)) {
    // Pinned players keep their place; only the details are refreshed.
    write({ pinned: pinned.map((p) => (p.xuid === player.xuid ? { ...entry, at: p.at } : p)), recent: without(recent, player.xuid) });
    return;
  }
  write({ pinned, recent: [entry, ...without(recent, player.xuid)].slice(0, MAX_RECENT) });
}

/** Pins or unpins. Pinning past the limit does nothing; the UI disables it there. */
export function togglePin(player: Omit<SavedPlayer, 'at'>, now = new Date()) {
  const { pinned, recent } = read();
  if (pinned.some((p) => p.xuid === player.xuid)) {
    // Unpinned, the player goes back to the top of Recent.
    const entry = { ...player, at: now.toISOString() };
    write({ pinned: without(pinned, player.xuid), recent: [entry, ...without(recent, player.xuid)].slice(0, MAX_RECENT) });
    return;
  }
  if (pinned.length >= MAX_PINNED) return;
  write({ pinned: [...pinned, { ...player, at: now.toISOString() }], recent: without(recent, player.xuid) });
}

/** Removes a player from Recent. Pinned players are only removed by unpinning. */
export function removeRecent(xuid: string) {
  const { pinned, recent } = read();
  write({ pinned, recent: without(recent, xuid) });
}

export function clearRecent() {
  write({ pinned: read().pinned, recent: [] });
}

export function useSavedPlayers(): SavedPlayers {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
