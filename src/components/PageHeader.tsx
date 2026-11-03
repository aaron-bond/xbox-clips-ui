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
      {/* One link round the picture and gamertag, so a thumb can't miss it. Named
          for the gamertag alone: the kicker under it describes this page, not the player's. */}
      <Link to={playerTo} aria-label={gamertag} className={styles.who}>
        {gamerpicUrl ? <img src={gamerpicUrl} alt="" width={56} height={56} className={styles.pic} /> : <span className={styles.pic} />}
        <div className={styles.titles}>
          <Name className={styles.name}>{gamertag}</Name>
          {kicker && <span className={styles.kicker}>{kicker}</span>}
        </div>
      </Link>
      {aside && <div className={styles.aside}>{aside}</div>}
      {back && (
        <Link to={back.to} className={`btn-outline ${styles.back}`}>
          {back.label}
        </Link>
      )}
    </header>
  );
}
