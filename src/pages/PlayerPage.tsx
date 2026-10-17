import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { PlayerCard } from '../components/PlayerCard';
import { Replay } from '../components/Replay';
import { ShareButtons } from '../components/ShareButtons';
import { UpNext } from '../components/UpNext';
import { clipPath } from '../lib/format';
import { clipQuery, clipsQuery, playerQuery } from '../lib/queries';
import { parsePlayerIdentifier } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './PlayerPage.module.css';

/**
 * A player's reel: their latest clip already playing as the replay, the player
 * card beside it, and the rest of the reel below (PLAN-v1.md §12, step 4).
 */
export function PlayerPage() {
  const identifier = useParams().identifier ?? '';
  const valid = parsePlayerIdentifier(identifier) !== null;
  const queryClient = useQueryClient();

  const profile = useQuery({ ...playerQuery(identifier), enabled: valid });
  // Clips are requested by XUID once the profile resolves it. Asking by gamertag in
  // parallel would make the API resolve the same gamertag twice, spending an extra
  // upstream search on a first visit.
  const xuid = profile.data?.xuid;
  const clips = useQuery({ ...clipsQuery(xuid ?? ''), enabled: !!xuid });
  const latest = clips.data?.clips[0];
  // Seeded from the clip list, so the replay costs no request while its URL is fresh.
  const replay = useQuery({ ...clipQuery(queryClient, xuid ?? '', latest?.clipId ?? ''), enabled: !!latest });

  if (!valid) return <NotFoundPage />;
  if (profile.isPending) return <p className={styles.loading}>Loading player…</p>;
  if (profile.isError) return <ErrorMessage error={profile.error} />;
  if (clips.isPending) return <p className={styles.loading}>Loading clips…</p>;
  if (clips.isError) return <ErrorMessage error={clips.error} onRetry={() => void clips.refetch()} />;

  const reel = clips.data.clips;
  const current = replay.data ?? latest;

  if (!current) {
    return (
      <div className={styles.top}>
        <div className={styles.empty}>
          <p>
            {clips.data.access === 'restricted'
              ? "This player's clips aren't public."
              : 'Nothing captured yet. Check back after their next session.'}
          </p>
        </div>
        <PlayerCard profile={profile.data} clips={reel} />
      </div>
    );
  }

  const shareUrl = `${window.location.origin}${clipPath(current.xuid, current.clipId)}`;
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <Replay clip={current} gamertag={profile.data.gamertag} refresh={async () => (await replay.refetch()).data} />
        <PlayerCard profile={profile.data} clips={reel}>
          <div className={styles.share}>
            <ShareButtons url={shareUrl} title={current.gameTitle} label="Copy replay link" />
          </div>
        </PlayerCard>
      </div>
      <div className={styles.gutter}>
        <UpNext clips={reel.filter((c) => c.clipId !== current.clipId)} total={reel.length} />
      </div>
    </div>
  );
}
