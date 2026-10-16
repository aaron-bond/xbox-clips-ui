import { SearchBox } from '../components/SearchBox';
import styles from './SearchPage.module.css';

export function SearchPage() {
  return (
    <section className={styles.hero}>
      <h1>Watch and share Xbox clips</h1>
      <p>Enter any gamertag to see their latest clips. No sign-in needed.</p>
      <SearchBox />
    </section>
  );
}
