import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { Difficulty } from '@/types';
import { useGameStore } from '@/store/gameStore';
import './Home.css';

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'See every rating + stats. Strategic and transparent.' },
  { value: 'normal', label: 'Normal', hint: 'OVR + box stats. Ratings revealed when you assign.' },
  { value: 'hard', label: 'Hard', hint: 'Name, position, team & era only. Ball-knowledge flex.' },
];

export default function Home() {
  const navigate = useNavigate();
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const reset = useGameStore((s) => s.reset);
  const [howToOpen, setHowToOpen] = useState(false);

  function start() {
    reset();
    setDifficulty(difficulty);
    navigate('/build');
  }

  return (
    <main className="home">
      <div className="home__hero">
        <h1 className="home__logo">12&ndash;0</h1>
        <p className="home__tagline">Can you break Bill Russell&rsquo;s record?</p>
      </div>

      <div className="home__controls">
        <div className="home__difficulty" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              role="radio"
              aria-checked={difficulty === d.value}
              className={`pill ${difficulty === d.value ? 'pill--active' : ''}`}
              onClick={() => setDifficulty(d.value)}
              title={d.hint}
            >
              {d.label}
            </button>
          ))}
        </div>

        <button className="cta" onClick={start}>
          Build Your Legend
        </button>

        <button className="home__teaser" disabled title="Coming in v1.5">
          🕰️ Rewriting History &mdash; Coming Soon
        </button>
      </div>

      <button className="home__howto-toggle" onClick={() => setHowToOpen((v) => !v)}>
        How to play {howToOpen ? '▲' : '▼'}
      </button>
      {howToOpen && (
        <div className="home__howto">
          <p>
            Roll a <strong>franchise + decade</strong>, pick a real player, and assign them to one of
            9 attribute categories. Fill all 9 and choose your starting franchise across 10 rolls,
            then simulate an entire career and see if you can go <strong>12&ndash;0</strong> in the
            Finals.
          </p>
        </div>
      )}
    </main>
  );
}
