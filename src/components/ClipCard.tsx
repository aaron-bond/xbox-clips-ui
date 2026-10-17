import { Link } from 'react-router';
import type { Clip } from '../api/types';
import { clipPath, clipTitle, formatDate, formatDuration, formatViews } from '../lib/format';
import styles from './ClipCard.module.css';

export function ClipCard({ clip }: { clip: Clip }) {
  return (
    <li className={styles.card}>
      <Link to={clipPath(clip.xuid, clip.clipId)} className={styles.link}>
        <div className={styles.thumb}>
          {clip.thumbnailUrl && <img src={clip.thumbnailUrl} alt="" loading="lazy" />}
          <span className={styles.play} aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className={styles.duration}>{formatDuration(clip.durationSeconds)}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.title}>{clipTitle(clip)}</span>
          {clip.caption && clip.gameTitle && <span className={styles.game}>{clip.gameTitle}</span>}
          <span className={styles.sub}>
            {formatViews(clip.views)} · {formatDate(clip.recordedAt)}
          </span>
        </div>
      </Link>
    </li>
  );
}
