import { Link } from 'react-router';
import type { Clip } from '../api/types';
import { clipPath, clipTitle, formatDate, formatDuration } from '../lib/format';
import styles from './ClipCard.module.css';

export function ClipCard({ clip }: { clip: Clip }) {
  return (
    <li className={styles.card}>
      <Link to={clipPath(clip.xuid, clip.clipId)} className={styles.link}>
        <div className={styles.thumb}>
          {clip.thumbnailUrl && <img src={clip.thumbnailUrl} alt="" loading="lazy" />}
          <span className={styles.duration}>{formatDuration(clip.durationSeconds)}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.title}>{clipTitle(clip)}</span>
          <span className={styles.sub}>
            {clip.gameTitle && clip.caption ? `${clip.gameTitle} · ` : ''}
            {formatDate(clip.recordedAt)}
          </span>
        </div>
      </Link>
    </li>
  );
}
