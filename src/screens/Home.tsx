import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, Lock, Dices, Target, PlayCircle, Mail } from 'lucide-react';
import type { Difficulty } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { loadFranchises, loadPlayers, loadRollIndex } from '@/data/loadGameData';
import { Onboarding, hasSeenOnboarding } from '@/components/Onboarding';
import { cardReveal, staggerContainer } from '@/lib/motion';
import './Home.css';

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'See every rating + stats. Strategic and transparent.' },
  { value: 'normal', label: 'Normal', hint: 'OVR + box stats. Ratings revealed when you assign.' },
  { value: 'hard', label: 'Hard', hint: 'Name, position, team & era only. Ball-knowledge flex.' },
];

// 12 championship rings: the first 11 are Russell's record; the 12th is the goal.
const RINGS = Array.from({ length: 12 }, (_, i) => i);

// Desktop side-rail content. Hidden on mobile (the phone column stays a clean
// single stack); on wide screens these flank the hero so the page fills the
// viewport with relevant context instead of empty void.
const HOW_IT_WORKS: { icon: typeof Dices; title: string; body: string }[] = [
  { icon: Dices, title: 'Roll', body: 'Nine rolls, each a real franchise + era. Pick a player from the roster.' },
  { icon: Target, title: 'Build', body: 'Place each pick onto a body part — shooting, defense, clutch, and six more.' },
  { icon: PlayCircle, title: 'Simulate', body: 'Watch a 15-20 season career play out. Chase rings. Try to go 12-0.' },
];

const RECORDS_TO_BREAK: { value: string; label: string }[] = [
  { value: '11', label: 'Bill Russell — most rings' },
  { value: '6', label: 'Jordan — Finals MVPs' },
  { value: '73-9', label: 'Warriors — best season' },
  { value: '12-0', label: 'Your perfect run' },
];

function Trophy() {
  return (
    <svg className="champ__trophy" viewBox="0 0 120 140" aria-hidden role="presentation">
      <defs>
        <linearGradient id="champ-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0dca0" />
          <stop offset="50%" stopColor="#c69a44" />
          <stop offset="100%" stopColor="#6b4f22" />
        </linearGradient>
      </defs>
      {/* cup */}
      <path d="M34 18 H86 V44 C86 64 74 78 60 78 C46 78 34 64 34 44 Z" fill="url(#champ-gold)" stroke="#f0dca0" strokeWidth="1.5" />
      {/* handles */}
      <path d="M34 24 C18 24 18 50 34 52" fill="none" stroke="url(#champ-gold)" strokeWidth="5" />
      <path d="M86 24 C102 24 102 50 86 52" fill="none" stroke="url(#champ-gold)" strokeWidth="5" />
      {/* stem + base */}
      <rect x="55" y="78" width="10" height="20" fill="url(#champ-gold)" />
      <rect x="40" y="98" width="40" height="9" rx="2" fill="url(#champ-gold)" />
      <rect x="34" y="107" width="52" height="10" rx="2" fill="url(#champ-gold)" />
      {/* star */}
      <path d="M60 30 l4 9 10 1 -7.5 6.5 2.5 9.5 -9-5 -9 5 2.5-9.5 -7.5-6.5 10-1 Z" fill="#fff8e1" opacity="0.9" />
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const reset = useGameStore((s) => s.reset);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());

  // Warm the roster cache in the background while the player reads the home
  // screen / onboarding, so the Build screen has data ready (no "Loading
  // rosters…" wait). loadGameData caches each promise, so useGameData on /build
  // reuses these fetches instead of starting over. Fire-and-forget; errors are
  // surfaced later by useGameData on the screen that actually needs the data.
  useEffect(() => {
    void Promise.allSettled([loadRollIndex(), loadFranchises(), loadPlayers()]);
  }, []);

  function start() {
    reset();
    setDifficulty(difficulty);
    navigate('/build');
  }

  return (
    <main className="home home--champ">
      <div className="home__inner">
        {/* left rail (desktop only): the core loop at a glance */}
        <motion.aside className="home__rail home__rail--left" variants={staggerContainer(0.08)} initial="hidden" animate="show">
          <motion.p className="home__rail-title" variants={cardReveal(reduced)}>How it works</motion.p>
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <motion.div key={title} className="home__step" variants={cardReveal(reduced)}>
              <span className="home__step-icon"><Icon size={20} aria-hidden="true" /></span>
              <span className="home__step-text">
                <span className="home__step-title">{title}</span>
                <span className="home__step-body">{body}</span>
              </span>
            </motion.div>
          ))}
        </motion.aside>

        {/* center hero */}
        <motion.div className="home__center" variants={staggerContainer(0.08)} initial="hidden" animate="show">
          <motion.div className="champ__hero" variants={cardReveal(reduced)}>
            <Trophy />
          </motion.div>

          <motion.h1 className="home__logo" variants={cardReveal(reduced)}>12&ndash;0</motion.h1>
          <motion.p className="home__tagline champ__tagline" variants={cardReveal(reduced)}>
            11 rings made Bill Russell immortal.
            <strong> Win 12.</strong>
          </motion.p>

          {/* ring counter: 11 won + the glowing 12th target */}
          <motion.div className="champ__rings" variants={cardReveal(reduced)} aria-label="11 rings to beat, 1 to win">
            {RINGS.map((i) => (
              <span key={i} className={`champ__ring ${i < 11 ? 'champ__ring--won' : 'champ__ring--goal'}`} />
            ))}
          </motion.div>
          <motion.div className="champ__legend" variants={cardReveal(reduced)}>
            <span className="champ__legend-won">Russell&rsquo;s 11</span>
            <span className="champ__legend-goal">Your 12th</span>
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

            <button className="cta home__cta" onClick={start}>Chase the Record</button>

            <button className="home__teaser" disabled title="Coming in v2.0">
              <Clock size={15} aria-hidden="true" />
              Rewriting History
              <span className="home__teaser-badge"><Lock size={11} aria-hidden="true" />v2.0</span>
            </button>

            <button className="home__howto" onClick={() => setShowOnboarding(true)}>How to play</button>
          </motion.div>
        </motion.div>

        {/* right rail (desktop only): the records you're chasing */}
        <motion.aside className="home__rail home__rail--right" variants={staggerContainer(0.08)} initial="hidden" animate="show">
          <motion.p className="home__rail-title" variants={cardReveal(reduced)}>What you&rsquo;re chasing</motion.p>
          {RECORDS_TO_BREAK.map((r) => (
            <motion.div key={r.label} className={`home__record ${r.value === '12-0' ? 'home__record--goal' : ''}`} variants={cardReveal(reduced)}>
              <span className="home__record-value">{r.value}</span>
              <span className="home__record-label">{r.label}</span>
            </motion.div>
          ))}
        </motion.aside>
      </div>

      <footer className="home__footer">
        <p className="home__disclaimer">
          12-0 is an independent fan project and is <strong>not affiliated with, endorsed by, or sponsored by</strong> the
          National Basketball Association (NBA) or any of its teams. All player names, team names, and statistics are the
          property of their respective owners and are used here for informational and educational purposes only.
        </p>
        <p className="home__feedback">
          Found a rating that looks wrong, or have feedback?{' '}
          <a className="home__mail" href="mailto:hglabs.studio@gmail.com?subject=12-0%20feedback">
            <Mail size={14} aria-hidden="true" />
            hglabs.studio@gmail.com
          </a>
        </p>
      </footer>

      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
    </main>
  );
}
