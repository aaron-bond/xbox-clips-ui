import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './PageHeader.module.css';

interface Props {
  gamertag: string;
  gamerpicUrl: string | null;
  /** The player's page: the gamertag and picture link there. */
  playerTo: string;
  /** A short label under the gamertag, e.g. "Achievements". */
  kicker?: string;
  /** Where Back goes, and what it says, for a page whose way up isn't the player: "Back to games". */
  back?: { to: string; label: string };
  /** The gamertag is the page's heading unless the page has its own (a game title, say). */
  heading?: boolean;
  /** Beside Back on desktop, beside the gamertag on phones. */
  aside?: ReactNode;
}

/**
 * The header of a player's secondary pages (their whole reel, their games, a
 * game's achievements): who the page is about. The gamertag and picture lead
 * back to the player, so only a page further down needs a Back button.
 */
export function PageHeader({ gamertag, gamerpicUrl, playerTo, kicker, back, heading = true, aside }: Props) {
  const Name = heading ? 'h1' : 'p';
  return (
    <header className={styles.head}>
      {/* The gamertag beside it is the same link, for keyboards and screen readers. */}
      <Link to={playerTo} tabIndex={-1} aria-hidden className={styles.picLink}>
        {gamerpicUrl ? <img src={gamerpicUrl} alt="" width={56} height={56} className={styles.pic} /> : <span className={styles.pic} />}
      </Link>
      <div className={styles.titles}>
        <Name className={styles.name}>
          <Link to={playerTo} className={styles.nameLink}>
            {gamertag}
          </Link>
        </Name>
        {kicker && <span className={styles.kicker}>{kicker}</span>}
      </div>
      {aside && <div className={styles.aside}>{aside}</div>}
      {back && (
        <Link to={back.to} className={`btn-outline ${styles.back}`}>
          {back.label}
        </Link>
      )}
    </header>
  );
}
