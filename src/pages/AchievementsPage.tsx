import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import type { PlayerGame } from '../api/types';
import { ErrorMessage } from '../components/ErrorMessage';
import { PlayerAvatar } from '../components/SavedPlayers';
import { gameAchievementsPath, playerPath } from '../lib/format';
import { storeImage } from '../lib/games';
import { gamesQuery, playerQuery } from '../lib/queries';
import { daysAgo } from '../lib/stats';
import { parsePlayerIdentifier } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './AchievementsPage.module.css';

/**
 * A player's recent games, each leading to their achievements in it
 * (PLAN-v1.md §11, P2). The games come from the same cached title history as
 * the career stats, so this page costs at most one request on a cold cache.
 */
export function AchievementsPage() {
  const identifier = useParams().identifier ?? '';
  const valid = parsePlayerIdentifier(identifier) !== null;
  const profile = useQuery({ ...playerQuery(identifier), enabled: valid });
  const games = useQuery({ ...gamesQuery(identifier), enabled: valid });
  if (!valid) return <NotFoundPage />;

  const gamertag = profile.data?.gamertag ?? identifier;
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <PlayerAvatar player={{ gamertag, gamerpicUrl: profile.data?.gamerpicUrl ?? null }} className={styles.pic} />
        <div className={styles.titles}>
          <h1 className={styles.name}>{gamertag}</h1>
          <span className={styles.kicker}>Achievements</span>
        </div>
        <Link to={playerPath(identifier)} className={`btn-outline ${styles.back}`}>
          Back to player
        </Link>
      </header>

      {games.isPending ? (
        <ul className={styles.grid} aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className={styles.skeleton} />
          ))}
        </ul>
      ) : games.isError ? (
        <ErrorMessage error={games.error} onRetry={() => void games.refetch()} />
      ) : games.data.games.length === 0 ? (
        <p className={styles.empty}>No games to show: this player's game history isn't public.</p>
      ) : (
        <section aria-labelledby="games-heading" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 id="games-heading" className="section-title">
              Recent games
            </h2>
            {games.data.limited && <span className={styles.note}>Their last {games.data.games.length} games</span>}
          </div>
          <ul className={styles.grid}>
            {games.data.games.map((g) => (
              <GameTile key={g.titleId} game={g} to={gameAchievementsPath(identifier, g.titleId)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** "6 days ago" for recent play; just the year once it's over a year back. */
function lastPlayedLabel(iso: string, now = Date.now()) {
  const days = (now - Date.parse(iso)) / 86_400_000;
  return days > 365 ? `last played ${new Date(iso).getFullYear()}` : daysAgo(iso).toLowerCase();
}

function GameTile({ game, to }: { game: PlayerGame; to: string }) {
  const pct = game.totalGamerscore > 0 ? Math.min(100, Math.round((100 * game.gamerscore) / game.totalGamerscore)) : 0;
  return (
    <li>
      <Link to={to} className={styles.tile}>
        <span className={styles.art}>
          {game.imageUrl && <img src={storeImage(game.imageUrl, 300)} alt="" loading="lazy" />}
          {game.xbox360 && <span className={styles.platform}>Xbox 360</span>}
        </span>
        <span className={styles.gameName}>{game.name}</span>
        {game.totalGamerscore > 0 ? (
          <>
            <span className={styles.score}>
              {game.gamerscore.toLocaleString()} <span>/ {game.totalGamerscore.toLocaleString()} G</span>
            </span>
            <span className={styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Completion">
              <span style={{ width: `${pct}%` }} />
            </span>
          </>
        ) : (
          <span className={styles.meta}>No achievements</span>
        )}
        <span className={styles.meta}>
          {game.unlocked} {game.unlocked === 1 ? 'achievement' : 'achievements'}
          {game.lastPlayed && ` · ${lastPlayedLabel(game.lastPlayed)}`}
        </span>
      </Link>
    </li>
  );
}
