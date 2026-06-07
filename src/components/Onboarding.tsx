/**
 * Onboarding — first-run "how to play" overlay (WS6 flow & onboarding).
 *
 * A dismissible 3-card stepper (Roll → Assign → Simulate) shown the first time a
 * player opens the app, then remembered in localStorage so it never nags again.
 * Home owns *when* it shows (it can also re-open it from a "How to play" button);
 * this component owns the content, the stepper, and persisting the dismissal.
 *
 * Self-contained: no store/router coupling. Consumes WS2 motion primitives and the
 * shared `.cta` class. Respects `prefers-reduced-motion` (card slides collapse to a
 * cross-fade). Exported helpers let Home decide initial visibility:
 *   - `hasSeenOnboarding()` — true once the user has dismissed it
 *   - `markOnboardingSeen()` — persist the dismissal (also called on close)
 */
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Dices, Layers, Rocket, X } from 'lucide-react';
import { cardReveal, fadeIn } from '@/lib/motion';
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

const STEPS = [
  {
    icon: Dices,
    kicker: 'Step 1',
    title: 'Roll',
    body: 'Every roll reveals a franchise + decade — say, the "1990s Bulls". You get 10 rolls and two re-rolls to spend.',
  },
  {
    icon: Layers,
    kicker: 'Step 2',
    title: 'Assign',
    body: 'Pick a real player and slot their best trait into one of 9 attributes. Stitch together a Frankenstein superstar, your way.',
  },
  {
    icon: Rocket,
    kicker: 'Step 3',
    title: 'Simulate',
    body: 'Watch a whole career play out, season by season. Can you go 12–0 in the Finals and beat Russell’s 11 rings?',
  },
] as const;

export interface OnboardingProps {
  /** Called after the overlay is dismissed (skip, scrim, or final step). */
  onClose: () => void;
}

export function Onboarding({ onClose }: OnboardingProps) {
  const reduced = useReducedMotion() ?? false;
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const { icon: Icon, kicker, title, body } = STEPS[step];
  const slide = reduced ? 0 : 28;

  function finish() {
    markOnboardingSeen();
    onClose();
  }

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

      <motion.div className="onboarding__card" variants={cardReveal(reduced)} initial="hidden" animate="show">
        <button className="onboarding__close" onClick={finish} aria-label="Skip how to play">
          <X size={18} aria-hidden="true" />
        </button>

        {/* Re-keyed per step so each step animates in on change. Deliberately not
            wrapped in AnimatePresence + mode="wait": that desyncs if a step is
            advanced before the previous exit finishes (rapid taps leave the card
            stuck on the old step). A keyed entrance is robust to fast clicks. */}
        <motion.div
          key={step}
          className="onboarding__step"
          initial={{ opacity: 0, x: slide }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="onboarding__icon" aria-hidden="true">
            <Icon size={30} strokeWidth={1.75} />
          </span>
          <p className="onboarding__kicker">{kicker}</p>
          <h2 className="onboarding__title">{title}</h2>
          <p className="onboarding__body">{body}</p>
        </motion.div>

        <div className="onboarding__dots" role="tablist" aria-label="Steps">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              role="tab"
              aria-selected={i === step}
              aria-label={s.title}
              className={`onboarding__dot ${i === step ? 'is-active' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className="onboarding__actions">
          {!isLast ? (
            <>
              <button className="onboarding__skip" onClick={finish}>
                Skip
              </button>
              <button className="cta onboarding__next" onClick={() => setStep((s) => s + 1)}>
                Next
              </button>
            </>
          ) : (
            <button className="cta onboarding__next" onClick={finish}>
              Let&rsquo;s build &rarr;
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
