import { Link } from 'react-router-dom';

// Phase 5: assembled player + radar chart. Placeholder.
export default function Preview() {
  return (
    <main style={{ padding: 'var(--space-8)' }}>
      <h2>Player Preview</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Radar chart + assembled silhouette (Phase 5).</p>
      <Link to="/">← Home</Link>
    </main>
  );
}
