import type { ReactNode } from 'react';
import type { Clip, PlayerProfile } from '../api/types';
import { formatDate } from '../lib/format';
import { daysAgo, latestRecordedAt, nextToExpire, reelLength } from '../lib/stats';
import styles from './PlayerCard.module.css';

/**
 * The player's card beside the replay: four stats chosen to read well with
 * real numbers (PLAN-v1.md §3), and a notice when a clip is about to leave Xbox.
 */
export function PlayerCard({ profile, clips, children }: { profile: PlayerProfile; clips: Clip[]; children?: ReactNode }) {
  const last = latestRecordedAt(clips);
  const expiring = nextToExpire(clips);
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
        <div>
          <h1 className={styles.name}>{profile.gamertag}</h1>
          <span className={styles.kicker}>Player card</span>
        </div>
      </div>
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      {expiring && (
        <p className={styles.notice}>
          {expiring.gameTitle || 'A clip'} leaves Xbox around {formatDate(expiring.availableUntil)}. Clips are deleted
          about 90 days after upload.
        </p>
      )}
      {children}
    </section>
  );
}
