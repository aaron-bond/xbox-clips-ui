import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section style={{ textAlign: 'center', padding: '48px 16px' }}>
      <h1 className="section-title" style={{ justifyContent: 'center' }}>
        Page not found
      </h1>
      <p>
        <Link to="/" className="btn-primary" style={{ marginTop: 16 }}>
          Search for a player
        </Link>
      </p>
    </section>
  );
}
