import { useState, type ReactNode } from 'react';
import type { Clip } from '../api/types';
import styles from './ClipPlayer.module.css';

interface Props {
  clip: Clip;
  /** Fetches the clip again for a fresh media URL. Resolves to the updated clip. */
  refresh: () => Promise<Clip | undefined>;
}

type State = 'playing' | 'retrying' | 'failed';

/**
 * Plays the upstream media URL directly. Media URLs expire hourly and can die
 * a few minutes early, so a playback error triggers exactly one automatic
 * refetch; a second failure waits for the visitor (PLAN-v1.md §5).
 */
export function ClipPlayer({ clip, refresh }: Props) {
  const [state, setState] = useState<State>('playing');
  const [retried, setRetried] = useState(false);

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

  if (!clip.media) {
    return (
      <Panel clip={clip} message="This clip can't be played right now.">
        <button type="button" onClick={() => void recover(false)} className={styles.button}>
          Try again
        </button>
      </Panel>
    );
  }

  if (state === 'failed') {
    return (
      <Panel clip={clip} message="This clip failed to play.">
        <button type="button" onClick={() => void recover(false)} className={styles.button}>
          Try again
        </button>
      </Panel>
    );
  }

  return (
    <div className={styles.frame}>
      <video
        // A new URL remounts the element, so it loads the fresh source.
        key={clip.media.url}
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
    </div>
  );
}

function Panel({ clip, message, children }: { clip: Clip; message: string; children: ReactNode }) {
  return (
    <div className={styles.frame}>
      {clip.thumbnailUrl && <img src={clip.thumbnailUrl} alt="" className={styles.video} />}
      <div className={styles.overlay} role="alert">
        <p>{message}</p>
        {children}
      </div>
    </div>
  );
}
