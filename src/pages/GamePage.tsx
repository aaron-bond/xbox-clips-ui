import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { SearchBox } from '../components/SearchBox';
import { platformLabels, releaseYear, showRating, storeImage, storeImageSet } from '../lib/games';
import { gameQuery } from '../lib/queries';
import { isProductId } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './GamePage.module.css';

/**
 * A game from the most-played list. Store information only: there is no way to
 * fetch clips by game, so the page points visitors to player search instead
 * (PLAN-v1.md §11, P1).
 */
export function GamePage() {
  const productId = useParams().productId ?? '';
  const valid = isProductId(productId);
  const queryClient = useQueryClient();
  const game = useQuery({ ...gameQuery(queryClient, productId), enabled: valid });

  if (!valid) return <NotFoundPage />;
  if (game.isPending) return <p className={styles.loading}>Loading game…</p>;
  if (game.isError) return <ErrorMessage error={game.error} />;

  const g = game.data;
  const year = releaseYear(g);
  const meta = [g.developer, year, ...platformLabels(g)].filter(Boolean);

  return (
    <article className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Most played
      </Link>
      <header className={styles.banner}>
        {g.heroImageUrl && (
          <img
            src={storeImage(g.heroImageUrl, 1600)}
            srcSet={storeImageSet(g.heroImageUrl, [800, 1600, 2400])}
            sizes="(max-width: 1100px) 100vw, 1100px"
            alt=""
            className={styles.bannerImage}
          />
        )}
        <div className={styles.bannerText}>
          <span className={styles.rank}>#{g.rank} most played on Xbox</span>
          <h1 className={styles.title}>{g.title}</h1>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.main}>
          {g.genres.length > 0 && (
            <ul className={styles.genres} aria-label="Genres">
              {g.genres.map((genre) => (
                <li key={genre}>{genre}</li>
              ))}
            </ul>
          )}
          <p className={styles.meta}>
            {meta.join(' · ')}
            {showRating(g) && (
              <span className={styles.rating}>
                {' · '}★ {g.rating!.toFixed(1)} <span>({g.ratingCount.toLocaleString()} ratings)</span>
              </span>
            )}
          </p>
          {g.description && <p className={styles.description}>{g.description}</p>}
        </div>

        <aside className={styles.cta}>
          <h2>Find clips from this game</h2>
          <p>Look up a player to browse their clips.</p>
          <SearchBox />
        </aside>
      </div>
    </article>
  );
}
