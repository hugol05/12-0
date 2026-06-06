import { Link } from 'react-router-dom';

// Phase 5: Roll → Pick → Place loop. Placeholder until the data pipeline lands.
export default function BuildPlayer() {
  return (
    <main style={{ padding: 'var(--space-8)' }}>
      <h2>Build Player</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Roll → Pick → Place loop goes here (Phase 5).
      </p>
      <Link to="/">← Home</Link>
    </main>
  );
}
