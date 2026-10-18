import { MostPlayed } from '../components/MostPlayed';
import { SavedPlayers } from '../components/SavedPlayers';
import { SearchBox } from '../components/SearchBox';
import styles from './SearchPage.module.css';

export function SearchPage() {
  return (
    <>
      <section className={styles.hero}>
        <h1>
          Every gamertag has a <span>highlight reel</span>
        </h1>
        <SearchBox />
        <SavedPlayers />
      </section>
      <MostPlayed />
    </>
  );
}
