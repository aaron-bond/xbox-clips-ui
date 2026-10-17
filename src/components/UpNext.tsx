import { Link } from 'react-router';
import type { Clip } from '../api/types';
import { clipPath, formatDate, formatDuration } from '../lib/format';
import styles from './UpNext.module.css';

interface Props {
  clips: Clip[];
  /** The whole reel's size, for the closing card. */
  total: number;
  /** 'grid' under a wide replay; 'list' in a narrow column. */
  layout?: 'grid' | 'list';
}

/** Clips per row in the desktop grid (UpNext.module.css). */
const GRID_COLUMNS = 4;

/** The rest of the reel. A short reel ends with a deliberate closing card. */
export function UpNext({ clips, total, layout = 'grid' }: Props) {
  // The closing card fills whatever is left of the last row, or a row of its own.
  const endSpan = GRID_COLUMNS - (clips.length % GRID_COLUMNS);
  return (
    <section className={styles.section} aria-labelledby="up-next">
      <h2 id="up-next" className="section-title">
        Up next
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
        {layout === 'grid' && (
          <li className={styles.end} style={{ gridColumn: `span ${endSpan}` }}>
            <p>End of reel · {total === 1 ? "That's the only clip" : `That's all ${total} clips`}</p>
          </li>
        )}
      </ul>
    </section>
  );
}
