import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { InstallLink } from './Install';
import { SearchBox } from './SearchBox';
import { Ticker } from './Ticker';
import styles from './Layout.module.css';

export function Layout() {
  // The home page has its own large search box; the header's would duplicate it.
  const isHome = useLocation().pathname === '/';
  return (
    <div className={styles.shell}>
      <Ticker />
      <header className={styles.header}>
        <Link to="/" className={styles.brand} aria-label="Xbox Clips home">
          XBOX<span>CLIPS</span>
        </Link>
        {!isHome && <SearchBox compact />}
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>Not affiliated with or endorsed by Microsoft. Xbox is a trademark of the Microsoft group of companies.</p>
        <p className={styles.install}>
          <InstallLink />
        </p>
      </footer>
      {/* New pages open at the top; Back returns to where the visitor was. */}
      <ScrollRestoration />
    </div>
  );
}
