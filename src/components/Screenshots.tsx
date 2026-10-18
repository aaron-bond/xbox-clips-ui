import { useState } from 'react';
import type { Screenshot } from '../api/types';
import { storeImage, storeImageSet } from '../lib/games';
import styles from './Screenshots.module.css';

/** Thumbnails beside the featured screenshot on wide screens. */
const THUMBS = 3;

/**
 * A game's store screenshots (PLAN-v1.md §11, P6). Wide screens show one large
 * screenshot with the next few as thumbnails; phones get a row to swipe. A
 * caption, when the store has one, is both the alt text and the caption bar.
 */
export function Screenshots({ shots }: { shots: Screenshot[] }) {
  const [index, setIndex] = useState(0);
  const total = shots.length;
  const go = (n: number) => setIndex(((n % total) + total) % total);
  const current = shots[index]!;
  const thumbs = Array.from({ length: Math.min(THUMBS, total - 1) }, (_, k) => (index + 1 + k) % total);
  const more = total - 1 - thumbs.length;

  return (
    <section className={styles.section} aria-labelledby="screenshots-heading">
      <h2 id="screenshots-heading" className="section-title">
        Screenshots <span className={styles.count}>{total} from the Xbox Store</span>
      </h2>

      <div className={total > 1 ? styles.wide : `${styles.wide} ${styles.single}`}>
        <figure className={styles.featured}>
          <img
            key={current.url}
            src={storeImage(current.url, 1280)}
            srcSet={storeImageSet(current.url, [800, 1280, 1920])}
            sizes="(max-width: 1280px) 75vw, 900px"
            alt={current.caption ?? ''}
            loading="lazy"
          />
          <span className={styles.badges} aria-live="polite">
            <span className="badge">Screenshot</span>
            <span className="badge badge-dark">
              {index + 1} / {total}
            </span>
          </span>
          {total > 1 && (
            <>
              <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => go(index - 1)} aria-label="Previous screenshot">
                ‹
              </button>
              <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => go(index + 1)} aria-label="Next screenshot">
                ›
              </button>
            </>
          )}
          {current.caption && <figcaption className={styles.caption}>{current.caption}</figcaption>}
        </figure>
        {thumbs.length > 0 && (
          <ul className={styles.thumbs}>
            {thumbs.map((n) => (
              <li key={shots[n]!.url}>
                <button type="button" className={styles.thumb} onClick={() => go(n)} aria-label={`Show screenshot ${n + 1}${shots[n]!.caption ? `: ${shots[n]!.caption}` : ''}`}>
                  <img src={storeImage(shots[n]!.url, 480)} alt="" loading="lazy" />
                </button>
              </li>
            ))}
            {more > 0 && (
              <li>
                <button type="button" className={styles.more} onClick={() => go(index + THUMBS + 1)}>
                  +{more} more
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <ul className={styles.row}>
        {shots.map((s, n) => (
          <li key={s.url}>
            <span className={styles.rowImage}>
              <img src={storeImage(s.url, 640)} alt={s.caption ?? ''} loading="lazy" />
              <span className={styles.chip}>
                {n + 1} / {total}
              </span>
            </span>
            {s.caption && <span className={styles.rowCaption}>{s.caption}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Holds the section's place while the screenshots load. */
export function ScreenshotsPlaceholder() {
  return <div className={styles.placeholder} aria-hidden />;
}
