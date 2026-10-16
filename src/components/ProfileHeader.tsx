import type { PlayerProfile } from '../api/types';
import styles from './ProfileHeader.module.css';

export function ProfileHeader({ profile }: { profile: PlayerProfile }) {
  return (
    <section className={styles.header}>
      {profile.gamerpicUrl ? (
        <img src={profile.gamerpicUrl} alt="" className={styles.pic} width={72} height={72} />
      ) : (
        <div className={styles.pic} aria-hidden />
      )}
      <div>
        <h1 className={styles.name}>{profile.gamertag}</h1>
        <p className={styles.score}>{profile.gamerscore.toLocaleString()} Gamerscore</p>
      </div>
    </section>
  );
}
