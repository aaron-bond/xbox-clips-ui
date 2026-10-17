import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { gamePath } from '../lib/games';
import { mostPlayedQuery } from '../lib/queries';
import styles from './Ticker.module.css';

const SHOWN = 10;

/**
 * The most-played band across the top of every page (PLAN-v1.md §12, step 2).
 * Reads the same cached ranking as the front page; left out if it can't load.
 */
export function Ticker() {
  const { data } = useQuery(mostPlayedQuery());
  const games = data?.games?.slice(0, SHOWN) ?? [];
  if (games.length === 0) return null;
  return (
    <nav className={styles.band} aria-label="Most played on Xbox">
      <span className={styles.label}>
        <span className={styles.long}>Most played</span>
        <span className={styles.short} aria-hidden>
          Top
        </span>
      </span>
      <ol className={styles.list}>
        {games.map((g) => (
          <li key={g.productId}>
            <Link to={gamePath(g.productId)} className={styles.item}>
              <span className={styles.rank}>{g.rank}</span> {g.title}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
