import type { Clip } from '../api/types';
import { ClipCard } from './ClipCard';
import styles from './ClipGrid.module.css';

export function ClipGrid({ clips }: { clips: Clip[] }) {
  return (
    <ul className={styles.grid}>
      {clips.map((clip) => (
        <ClipCard key={clip.clipId} clip={clip} />
      ))}
    </ul>
  );
}
