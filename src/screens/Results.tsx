import { Link } from 'react-router-dom';

// Phase 6: shareable Legacy Poster + career archive. Placeholder.
export default function Results() {
  return (
    <main style={{ padding: 'var(--space-8)' }}>
      <h2>Career Summary</h2>
      <p style={{ color: 'var(--text-secondary)' }}>The shareable 12-0 legacy poster (Phase 6).</p>
      <Link to="/">← Home</Link>
    </main>
  );
}
