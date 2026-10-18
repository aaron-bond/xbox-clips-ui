import { Link } from 'react-router';
import styles from './PageHeader.module.css';

interface Props {
  gamertag: string;
  gamerpicUrl: string | null;
  /** A short label under the gamertag, e.g. "Achievements". */
  kicker?: string;
  /** Where Back goes, and what it says: "Back to player", "Back to games". */
  back: { to: string; label: string };
  /** The gamertag is the page's heading unless the page has its own (a game title, say). */
  heading?: boolean;
}

/**
 * The header of a player's secondary pages (their whole reel, their games, a
 * game's achievements): who the page is about, and one Back button to the page
 * above it. Every such page navigates back the same way.
 */
export function PageHeader({ gamertag, gamerpicUrl, kicker, back, heading = true }: Props) {
  const Name = heading ? 'h1' : 'p';
  return (
    <header className={styles.head}>
      {gamerpicUrl ? <img src={gamerpicUrl} alt="" width={56} height={56} className={styles.pic} /> : <span className={styles.pic} aria-hidden />}
      <div className={styles.titles}>
        <Name className={styles.name}>{gamertag}</Name>
        {kicker && <span className={styles.kicker}>{kicker}</span>}
      </div>
      <Link to={back.to} className={`btn-outline ${styles.back}`}>
        {back.label}
      </Link>
    </header>
  );
}
