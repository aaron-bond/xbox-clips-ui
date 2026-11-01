import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import type { PlayerGame } from '../api/types';
import { ErrorMessage } from '../components/ErrorMessage';
import { Laurel } from '../components/Laurel';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { gameAchievementsPath, playerPath } from '../lib/format';
import { storeImage } from '../lib/games';
import { hideBroken, markLoaded } from '../lib/images';
import { gamesQuery, mythicsQuery, nearestQuery, playerQuery } from '../lib/queries';
import { daysAgo } from '../lib/stats';
import { parsePlayerIdentifier } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './AchievementsPage.module.css';

type Sort = 'recent' | 'nearest';

const SKELETON_TILES = 6;

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
  // Asked for once the games show there is a history to read: it takes a full read upstream.
  const hasGames = (games.data?.games.length ?? 0) > 0;
  const mythics = useQuery({ ...mythicsQuery(identifier), enabled: hasGames });
  // Held in the history entry, so Back from a game returns to this list, but a shared
  // link never starts the search: that runs only when someone presses the button.
  const location = useLocation();
  const navigate = useNavigate();
  const sort: Sort = location.state?.sort === 'nearest' ? 'nearest' : 'recent';
  const nearest = useQuery({ ...nearestQuery(identifier), enabled: hasGames && sort === 'nearest' });
  if (!valid) return <NotFoundPage />;

  const gamertag = profile.data?.gamertag ?? identifier;
  return (
    <div className={styles.page}>
      <PageHeader
        gamertag={gamertag}
        gamerpicUrl={profile.data?.gamerpicUrl ?? null}
        kicker="Achievements"
        back={{ to: playerPath(identifier), label: 'Back to player' }}
        aside={<MythicCount loading={games.isPending || (hasGames && mythics.isPending)} count={mythics.data?.mythics ?? 0} />}
      />

      {games.isPending ? (
        <>
          <Loading label="Loading their games…" />
          <Skeletons />
        </>
      ) : games.isError ? (
        <ErrorMessage error={games.error} onRetry={() => void games.refetch()} />
      ) : games.data.games.length === 0 ? (
        <p className={styles.empty}>No games to show: this player's game history isn't public.</p>
      ) : (
        <section aria-labelledby="games-heading" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 id="games-heading" className="section-title">
              {sort === 'nearest' ? 'Nearest completion' : 'Recent games'}
            </h2>
            {sort === 'recent' && games.data.limited && <span className={styles.note}>Their last {games.data.games.length} games</span>}
            {sort === 'nearest' && nearest.isPending && (
              <span className="visually-hidden" role="status">
                Searching their whole history
              </span>
            )}
            {sort === 'nearest' && nearest.isSuccess && (
              <span className={styles.note}>{nearest.data.capped ? 'From their last 1,000 games' : 'From their whole history'}</span>
            )}
            <div className={styles.sort} role="group" aria-label="Order games">
              {(
                [
                  ['recent', 'Recent'],
                  ['nearest', 'Nearest completion'],
                ] as [Sort, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={sort === id}
                  className={sort === id ? `${styles.sortButton} ${styles.on}` : styles.sortButton}
                  onClick={() => void navigate(location.pathname, { replace: true, state: { sort: id } })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {sort === 'recent' ? (
            <GameGrid games={games.data.games} identifier={identifier} />
          ) : nearest.isPending ? (
            <Skeletons />
          ) : nearest.isError ? (
            <ErrorMessage error={nearest.error} onRetry={() => void nearest.refetch()} />
          ) : nearest.data.games.length === 0 ? (
            <p className={styles.empty}>No unfinished games to show.</p>
          ) : (
            <GameGrid games={nearest.data.games} identifier={identifier} />
          )}
        </section>
      )}
    </div>
  );
}

function Skeletons() {
  return (
    <ul className={styles.grid} aria-hidden>
      {Array.from({ length: SKELETON_TILES }, (_, i) => (
        <li key={i} className={styles.skeleton} />
      ))}
    </ul>
  );
}

function GameGrid({ games, identifier }: { games: PlayerGame[]; identifier: string }) {
  return (
    <ul className={styles.grid}>
      {games.map((g) => (
        <GameTile key={g.titleId} game={g} to={gameAchievementsPath(identifier, g.titleId)} />
      ))}
    </ul>
  );
}

/**
 * The player's Mythic total. The count can take half a minute on a cold cache,
 * so a placeholder keeps its place. If there are none, or it can't be read, it
 * is left out: the games below are what the page is for.
 */
function MythicCount({ loading, count }: { loading: boolean; count: number }) {
  if (loading) return <span className={styles.countLoading} aria-hidden />;
  if (count === 0) return null;
  return (
    <span className={styles.count}>
      <Laurel size={34} />
      {count} {count === 1 ? 'Mythic' : 'Mythics'}
    </span>
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
        <span className={styles.art} data-loaded={game.imageUrl ? undefined : ''}>
          {game.imageUrl && <img src={storeImage(game.imageUrl, 300)} alt="" loading="lazy" onLoad={markLoaded} onError={hideBroken} />}
          {game.xbox360 && <span className={styles.platform}>Xbox 360</span>}
        </span>
        <span className={styles.nameRow}>
          <span className={styles.gameName}>{game.name}</span>
          {game.mythic && <Laurel size={34} label="Mythic" />}
        </span>
        {game.totalGamerscore > 0 ? (
          <>
            <span className={styles.score}>
              {game.gamerscore.toLocaleString()} <span>/ {game.totalGamerscore.toLocaleString()} G</span>
            </span>
            <span className={game.mythic ? `${styles.bar} ${styles.gold}` : styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Completion">
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
