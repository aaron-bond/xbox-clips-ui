import type { PlayerProfile } from '../api/types';
import styles from './ProfileHeader.module.css';

export function ProfileHeader({ profile }: { profile: PlayerProfile }) {
  return (
    <section className={styles.banner}>
      <div className={styles.ring}>
        {profile.gamerpicUrl ? (
          <img src={profile.gamerpicUrl} alt="" className={styles.pic} width={84} height={84} />
        ) : (
          <div className={styles.pic} aria-hidden />
        )}
      </div>
      <div className={styles.text}>
        <h1 className={styles.name}>{profile.gamertag}</h1>
        <p className={styles.score}>
          <span className={styles.g} aria-hidden>
            G
          </span>
          {profile.gamerscore.toLocaleString()} <span className={styles.label}>Gamerscore</span>
        </p>
      </div>
    </section>
  );
}
