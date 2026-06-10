/**
 * LoadingScreen — the branded fallback shown while a lazy route chunk and/or the
 * roster data are still loading. Replaces the old blank/black screen on the
 * Home→Build hand-off with an on-brand animated mark, so the wait reads as
 * intentional rather than broken.
 *
 * Pure CSS animation (no JS, no deps) so it can paint instantly as a Suspense
 * fallback before any screen code has loaded.
 */
import './LoadingScreen.css';

export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <main className="loading" role="status" aria-live="polite">
      <div className="loading__mark" aria-hidden>
        <span className="loading__ring" />
        <span className="loading__ring loading__ring--2" />
        <span className="loading__logo">12&ndash;0</span>
      </div>
      <p className="loading__msg">{message}</p>
    </main>
  );
}
