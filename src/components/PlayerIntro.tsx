import { useEffect, useState } from 'react';
import type { PlayerProfile } from '../api/types';
import { reputationLabel, tenureLabel } from '../lib/stats';
import { prefersReducedMotion } from '../lib/useIntroGate';
import styles from './PlayerIntro.module.css';

/** Counts up to `target` with an ease-out, or shows it at once under reduced motion. */
function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return setValue(target);
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function Gamerscore({ value }: { value: number }) {
  const shown = useCountUp(value);
  return (
    <div className={styles.score}>
      <span className={styles.g}>G</span>
      <span className={styles.number}>{shown.toLocaleString()}</span>
      <span className={styles.scoreLabel}>Gamerscore</span>
    </div>
  );
}

/**
 * The player intro: a name strap that covers a slow load, filling in as the
 * profile arrives, then wiping away to reveal the page (PLAN-v1.md §12).
 * `name` is the gamertag from the URL, so the strap can show before any data;
 * null when the URL holds an XUID.
 */
export function PlayerIntro({ name, profile, leaving }: { name: string | null; profile?: PlayerProfile; leaving: boolean }) {
  const title = profile?.gamertag ?? name;
  const reputation = reputationLabel(profile?.reputation);
  const tenure = tenureLabel(profile?.tenureYears);
  const details = profile && (reputation || tenure);

  return (
    <div className={leaving ? `${styles.intro} ${styles.leaving}` : styles.intro} role="status">
      <span className="visually-hidden">{title ? `Loading ${title}'s reel` : 'Loading the reel'}</span>
      <div className={styles.backdrop} aria-hidden />
      <div className={styles.stage} aria-hidden>
        <div className={styles.who}>
          {profile?.gamerpicUrl ? (
            <img src={profile.gamerpicUrl} alt="" width={132} height={132} className={styles.pic} />
          ) : (
            <span className={styles.slot} />
          )}
          <div className={styles.strap}>
            {title && <span className={styles.title}>{title}</span>}
            {details ? (
              <span key="details" className={styles.sub}>
                {reputation && <span className={styles.rep}>{reputation}</span>}
                {tenure}
              </span>
            ) : (
              <span key="loading" className={`${styles.sub} ${styles.loading}`}>
                Now loading the reel
              </span>
            )}
          </div>
        </div>
        {/* The row is reserved before the profile lands, so the strap never shifts. */}
        <div className={styles.scoreRow}>{profile && <Gamerscore value={profile.gamerscore} />}</div>
      </div>
      {leaving && (
        <>
          <span className={styles.wipeBlue} aria-hidden />
          <span className={styles.wipeOrange} aria-hidden />
        </>
      )}
    </div>
  );
}
