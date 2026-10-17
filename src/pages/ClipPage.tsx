import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { Replay } from '../components/Replay';
import { ShareButtons } from '../components/ShareButtons';
import { UpNext } from '../components/UpNext';
import { clipPath, formatDate, formatDuration } from '../lib/format';
import { tenureLabel } from '../lib/stats';
import { clipQuery, clipsQuery, playerQuery } from '../lib/queries';
import { isClipId, isXuid } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './ClipPage.module.css';

/** How many more of the player's clips the clip page suggests. */
const UP_NEXT = 3;

/**
 * One clip: the page a share link opens (PLAN-v1.md §12, step 5). Copying the
 * link is its main job; the reel card leads on to the player's full reel.
 */
export function ClipPage() {
  const { xuid = '', clipId = '' } = useParams();
  const valid = isXuid(xuid) && isClipId(clipId);
  const queryClient = useQueryClient();
  const clip = useQuery({ ...clipQuery(queryClient, xuid, clipId), enabled: valid });
  // Both are cached by the API; the clip list is usually fresh already, because
  // resolving the clip fetched it.
  const profile = useQuery({ ...playerQuery(xuid), enabled: valid });
  const reel = useQuery({ ...clipsQuery(xuid), enabled: valid });

  if (!valid) return <NotFoundPage />;
  if (clip.isPending) return <p className={styles.loading}>Loading clip…</p>;
  if (clip.isError) return <ErrorMessage error={clip.error} />;

  const data = clip.data;
  const shareUrl = `${window.location.origin}${clipPath(data.xuid, data.clipId)}`;
  const others = (reel.data?.clips ?? []).filter((c) => c.clipId !== data.clipId).slice(0, UP_NEXT);

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <Replay clip={data} gamertag={profile.data?.gamertag} refresh={async () => (await clip.refetch()).data} />
        <div className={styles.under}>
          <p className={styles.meta}>
            {formatDuration(data.durationSeconds)} · On Xbox until about {formatDate(data.availableUntil)}
          </p>
          <div className={styles.share}>
            <ShareButtons url={shareUrl} title={data.gameTitle} label="Copy link" primary />
          </div>
        </div>
      </div>

      <aside className={styles.aside}>
        {profile.data && (
          <section className={styles.reelCard} aria-label="From the reel of">
            <span className={styles.kicker}>From the reel of</span>
            <div className={styles.who}>
              {profile.data.gamerpicUrl && <img src={profile.data.gamerpicUrl} alt="" width={58} height={58} />}
              <div>
                <strong className={styles.name}>{profile.data.gamertag}</strong>
                <span className={styles.facts}>
                  {[
                    `${profile.data.gamerscore.toLocaleString()} Gamerscore`,
                    reel.data ? `${reel.data.clips.length} ${reel.data.clips.length === 1 ? 'clip' : 'clips'}` : null,
                    tenureLabel(profile.data.tenureYears),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            </div>
            <Link to={`/player/${data.xuid}`} className="btn-outline">
              Watch the full reel
            </Link>
          </section>
        )}
        {others.length > 0 && <UpNext clips={others} layout="list" />}
      </aside>
    </div>
  );
}
