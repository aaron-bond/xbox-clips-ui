import { MostPlayed } from '../components/MostPlayed';
import { SearchBox } from '../components/SearchBox';
import styles from './SearchPage.module.css';

export function SearchPage() {
  return (
    <>
      <section className={styles.hero}>
        <h1>
          Every gamertag has a <span className="gradient-text">highlight reel</span>
        </h1>
        <SearchBox />
      </section>
      <MostPlayed />
    </>
  );
}
