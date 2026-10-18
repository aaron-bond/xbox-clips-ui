import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Clip, PlayerProfile } from '../api/types';
import { achievementsPath } from '../lib/format';
import { daysAgo, latestRecordedAt, reputationLabel, tenureLabel } from '../lib/stats';
import { MAX_PINNED, togglePin, useSavedPlayers } from '../lib/savedPlayers';
import styles from './PlayerCard.module.css';

/**
 * The player's card beside the replay: three stats chosen to read well with
 * real numbers (PLAN-v1.md §3), and a tile leading to their achievements.
 * `profile` is null when Xbox is throttling profile calls: the card then shows
 * what the clips say, under `gamertag`. `identifier` is the player's gamertag or
 * XUID, for links.
 */
export function PlayerCard({
  profile,
  gamertag,
  identifier,
  clips,
  children,
}: {
  profile: PlayerProfile | null;
  gamertag: string;
  identifier: string;
  clips: Clip[];
  children?: ReactNode;
}) {
  const last = latestRecordedAt(clips);
  const identity = [tenureLabel(profile?.tenureYears), profile?.location].filter(Boolean);
  const reputation = reputationLabel(profile?.reputation);
  const stats = [
    { label: 'Gamerscore', value: profile ? profile.gamerscore.toLocaleString() : '–' },
    { label: 'Clips', value: String(clips.length) },
    { label: 'Last clip', value: last ? daysAgo(last) : '–' },
  ];

  return (
    <section className={styles.card} aria-label="Player card">
      <div className={styles.who}>
        {profile?.gamerpicUrl ? (
          <img src={profile.gamerpicUrl} alt="" width={64} height={64} className={styles.pic} />
        ) : (
          <span className={styles.pic} aria-hidden />
        )}
        <div className={styles.identity}>
          <h1 className={styles.name}>{gamertag}</h1>
          <span className={styles.kicker}>
            {reputation && <span className={styles.rep}>{reputation}</span>}
            {!profile ? 'Profile details unavailable right now' : identity.length > 0 ? identity.join(' · ') : !reputation && 'Player card'}
          </span>
        </div>
        {profile && <PinButton profile={profile} />}
      </div>
      {profile?.bio && <p className={styles.bio}>“{profile.bio}”</p>}
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
        <div className={`${styles.stat} ${styles.statLink}`}>
          <dt>Achievements</dt>
          <dd>
            <Link to={achievementsPath(identifier)} className={styles.statAnchor}>
              See games <span aria-hidden>›</span>
            </Link>
          </dd>
        </div>
      </dl>
      {children}
    </section>
  );
}

/** Pins the player to the home page and the search list, on this device only. */
function PinButton({ profile }: { profile: PlayerProfile }) {
  const { pinned } = useSavedPlayers();
  const on = pinned.some((p) => p.xuid === profile.xuid);
  const full = !on && pinned.length >= MAX_PINNED;
  return (
    <button
      type="button"
      className={on ? `${styles.pin} ${styles.pinOn}` : styles.pin}
      aria-pressed={on}
      disabled={full}
      title={full ? `Unpin someone first: up to ${MAX_PINNED} players can be pinned` : undefined}
      onClick={() => togglePin({ xuid: profile.xuid, gamertag: profile.gamertag, gamerpicUrl: profile.gamerpicUrl })}
    >
      <span aria-hidden>{on ? '★' : '☆'}</span> {on ? 'Pinned' : 'Pin'}
    </button>
  );
}
