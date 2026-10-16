import { Link, Outlet } from 'react-router';
import { SearchBox } from './SearchBox';
import styles from './Layout.module.css';

export function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          xbox<span>clips</span>
        </Link>
        <SearchBox compact />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
