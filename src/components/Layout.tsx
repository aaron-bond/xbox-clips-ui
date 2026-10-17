import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { SearchBox } from './SearchBox';
import styles from './Layout.module.css';

export function Layout() {
  // The home page has its own large search box; the header's would duplicate it.
  const isHome = useLocation().pathname === '/';
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.xbox}>xbox</span>
          <span className={styles.clips}>clips</span>
        </Link>
        {!isHome && <SearchBox compact />}
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      {/* New pages open at the top; Back returns to where the visitor was. */}
      <ScrollRestoration />
    </div>
  );
}
