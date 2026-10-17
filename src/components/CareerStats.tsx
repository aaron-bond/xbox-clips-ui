import type { ReactNode } from 'react';
import type { CareerGame, CareerStats as Stats, Clip } from '../api/types';
import { storeImage } from '../lib/games';
import { daysAgo, mostClipped } from '../lib/stats';
import styles from './CareerStats.module.css';

/**
 * The player page's stat sheet (PLAN-v1.md §11, P4): four facts from the title
 * history and one from the clips already on the page.
 */
export function CareerStats({ stats, clips }: { stats: Stats; clips: Clip[] }) {
  const clipped = mostClipped(clips);
  const { nowPlaying, biggestHaul, onTheBrink, platforms } = stats;
  if (!nowPlaying && !biggestHaul && !onTheBrink && platforms.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="career-heading">
      <div className={styles.head}>
        <h2 id="career-heading" className="section-title">
          Career stats
        </h2>
        {stats.capped && <span className={styles.note}>From their last 1,000 games on Xbox</span>}
      </div>

      {nowPlaying && (
        <div className={styles.now}>
          <GameArt game={nowPlaying} size={132} />
          <div className={styles.nowText}>
            <span className="badge">Now playing</span>
            <strong className={styles.nowTitle}>{nowPlaying.name}</strong>
            <span className={styles.meta}>
              {nowPlaying.lastPlayed ? `Last played ${daysAgo(nowPlaying.lastPlayed).toLowerCase()}` : 'Recently played'}
              {nowPlaying.totalGamerscore > 0 && ` · ${nowPlaying.gamerscore.toLocaleString()} / ${nowPlaying.totalGamerscore.toLocaleString()} G`}
            </span>
            {nowPlaying.totalGamerscore > 0 && <Progress percent={nowPlaying.percent} />}
          </div>
        </div>
      )}

      <div className={styles.cards}>
        {biggestHaul && (
          <GameCard label="Biggest haul" game={biggestHaul}>
            {biggestHaul.percent}% complete
            {biggestHaul.lastPlayed && ` · last played ${new Date(biggestHaul.lastPlayed).getFullYear()}`}
          </GameCard>
        )}
        {onTheBrink && (
          <GameCard label="On the brink" game={onTheBrink}>
            {onTheBrink.percent}% complete · {(onTheBrink.totalGamerscore - onTheBrink.gamerscore).toLocaleString()} G to
            go
          </GameCard>
        )}
        {platforms.length > 0 && (
          <div className={styles.card}>
            <span className={styles.label}>Generations</span>
            <strong className={styles.cardTitle}>
              {platforms.length === 1 ? 'One platform' : `${['', '', 'Two', 'Three', 'Four'][platforms.length]} platforms`}
            </strong>
            <ul className={styles.platforms}>
              {platforms.map((p) => (
                <li key={p.platform}>
                  <span>{p.platform}</span>
                  <span>
                    {p.games.toLocaleString()} {p.games === 1 ? 'game' : 'games'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {clipped && (
          <div className={styles.card}>
            <span className={styles.label}>Most clipped</span>
            <strong className={styles.cardTitle}>{clipped.game}</strong>
            <span className={styles.meta}>
              {clipped.count} {clipped.count === 1 ? 'clip' : 'clips'}
              {clipped.tiedWith.length > 0 && ` · tied with ${clipped.tiedWith.join(', ')}`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function GameArt({ game, size }: { game: CareerGame; size: number }) {
  return game.imageUrl ? (
    <img src={storeImage(game.imageUrl, size * 2)} alt="" width={size} height={size} className={styles.art} />
  ) : (
    <span className={styles.art} style={{ width: size, height: size }} aria-hidden />
  );
}

function GameCard({ label, game, children }: { label: string; game: CareerGame; children: ReactNode }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <div className={styles.gameRow}>
        <GameArt game={game} size={64} />
        <div className={styles.gameText}>
          <strong className={styles.cardTitle}>{game.name}</strong>
          <span className={styles.meta}>
            {game.gamerscore.toLocaleString()} / {game.totalGamerscore.toLocaleString()} G
          </span>
        </div>
      </div>
      <Progress percent={game.percent} />
      <span className={styles.meta}>{children}</span>
    </div>
  );
}

function Progress({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <span className={styles.bar} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Completion">
      <span style={{ width: `${value}%` }} />
    </span>
  );
}
