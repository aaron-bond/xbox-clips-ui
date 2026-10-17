import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { Game } from '../api/types';
import { gamePath, storeImage, storeImageSet } from '../lib/games';
import { mostPlayedQuery } from '../lib/queries';
import styles from './MostPlayed.module.css';

/** How many games the front page shows: the #1 as a hero, then a grid. */
const SHOWN = 12;

/**
 * The front page's "Most played on Xbox" panel. Secondary to search, so if the
 * list cannot load it simply isn't shown.
 */
export function MostPlayed() {
  const { data } = useQuery(mostPlayedQuery());
  const games = data?.games?.slice(0, SHOWN) ?? [];
  if (games.length === 0) return null;
  const [top, ...rest] = games;

  return (
    <section className={styles.section} aria-labelledby="most-played-heading">
      <h2 id="most-played-heading" className={styles.heading}>
        Most played on Xbox
      </h2>
      <HeroTile game={top!} />
      <ul className={styles.grid}>
        {rest.map((game) => (
          <li key={game.productId}>
            <Link to={gamePath(game.productId)} className={styles.tile}>
              <div className={styles.art}>
                {game.boxArtUrl && (
                  <img
                    src={storeImage(game.boxArtUrl, 400)}
                    srcSet={storeImageSet(game.boxArtUrl, [300, 400, 600])}
                    sizes="(max-width: 600px) 45vw, 200px"
                    alt=""
                    loading="lazy"
                  />
                )}
                <span className={styles.rank}>#{game.rank}</span>
              </div>
              <span className={styles.title}>{game.title}</span>
              {game.genres[0] && <span className={styles.genre}>{game.genres[0]}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HeroTile({ game }: { game: Game }) {
  return (
    <Link to={gamePath(game.productId)} className={styles.hero}>
      {game.heroImageUrl && (
        <img
          src={storeImage(game.heroImageUrl, 1280)}
          srcSet={storeImageSet(game.heroImageUrl, [640, 1280, 1920])}
          sizes="(max-width: 1200px) 100vw, 1200px"
          alt=""
          className={styles.heroImage}
        />
      )}
      <div className={styles.heroText}>
        <span className={styles.heroRank}>#1 most played</span>
        <span className={styles.heroTitle}>{game.title}</span>
        {game.genres.length > 0 && <span className={styles.heroGenres}>{game.genres.join(' · ')}</span>}
      </div>
    </Link>
  );
}
