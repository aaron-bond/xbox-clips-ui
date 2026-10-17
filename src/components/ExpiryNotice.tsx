import type { Clip } from '../api/types';
import { formatDate } from '../lib/format';
import { nextToExpire } from '../lib/stats';
import styles from './ExpiryNotice.module.css';

/**
 * Says which clip leaves Xbox next, when that is within the notice window.
 * Sits at the foot of the player page: useful, but not worth space above the fold.
 */
export function ExpiryNotice({ clips }: { clips: Clip[] }) {
  const expiring = nextToExpire(clips);
  if (!expiring) return null;
  return (
    <p className={styles.notice}>
      {expiring.gameTitle || 'A clip'} leaves Xbox around {formatDate(expiring.availableUntil)}. Clips are deleted about
      90 days after upload.
    </p>
  );
}
