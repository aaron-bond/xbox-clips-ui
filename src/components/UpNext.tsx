import { useId } from 'react';
import { Link } from 'react-router';
import type { Clip } from '../api/types';
import { clipPath, formatDate, formatDuration } from '../lib/format';
import styles from './UpNext.module.css';

interface Props {
  clips: Clip[];
  /** The section heading. */
  title?: string;
  /** A closing tile leading to the rest, when the list is a cut-down one. */
  more?: { to: string; label: string };
  /** 'grid' under a wide replay; 'list' in a narrow column. */
  layout?: 'grid' | 'list';
}

/** The rest of the reel. Callers leave it out when there is nothing else. */
export function UpNext({ clips, title = 'Up next', more, layout = 'grid' }: Props) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className="section-title">
        {title}
      </h2>
      <ul className={layout === 'grid' ? styles.grid : styles.list}>
        {clips.map((clip) => (
          <li key={clip.clipId}>
            <Link to={clipPath(clip.xuid, clip.clipId)} className={styles.item}>
              <span className={styles.thumb}>
                {clip.thumbnailUrl && <img src={clip.thumbnailUrl} alt="" loading="lazy" />}
                <span className={styles.duration}>{formatDuration(clip.durationSeconds)}</span>
              </span>
              <span className={styles.text}>
                <span className={styles.title}>{clip.caption || clip.gameTitle || 'Xbox clip'}</span>
                <span className={styles.meta}>
                  {clip.caption && clip.gameTitle ? `${clip.gameTitle} · ` : ''}
                  {formatDate(clip.recordedAt)}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {more && (
          <li>
            <Link to={more.to} className={styles.more}>
              {more.label}
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}
