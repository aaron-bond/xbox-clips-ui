import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import type { PlayerClips, PlayerProfile } from '../api/types';
import { CareerStats, CareerStatsPlaceholder } from '../components/CareerStats';
import { ErrorMessage } from '../components/ErrorMessage';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerIntro } from '../components/PlayerIntro';
import { Replay } from '../components/Replay';
import { ShareButtons } from '../components/ShareButtons';
import { UpNext } from '../components/UpNext';
import { clipPath } from '../lib/format';
import { careerQuery, clipQuery, clipsQuery, playerQuery } from '../lib/queries';
import { useIntroGate } from '../lib/useIntroGate';
import { useNearViewport } from '../lib/useNearViewport';
import { parsePlayerIdentifier } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './PlayerPage.module.css';

/**
 * A player's reel: their latest clip already playing as the replay, the player
 * card beside it, and the rest of the reel below (PLAN-v1.md §12, step 4).
 */
export function PlayerPage() {
  const identifier = useParams().identifier ?? '';
  const parsed = parsePlayerIdentifier(identifier);
  if (!parsed) return <NotFoundPage />;
  // Keyed, so moving from one player to another starts afresh, intro included.
  return <PlayerReel key={identifier} identifier={identifier} name={parsed.kind === 'gamertag' ? parsed.gamertag : null} />;
}

function PlayerReel({ identifier, name }: { identifier: string; name: string | null }) {
  const queryClient = useQueryClient();

  const profile = useQuery(playerQuery(identifier));
  // Clips are requested by XUID once the profile resolves it. Asking by gamertag in
  // parallel would make the API resolve the same gamertag twice, spending an extra
  // upstream search on a first visit.
  const xuid = profile.data?.xuid;
  const clips = useQuery({ ...clipsQuery(xuid ?? ''), enabled: !!xuid });
  // Career stats sit below Up next and load only when scrolled near, so visitors
  // who watch and leave never spend the title-history call (PLAN-v1.md §12).
  const careerSlot = useNearViewport<HTMLDivElement>('0px');
  const career = useQuery({ ...careerQuery(xuid ?? ''), enabled: !!xuid && careerSlot.near });
  const latest = clips.data?.clips[0];
  // Seeded from the clip list, so the replay costs no request while its URL is fresh.
  const replay = useQuery({ ...clipQuery(queryClient, xuid ?? '', latest?.clipId ?? ''), enabled: !!latest });

  // A slow load plays the player intro over the wait (PLAN-v1.md §12): profile and
  // clips are two requests in sequence, often a second or two on a cold cache.
  const ready = profile.isError || (profile.isSuccess && !clips.isPending);
  const intro = useIntroGate(ready);
  if (intro === 'waiting') return <div className={styles.holding} aria-busy="true" />;
  // The page and the intro each keep one place in the tree through every phase, so
  // the exit doesn't replay the intro's entrance and the end of the wipe doesn't
  // restart the replay.
  return (
    <div className={intro === 'leaving' ? styles.revealing : undefined}>
      {intro !== 'showing' && content()}
      {intro !== 'done' && <PlayerIntro name={name} profile={profile.data} leaving={intro === 'leaving'} />}
    </div>
  );

  function content(): ReactNode {
    if (profile.isPending) return null;
    if (profile.isError) return <ErrorMessage error={profile.error} />;
    if (clips.isPending) return null;
    if (clips.isError) return <ErrorMessage error={clips.error} onRetry={() => void clips.refetch()} />;
    return reelView(profile.data, clips.data);
  }

  function reelView(profile: PlayerProfile, clips: PlayerClips): ReactNode {
    const reel = clips.clips;
    const current = replay.data ?? latest;
    // Secondary: a placeholder holds its place while loading; if the history is
    // hidden or fails to load, the section is left out.
    const careerGone = career.isError || (career.isSuccess && !career.data.stats);
    const careerSection = careerGone ? null : (
      <div className={styles.gutter} ref={careerSlot.ref}>
        {career.data?.stats ? <CareerStats stats={career.data.stats} clips={reel} /> : <CareerStatsPlaceholder />}
      </div>
    );

    if (!current) {
      return (
        <div className={styles.page}>
          <div className={styles.top}>
            <div className={styles.empty}>
              <p>
                {clips.access === 'restricted'
                  ? "This player's clips aren't public."
                  : 'Nothing captured yet. Check back after their next session.'}
              </p>
            </div>
            <PlayerCard profile={profile} clips={reel} />
          </div>
          {careerSection}
        </div>
      );
    }

    const shareUrl = `${window.location.origin}${clipPath(current.xuid, current.clipId)}`;
    return (
      <div className={styles.page}>
        <div className={styles.top}>
          <Replay clip={current} gamertag={profile.gamertag} refresh={async () => (await replay.refetch()).data} />
          <PlayerCard profile={profile} clips={reel}>
            <div className={styles.share}>
              <ShareButtons url={shareUrl} title={current.gameTitle} label="Copy replay link" />
            </div>
          </PlayerCard>
        </div>
        <div className={styles.gutter}>
          <UpNext clips={reel.filter((c) => c.clipId !== current.clipId)} total={reel.length} />
        </div>
        {careerSection}
      </div>
    );
  }
}
