/**
 * Mirrors the API's identifier rules (xbox-clips-api src/validation.ts), so
 * malformed input is rejected before it costs a request against the shared
 * upstream budget. Shared by the app and the preview function.
 */

export type PlayerIdentifier = { kind: 'xuid'; xuid: string } | { kind: 'gamertag'; gamertag: string };

const XUID = /^\d{1,20}$/;
const GAMERTAG = /^[\p{L}\p{N}](?:[\p{L}\p{N} ]{0,13}[\p{L}\p{N}])?(?:#\d{1,5})?$/u;
const CLIP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsePlayerIdentifier(raw: string): PlayerIdentifier | null {
  if (XUID.test(raw)) return { kind: 'xuid', xuid: raw };
  if (GAMERTAG.test(raw)) return { kind: 'gamertag', gamertag: raw };
  return null;
}

const PRODUCT_ID = /^[0-9A-Z]{12}$/i;

export const isXuid = (raw: string) => XUID.test(raw);
export const isProductId = (raw: string) => PRODUCT_ID.test(raw);
export const isClipId = (raw: string) => CLIP_ID.test(raw);
