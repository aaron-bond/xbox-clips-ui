import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { Game } from '../api/types';
import { gamePath, storeImage, storeImageSet } from '../lib/games';
import { mostPlayedQuery } from '../lib/queries';
import styles from './MostPlayed.module.css';

/** How many games the front page shows: the #1 as a feature, then ranks 2-12. */
const SHOWN = 12;

/**
 * The front page's "Most played on Xbox" section. Secondary to search, so if
 * the list cannot load it simply isn't shown.
 */
export function MostPlayed() {
  const { data } = useQuery(mostPlayedQuery());
  const games = data?.games?.slice(0, SHOWN) ?? [];
  if (games.length === 0) return null;
  const [top, ...rest] = games;

  return (
    <section className={styles.section} aria-labelledby="most-played-heading">
      <h2 id="most-played-heading" className="section-title">
        Most played on Xbox
      </h2>
      <Feature game={top!} />
      <ol className={styles.row}>
        {rest.map((game) => (
          <li key={game.productId}>
            <Link to={gamePath(game.productId)} className={styles.tile}>
              <span className={styles.art}>
                {game.boxArtUrl && (
                  <img
                    src={storeImage(game.boxArtUrl, 400)}
                    srcSet={storeImageSet(game.boxArtUrl, [300, 400, 600])}
                    sizes="(max-width: 720px) 136px, 190px"
                    alt=""
                    loading="lazy"
                  />
                )}
                <span className={styles.rank}>{game.rank}</span>
              </span>
              <span className={styles.title}>{game.title}</span>
              {game.genres[0] && <span className={styles.genre}>{game.genres[0]}</span>}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Feature({ game }: { game: Game }) {
  const sub = [game.genres.slice(0, 2).join(' · '), game.developer].filter(Boolean).join(' · ');
  return (
    <Link to={gamePath(game.productId)} className={styles.feature}>
      {game.heroImageUrl && (
        <img
          src={storeImage(game.heroImageUrl, 1280)}
          srcSet={storeImageSet(game.heroImageUrl, [640, 1280, 1920])}
          sizes="(max-width: 1280px) 100vw, 1200px"
          alt=""
          className={styles.featureImage}
        />
      )}
      <span className={`badge ${styles.featureBadge}`}>No. 1 this week</span>
      <span className={`strap ${styles.featureStrap}`}>
        <span className="strap-title">{game.title}</span>
        {sub && <span className="strap-sub">{sub}</span>}
      </span>
    </Link>
  );
}
