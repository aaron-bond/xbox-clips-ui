import { describe, expect, it } from 'vitest';
import { isClipId, isXuid, parsePlayerIdentifier } from './validation';

describe('validation (mirrors the API)', () => {
  it('treats all-digit identifiers as XUIDs', () => {
    expect(parsePlayerIdentifier('2533274900000001')).toEqual({ kind: 'xuid', xuid: '2533274900000001' });
  });

  it.each(['TestPlayer', 'Major Nelson', 'プレイヤー', 'Player#1234'])('accepts gamertag %s', (g) => {
    expect(parsePlayerIdentifier(g)).toEqual({ kind: 'gamertag', gamertag: g });
  });

  it.each(['', ' Lead', 'Trail ', 'a/b', 'x'.repeat(16), 'semi;colon'])('rejects %j', (g) => {
    expect(parsePlayerIdentifier(g)).toBeNull();
  });

  it('checks XUIDs and clip ids', () => {
    expect(isXuid('123')).toBe(true);
    expect(isXuid('12a')).toBe(false);
    expect(isClipId('0A1B2C3D-4E5F-4A6B-8C7D-9E0F1A2B3C4D')).toBe(true);
    expect(isClipId('nope')).toBe(false);
  });
});
