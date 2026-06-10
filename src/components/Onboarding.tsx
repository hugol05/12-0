/**
 * Onboarding — first-run "how to play" intro (roll-cycle variant).
 *
 * Replaces the old 3-card click-through stepper with a single, short
 * auto-playing animation that demonstrates the core loop in motion: a slot reel
 * spins and lands on a real franchise + era ("1990s Bulls"), a player chip pops
 * ("Michael Jordan"), and the pick flies onto a category ring. It runs three
 * quick Roll → Pick → Place cycles (~4s), then lands on a single
 * "Build your player →" CTA and hands off to the real Build screen.
 *
 * Shown the first time a player opens the app, then remembered in localStorage
 * so it never nags again. Home owns *when* it shows (it also re-opens it from a
 * "How to play" button); this component owns the content and persists dismissal.
 *
 * Self-contained: no store/router/data coupling (the picks shown are a small
 * illustrative cast, not a live roster fetch). Respects `prefers-reduced-motion`
 * (the loop resolves instantly to the placed state, no spin/fly). Exported
 * helpers let Home decide initial visibility:
 *   - `hasSeenOnboarding()`  — true once the user has dismissed it
 *   - `markOnboardingSeen()` — persist the dismissal (also called on close)
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type { RatingCategory } from '@/types';
import { BuildStage, type StageSlot } from './BuildStage';
import { fadeIn, slotTransition } from '@/lib/motion';
import './Onboarding.css';

const STORAGE_KEY = '12-0:onboarded';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* storage unavailable (private mode) — overlay just shows again next time */
  }
}

/** The 9 rings, in BuildStage display order. Fills are layered on as picks land. */
const SLOTS: { category: RatingCategory; label: string; icon: string }[] = [
  { category: 'shooting', label: 'Shooting', icon: '🎯' },
  { category: 'playmaking', label: 'Playmaking', icon: '🏀' },
  { category: 'defense', label: 'Defense', icon: '🛡️' },
  { category: 'clutch', label: 'Clutch', icon: '🔥' },
  { category: 'athleticism', label: 'Athleticism', icon: '⚡' },
  { category: 'rebounding', label: 'Rebounding', icon: '💪' },
  { category: 'height', label: 'Height', icon: '📏' },
  { category: 'basketballIq', label: 'IQ', icon: '🧠' },
  { category: 'durability', label: 'Durability', icon: '🏋️' },
];

/** The three Roll → Pick → Place cycles the intro plays out. */
const CYCLES: { franchise: string; player: string; category: RatingCategory; rating: number }[] = [
  { franchise: '1990s Bulls', player: 'Michael Jordan', category: 'clutch', rating: 99 },
  { franchise: '2010s Warriors', player: 'Stephen Curry', category: 'shooting', rating: 99 },
  { franchise: '1980s Lakers', player: 'Magic Johnson', category: 'playmaking', rating: 96 },
];

/** Decoy labels the reel flickers through before landing on the real franchise. */
const REEL_DECOYS = [
  '1970s Knicks',
  '2000s Pistons',
  '1980s Celtics',
  '1990s Rockets',
  '2010s Heat',
  '1960s Lakers',
  '2020s Nuggets',
  '1990s Jazz',
];

const ROLL_MS = 720; // reel spin
const PICK_MS = 540; // player chip on screen before it places
const PLACE_MS = 460; // chip flies to the ring
const HOLD_MS = 700; // beat after the last place before the CTA

type Phase = 'roll' | 'pick' | 'place';

export interface OnboardingProps {
  /** Called after the overlay is dismissed (skip, scrim, or final CTA). */
  onClose: () => void;
}

export function Onboarding({ onClose }: OnboardingProps) {
  const reduced = useReducedMotion() ?? false;
  const [cycle, setCycle] = useState(0); // index into CYCLES
  const [phase, setPhase] = useState<Phase>('roll');
  const [placed, setPlaced] = useState(0); // how many picks have landed on a ring
  const [done, setDone] = useState(reduced);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduced) {
      setPlaced(CYCLES.length);
      return;
    }
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    let t = 0;
    for (let c = 0; c < CYCLES.length; c++) {
      const ci = c;
      at(t, () => {
        setCycle(ci);
        setPhase('roll');
      });
      t += ROLL_MS;
      at(t, () => setPhase('pick'));
      t += PICK_MS;
      at(t, () => setPhase('place'));
      t += PLACE_MS;
      at(t, () => setPlaced(ci + 1));
    }
    at(t + HOLD_MS, () => setDone(true));
    const scheduled = timers.current;
    return () => {
      scheduled.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduced]);

  function finish() {
    markOnboardingSeen();
    onClose();
  }

  const current = CYCLES[cycle];

  // Build the ring grid, filling categories whose pick has already landed.
  const placedCats = new Map(CYCLES.slice(0, placed).map((c) => [c.category, c]));
  const slots: StageSlot[] = SLOTS.map((s) => {
    const hit = placedCats.get(s.category);
    return {
      category: s.category,
      label: s.label,
      icon: s.icon,
      fill: hit ? { rating: hit.rating, playerName: hit.player } : undefined,
      // the ring currently being targeted glows while its pick is in flight
      highlighted: !done && phase === 'place' && s.category === current.category,
    };
  });

  return (
    <motion.div
      className="onboarding"
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
      variants={fadeIn}
      initial="hidden"
      animate="show"
    >
      <button className="onboarding__scrim" aria-label="Dismiss" onClick={finish} />

      <motion.div className="onboarding__panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <button className="onboarding__close" onClick={finish} aria-label="Skip how to play">
          <X size={18} aria-hidden="true" />
        </button>

        {/* ── Roll: the reel that lands on a franchise + era ── */}
        <div className="onboarding__reel" aria-hidden="true">
          <span className="onboarding__reel-eyebrow">Roll</span>
          <div className="onboarding__reel-window">
            {done ? (
              <span className="onboarding__reel-final">Your build</span>
            ) : phase === 'roll' ? (
              <motion.div
                key={cycle}
                className="onboarding__reel-strip"
                initial={{ y: 0 }}
                animate={{ y: `-${REEL_DECOYS.length * 2.4}rem` }}
                transition={slotTransition(reduced)}
              >
                {REEL_DECOYS.map((d, i) => (
                  <span key={i} className="onboarding__reel-item">{d}</span>
                ))}
                <span className="onboarding__reel-item onboarding__reel-item--final">{current.franchise}</span>
              </motion.div>
            ) : (
              <span className="onboarding__reel-final">{current.franchise}</span>
            )}
          </div>
        </div>

        {/* ── Pick: the player chip that pops, then flies down to the ring ── */}
        <div className="onboarding__chip-track">
          {!done && (phase === 'pick' || phase === 'place') && (
            <motion.div
              key={`${cycle}-${current.player}`}
              className="onboarding__chip"
              initial={{ opacity: 0, scale: 0.8, y: -6 }}
              animate={
                phase === 'place'
                  ? { opacity: 0, scale: 0.5, y: 40 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              transition={{ duration: phase === 'place' ? PLACE_MS / 1000 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="onboarding__chip-name">{current.player}</span>
              <span className="onboarding__chip-cat">{SLOTS.find((s) => s.category === current.category)?.icon} {SLOTS.find((s) => s.category === current.category)?.label}</span>
            </motion.div>
          )}
        </div>

        {/* ── Place: the ring grid the picks land on ── */}
        <div className="onboarding__stage">
          <BuildStage slots={slots} ovr={null} className="onboarding__stage-grid" />
        </div>

        <div className="onboarding__footer">
          {done ? (
            <motion.div
              className="onboarding__cta-row"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="onboarding__resolve">Roll &middot; Pick &middot; Place &mdash; fill all 9, then chase 12&ndash;0.</p>
              <button className="cta onboarding__cta" onClick={finish}>
                Build your player &rarr;
              </button>
            </motion.div>
          ) : (
            <p className="onboarding__steps" aria-hidden="true">
              <span className={`onboarding__stepword ${phase === 'roll' ? 'is-active' : ''}`}>Roll</span>
              <span className="onboarding__stepdot">&middot;</span>
              <span className={`onboarding__stepword ${phase === 'pick' ? 'is-active' : ''}`}>Pick</span>
              <span className="onboarding__stepdot">&middot;</span>
              <span className={`onboarding__stepword ${phase === 'place' ? 'is-active' : ''}`}>Place</span>
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
