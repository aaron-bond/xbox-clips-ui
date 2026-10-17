import { SearchBox } from '../components/SearchBox';
import styles from './SearchPage.module.css';

export function SearchPage() {
  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>Xbox game clips</p>
      <h1>
        Watch and share <span className="gradient-text">the best plays</span>
      </h1>
      <p className={styles.lede}>Enter any gamertag to see their latest clips. No sign-in needed.</p>
      <SearchBox />
    </section>
  );
}
