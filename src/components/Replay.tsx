import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Clip } from '../api/types';
import { formatDate, formatDuration, formatViews } from '../lib/format';
import { viewsWorthShowing } from '../lib/stats';
import styles from './Replay.module.css';

interface Props {
  clip: Clip;
  /** Shown on the strap's detail bar. */
  gamertag?: string;
  /** Fetches the clip again for a fresh media URL. Resolves to the updated clip. */
  refresh: () => Promise<Clip | undefined>;
}

type State = 'playing' | 'retrying' | 'failed';

/**
 * A clip presented as a broadcast replay: REPLAY and duration badges, and a
 * name strap below the picture leading with the game (captions are almost
 * always empty).
 *
 * Plays the upstream media URL directly and starts automatically: with sound
 * where the browser allows it, otherwise muted. URLs expire hourly and can die
 * early, so a playback error triggers exactly one automatic refetch; a second
 * failure waits for the visitor (PLAN-v1.md §5).
 */
export function Replay({ clip, gamertag, refresh }: Props) {
  const [state, setState] = useState<State>('playing');
  const [retried, setRetried] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaUrl = clip.media?.url;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) return;
    tryPlay(video).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        video.muted = true;
        void tryPlay(video).catch(() => {});
      }
    });
  }, [mediaUrl]);

  async function recover(automatic: boolean) {
    if (automatic && retried) {
      setState('failed');
      return;
    }
    setRetried(true);
    setState('retrying');
    const fresh = await refresh().catch(() => undefined);
    const changed = fresh?.media && fresh.media.url !== clip.media?.url;
    setState(changed || !automatic ? 'playing' : 'failed');
  }

  const details = [
    clip.caption ? `“${clip.caption}”` : null,
    gamertag,
    formatDate(clip.recordedAt),
    viewsWorthShowing(clip) ? formatViews(clip.views) : null,
  ].filter(Boolean);

  let screen: ReactNode;
  if (!clip.media) {
    screen = <Panel clip={clip} message="This clip can't be played right now." onRetry={() => void recover(false)} />;
  } else if (state === 'failed') {
    screen = <Panel clip={clip} message="This clip failed to play." onRetry={() => void recover(false)} />;
  } else {
    screen = (
      <>
        <video
          // A new URL remounts the element, so it loads the fresh source.
          key={clip.media.url}
          ref={videoRef}
          src={clip.media.url}
          poster={clip.thumbnailUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          onError={() => void recover(true)}
          className={styles.video}
          data-testid="clip-video"
        />
        {state === 'retrying' && <div className={styles.overlay}>Reconnecting…</div>}
      </>
    );
  }

  return (
    <figure className={styles.replay}>
      <div className={styles.frame}>
        {screen}
        <span className={styles.badges}>
          <span className="badge">Replay</span>
          <span className="badge badge-dark">{formatDuration(clip.durationSeconds)}</span>
        </span>
      </div>
      <figcaption className={`strap ${styles.strap}`}>
        <span className="strap-title">{clip.gameTitle || 'Xbox clip'}</span>
        <span className="strap-sub">{details.join(' · ')}</span>
      </figcaption>
    </figure>
  );
}

/** `play()` returns a promise in modern browsers; normalise the rare older case. */
function tryPlay(video: HTMLVideoElement): Promise<void> {
  return Promise.resolve(video.play());
}

function Panel({ clip, message, onRetry }: { clip: Clip; message: string; onRetry: () => void }) {
  return (
    <>
      {clip.thumbnailUrl && <img src={clip.thumbnailUrl} alt="" className={styles.video} />}
      <div className={styles.overlay} role="alert">
        <p>{message}</p>
        <button type="button" onClick={onRetry} className="btn-primary">
          Try again
        </button>
      </div>
    </>
  );
}
