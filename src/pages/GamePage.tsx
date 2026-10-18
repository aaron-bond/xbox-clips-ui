import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { Screenshots, ScreenshotsPlaceholder } from '../components/Screenshots';
import { SearchBox } from '../components/SearchBox';
import { formatDate } from '../lib/format';
import { gamePath, platformLabels, showRating, storeImage, storeImageSet } from '../lib/games';
import { gameQuery, mostPlayedQuery, screenshotsQuery } from '../lib/queries';
import { isProductId } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './GamePage.module.css';

interface Stat {
  label: string;
  value: string;
  note?: string;
  small?: boolean;
}

/**
 * A game from the most-played list (PLAN-v1.md §12, step 6). Store information
 * only: there is no way to fetch clips by game, so the page points visitors to
 * player search instead.
 */
export function GamePage() {
  const productId = useParams().productId ?? '';
  const valid = isProductId(productId);
  const queryClient = useQueryClient();
  const game = useQuery({ ...gameQuery(queryClient, productId), enabled: valid });
  const ranking = useQuery(mostPlayedQuery());
  // Secondary: a placeholder holds its place while loading; with no screenshots,
  // or if they fail to load, the section is left out.
  const screenshots = useQuery({ ...screenshotsQuery(productId), enabled: valid && game.isSuccess });

  if (!valid) return <NotFoundPage />;
  if (game.isPending) return <p className={styles.loading}>Loading game…</p>;
  if (game.isError) return <ErrorMessage error={game.error} />;

  const g = game.data;
  const also = (ranking.data?.games ?? []).filter((x) => x.productId !== g.productId).slice(0, 4);
  const candidates: (Stat | null)[] = [
    g.releaseDate ? { label: 'Released', value: formatDate(g.releaseDate) } : null,
    showRating(g) ? { label: 'Rating', value: `★ ${g.rating!.toFixed(1)}`, note: `${g.ratingCount.toLocaleString()} ratings` } : null,
    g.genres[0] ? { label: 'Genre', value: g.genres[0] } : null,
    g.platforms.length ? { label: 'Plays on', value: platformLabels(g).join(' · '), small: true } : null,
  ];
  const stats = candidates.filter((s): s is Stat => s !== null);
  const shots = screenshots.data?.screenshots ?? [];

  return (
    <article className={styles.page}>
      <header className={styles.banner}>
        {g.heroImageUrl && (
          <img
            src={storeImage(g.heroImageUrl, 1600)}
            srcSet={storeImageSet(g.heroImageUrl, [800, 1600, 2400])}
            sizes="(max-width: 1280px) 100vw, 1200px"
            alt=""
            className={styles.bannerImage}
          />
        )}
        <span className={styles.badges}>
          <span className="badge">No. {g.rank}</span>
          <span className="badge badge-dark">Most played on Xbox</span>
        </span>
        <div className={`strap ${styles.strap}`}>
          <h1 className="strap-title">{g.title}</h1>
          {(g.developer || g.publisher) && (
            <span className="strap-sub">{[g.developer, g.publisher].filter(Boolean).join(' · ')}</span>
          )}
        </div>
      </header>

      {stats.length > 0 && (
        <dl className={styles.stats}>
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd className={s.small ? styles.small : undefined}>
                {s.value} {s.note && <span>{s.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {screenshots.isPending ? (
        <div className={styles.screenshots}>
          <ScreenshotsPlaceholder />
        </div>
      ) : (
        shots.length > 0 && (
          <div className={styles.screenshots}>
            <Screenshots shots={shots} />
          </div>
        )
      )}

      <div className={styles.body}>
        <div className={styles.main}>
          {g.description && <p className={styles.description}>{g.description}</p>}
          {also.length > 0 && (
            <section className={styles.also} aria-labelledby="also-heading">
              <h2 id="also-heading" className="section-title">
                Also most played
              </h2>
              <ol className={styles.alsoRow}>
                {also.map((x) => (
                  <li key={x.productId}>
                    <Link to={gamePath(x.productId)} className={styles.alsoTile}>
                      <span className={styles.alsoArt}>
                        {x.boxArtUrl && <img src={storeImage(x.boxArtUrl, 300)} alt="" loading="lazy" />}
                        <span className={styles.rank}>{x.rank}</span>
                      </span>
                      <span className={styles.alsoTitle}>{x.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
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
