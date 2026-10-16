import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section style={{ textAlign: 'center', padding: '48px 0' }}>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Search for a player</Link>
      </p>
    </section>
  );
}
