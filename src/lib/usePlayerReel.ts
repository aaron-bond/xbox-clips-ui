import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { clipsQuery, playerQuery } from './queries';

/** Failures that say nothing about the player, only that Xbox is busy or down. */
const isTransient = (error: unknown) =>
  error instanceof ApiError && (error.code === 'UPSTREAM_RATE_LIMIT' || error.code === 'UPSTREAM_ERROR');

/**
 * A player's profile and clip list, as the player and reel pages need them.
 *
 * Clips are requested by XUID once the profile resolves it. Asking by gamertag in
 * parallel would make the API resolve the same gamertag twice, spending an extra
 * upstream search on a first visit.
 *
 * Microsoft throttles profile calls more than any other. When the profile fails
 * for a transient reason, the clips are asked for by the URL's identifier instead:
 * the API needs only its cached gamertag-to-XUID mapping for that, so the reel
 * still shows, with a plainer player card (PLAN-v1.md §12).
 */
export function usePlayerReel(identifier: string) {
  const profile = useQuery(playerQuery(identifier));
  const profileDown = profile.isError && isTransient(profile.error);
  const clipsBy = profile.data?.xuid ?? (profileDown ? identifier : '');
  const clips = useQuery({ ...clipsQuery(clipsBy), enabled: !!clipsBy });
  const xuid = profile.data?.xuid ?? clips.data?.xuid;
  /** Everything the page will show has arrived, or failed for good. */
  const ready = profile.isSuccess || profileDown ? !clips.isPending : profile.isError;
  return { profile, clips, xuid, profileDown, ready };
}
