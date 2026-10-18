import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { CareerGame, CareerStats as Stats, Clip } from '../api/types';
import { gameAchievementsPath } from '../lib/format';
import { storeImage } from '../lib/games';
import { daysAgo, mostClipped } from '../lib/stats';
import styles from './CareerStats.module.css';

/**
 * The player page's stat sheet (PLAN-v1.md §11, P4): three facts from the
 * player's most recent games and one from the clips already on the page. Each
 * card opens the player's achievements in that game.
 */
export function CareerStats({ stats, clips, identifier }: { stats: Stats; clips: Clip[]; identifier: string }) {
  const to = (titleId: string | number) => gameAchievementsPath(identifier, titleId);
  const clipped = mostClipped(clips);
  const { nowPlaying, biggestHaul, onTheBrink } = stats;
  if (!nowPlaying && !biggestHaul && !onTheBrink) return null;

  return (
    <section className={styles.section} aria-labelledby="career-heading">
      <div className={styles.head}>
        <h2 id="career-heading" className="section-title">
          Career stats
        </h2>
        {stats.limited && <span className={styles.note}>From their last {stats.gamesCounted} games</span>}
      </div>

      {nowPlaying && (
        <div className={`${styles.now} ${styles.linked}`}>
          <GameArt game={nowPlaying} size={132} />
          <div className={styles.nowText}>
            <span className="badge">Now playing</span>
            <Link to={to(nowPlaying.titleId)} className={styles.cardLink}>
              <strong className={styles.nowTitle}>{nowPlaying.name}</strong>
            </Link>
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
          <GameCard label="Biggest haul" game={biggestHaul} to={to(biggestHaul.titleId)}>
            {biggestHaul.percent}% complete
            {biggestHaul.lastPlayed && ` · last played ${new Date(biggestHaul.lastPlayed).getFullYear()}`}
          </GameCard>
        )}
        {onTheBrink && (
          <GameCard label="On the brink" game={onTheBrink} to={to(onTheBrink.titleId)}>
            {onTheBrink.percent}% complete · {(onTheBrink.totalGamerscore - onTheBrink.gamerscore).toLocaleString()} G to
            go
          </GameCard>
        )}
        {clipped && (
          <div className={clipped.latest.titleId !== null ? `${styles.card} ${styles.linked}` : styles.card}>
            <span className={styles.label}>Most clipped</span>
            <div className={styles.gameRow}>
              <ClippedArt clip={clipped.latest} career={[nowPlaying, biggestHaul, onTheBrink]} />
              <div className={styles.gameText}>
                {clipped.latest.titleId !== null ? (
                  <Link to={to(clipped.latest.titleId)} className={styles.cardLink}>
                    <strong className={styles.cardTitle}>{clipped.game}</strong>
                  </Link>
                ) : (
                  <strong className={styles.cardTitle}>{clipped.game}</strong>
                )}
                <span className={styles.meta}>
                  {clipped.count} {clipped.count === 1 ? 'clip' : 'clips'}
                  {clipped.tiedWith.length > 0 && ` · tied with ${clipped.tiedWith.join(', ')}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Holds the section's place while the facts load, so the page doesn't jump. */
export function CareerStatsPlaceholder() {
  return (
    <section className={styles.section} aria-labelledby="career-heading" aria-busy="true">
      <div className={styles.head}>
        <h2 id="career-heading" className="section-title">
          Career stats
        </h2>
      </div>
      <div className={`${styles.now} ${styles.skeleton}`} style={{ height: 170 }} />
      <div className={styles.cards}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${styles.card} ${styles.skeleton}`} style={{ height: 180 }} />
        ))}
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

/**
 * Clips carry no game art. If the game is one of the career facts, its box art
 * is used; otherwise a frame from its latest clip (thumbnails are stable URLs).
 */
function ClippedArt({ clip, career }: { clip: Clip; career: (CareerGame | null)[] }) {
  const game = career.find((g) => g && clip.titleId !== null && g.titleId === String(clip.titleId));
  if (game?.imageUrl) return <GameArt game={game} size={64} />;
  return clip.thumbnailUrl ? (
    <img src={clip.thumbnailUrl} alt="" width={64} height={64} loading="lazy" className={styles.art} />
  ) : (
    <span className={styles.art} style={{ width: 64, height: 64 }} aria-hidden />
  );
}

function GameCard({ label, game, to, children }: { label: string; game: CareerGame; to: string; children: ReactNode }) {
  return (
    <div className={`${styles.card} ${styles.linked}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.gameRow}>
        <GameArt game={game} size={64} />
        <div className={styles.gameText}>
          <Link to={to} className={styles.cardLink}>
            <strong className={styles.cardTitle}>{game.name}</strong>
          </Link>
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
