import type { ReactNode } from 'react';
import type { Clip, PlayerProfile } from '../api/types';
import { daysAgo, latestRecordedAt, reelLength, reputationLabel, tenureLabel } from '../lib/stats';
import styles from './PlayerCard.module.css';

/**
 * The player's card beside the replay: four stats chosen to read well with
 * real numbers (PLAN-v1.md §3).
 */
export function PlayerCard({ profile, clips, children }: { profile: PlayerProfile; clips: Clip[]; children?: ReactNode }) {
  const last = latestRecordedAt(clips);
  const identity = [tenureLabel(profile.tenureYears), profile.location].filter(Boolean);
  const reputation = reputationLabel(profile.reputation);
  const stats = [
    { label: 'Gamerscore', value: profile.gamerscore.toLocaleString() },
    { label: 'Clips', value: String(clips.length) },
    { label: 'Last clip', value: last ? daysAgo(last) : '–' },
    { label: 'Reel length', value: reelLength(clips) },
  ];

  return (
    <section className={styles.card} aria-label="Player card">
      <div className={styles.who}>
        {profile.gamerpicUrl ? (
          <img src={profile.gamerpicUrl} alt="" width={64} height={64} className={styles.pic} />
        ) : (
          <span className={styles.pic} aria-hidden />
        )}
        <div className={styles.identity}>
          <h1 className={styles.name}>{profile.gamertag}</h1>
          <span className={styles.kicker}>
            {reputation && <span className={styles.rep}>{reputation}</span>}
            {identity.length > 0 ? identity.join(' · ') : !reputation && 'Player card'}
          </span>
        </div>
      </div>
      {profile.bio && <p className={styles.bio}>“{profile.bio}”</p>}
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}
