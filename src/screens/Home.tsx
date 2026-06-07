import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, Lock } from 'lucide-react';
import type { Difficulty } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { PlayerSilhouette } from '@/components/PlayerSilhouette';
import { Onboarding, hasSeenOnboarding } from '@/components/Onboarding';
import { cardReveal, staggerContainer } from '@/lib/motion';
import './Home.css';

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'See every rating + stats. Strategic and transparent.' },
  { value: 'normal', label: 'Normal', hint: 'OVR + box stats. Ratings revealed when you assign.' },
  { value: 'hard', label: 'Hard', hint: 'Name, position, team & era only. Ball-knowledge flex.' },
];

// A flattering, fully-lit teaser build so the centerpiece reads as a finished
// legend on the landing screen. (The live build-up happens on the Build screen.)
const HOME_FILL = {
  shooting: 92,
  playmaking: 78,
  defense: 82,
  clutch: 95,
  athleticism: 86,
  rebounding: 80,
  height: 84,
  basketballIq: 88,
};

// Ambient floating-gold-particle field. Deterministic so there's no layout shift
// and SSR/screenshot output is stable; CSS drives the motion (see Home.css).
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 53) % 100,
  size: 2 + (i % 3),
  delay: -((i * 1.37) % 9),
  duration: 9 + (i % 6),
  drift: (i % 2 ? 1 : -1) * (8 + (i % 4) * 6),
  opacity: 0.35 + (i % 4) * 0.15,
}));

export default function Home() {
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const reset = useGameStore((s) => s.reset);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());

  function start() {
    reset();
    setDifficulty(difficulty);
    navigate('/build');
  }

  return (
    <main className="home">
      <div className="home__particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="home__particle"
            style={
              {
                left: `${p.left}%`,
                '--p-size': `${p.size}px`,
                '--p-delay': `${p.delay}s`,
                '--p-dur': `${p.duration}s`,
                '--p-drift': `${p.drift}px`,
                '--p-opacity': p.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <motion.div
        className="home__inner"
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="show"
      >
        <motion.p className="home__eyebrow" variants={cardReveal(reduced)}>
          Build the perfect player
        </motion.p>
        <motion.h1 className="home__logo" variants={cardReveal(reduced)}>
          12&ndash;0
        </motion.h1>
        <motion.p className="home__tagline" variants={cardReveal(reduced)}>
          Can you break Bill Russell&rsquo;s record?
        </motion.p>

        <motion.div className="home__stage" variants={cardReveal(reduced)}>
          <PlayerSilhouette mode="complete" size="lg" filled={HOME_FILL} className="home__silhouette" />
        </motion.div>

        <motion.div className="home__controls" variants={cardReveal(reduced)}>
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

          <button className="cta home__cta" onClick={start}>
            Build Your Legend
          </button>

          <button className="home__teaser" disabled title="Coming in v1.5">
            <Clock size={15} aria-hidden="true" />
            Rewriting History
            <span className="home__teaser-badge">
              <Lock size={11} aria-hidden="true" />
              v1.5
            </span>
          </button>

          <button className="home__howto" onClick={() => setShowOnboarding(true)}>
            How to play
          </button>
        </motion.div>
      </motion.div>

      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
    </main>
  );
}
