import { Link } from 'react-router';
import { playerPath } from '../lib/format';
import { clearRecent, removeRecent, togglePin, useSavedPlayers, type SavedPlayer } from '../lib/savedPlayers';
import { daysAgo } from '../lib/stats';
import styles from './SavedPlayers.module.css';

/** A gamerpic, or the gamertag's initials when there is none. */
export function PlayerAvatar({ player, className }: { player: Pick<SavedPlayer, 'gamertag' | 'gamerpicUrl'>; className?: string }) {
  if (player.gamerpicUrl) return <img src={player.gamerpicUrl} alt="" className={`${styles.avatar} ${className ?? ''}`} />;
  const initials = player.gamertag
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={`${styles.avatar} ${styles.initials} ${className ?? ''}`} aria-hidden>
      {initials}
    </span>
  );
}

function PlayerTile({ player, pinned }: { player: SavedPlayer; pinned: boolean }) {
  return (
    <li className={pinned ? `${styles.tile} ${styles.pinnedTile}` : styles.tile}>
      <Link to={playerPath(player.gamertag)} className={styles.link}>
        <PlayerAvatar player={player} />
        <span className={styles.text}>
          <strong className={styles.name}>{player.gamertag}</strong>
          <span className={styles.meta}>{pinned ? 'Pinned' : `Viewed ${daysAgo(player.at).toLowerCase()}`}</span>
        </span>
      </Link>
      <button
        type="button"
        className={pinned ? `${styles.pin} ${styles.on}` : styles.pin}
        onClick={() => togglePin(player)}
        aria-label={`${pinned ? 'Unpin' : 'Pin'} ${player.gamertag}`}
        title={pinned ? 'Unpin' : 'Pin'}
      >
        {pinned ? '★' : '☆'}
      </button>
      {!pinned && (
        <button type="button" className={styles.remove} onClick={() => removeRecent(player.xuid)} aria-label={`Remove ${player.gamertag}`} title="Remove">
          ×
        </button>
      )}
    </li>
  );
}

/**
 * The home page's pinned and recent players. Each group is left out while
 * empty, so a first visit looks as it did before.
 */
export function SavedPlayers() {
  const { pinned, recent } = useSavedPlayers();
  if (pinned.length === 0 && recent.length === 0) return null;
  return (
    <div className={styles.groups}>
      {pinned.length > 0 && (
        <section aria-labelledby="pinned-heading" className={styles.group}>
          <div className={styles.head}>
            <h2 id="pinned-heading" className="section-title">
              Pinned
            </h2>
            <span className={styles.note}>Kept on this device only</span>
          </div>
          <ul className={styles.grid}>
            {pinned.map((p) => (
              <PlayerTile key={p.xuid} player={p} pinned />
            ))}
          </ul>
        </section>
      )}
      {recent.length > 0 && (
        <section aria-labelledby="recent-heading" className={styles.group}>
          <div className={styles.head}>
            <h2 id="recent-heading" className="section-title">
              Recent
            </h2>
            {pinned.length === 0 && <span className={styles.note}>Kept on this device only</span>}
            <button type="button" className={styles.clear} onClick={clearRecent}>
              Clear recent
            </button>
          </div>
          <ul className={styles.grid}>
            {recent.map((p) => (
              <PlayerTile key={p.xuid} player={p} pinned={false} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
