/**
 * Shared Framer Motion vocabulary for 12-0 (WS2 design foundation).
 *
 * Screen workstreams (WS4/WS5/WS6) import these so motion stays consistent and
 * every animation has one place to tune. Durations/easings mirror the CSS
 * tokens in tokens.css — keep the two in sync if you change either.
 *
 * Reduced motion: call `prefersReducedMotion()` (or Framer's `useReducedMotion`
 * hook) and pass the result into the `*` factories below, which collapse
 * movement to a plain fade. Every animated surface MUST honor this.
 *
 * Usage:
 *   import { useReducedMotion } from 'framer-motion';
 *   import { pageVariants, pageTransition } from '@/lib/motion';
 *   const reduced = useReducedMotion() ?? false;
 *   <motion.div variants={pageVariants(reduced)} initial="initial" animate="enter"
 *               exit="exit" transition={pageTransition} />
 */
import type { Transition, Variants } from 'framer-motion';

/** Easing curves as Framer cubic-bezier arrays — mirror --ease-* in tokens.css. */
export const EASE = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
  slot: [0.16, 1, 0.16, 1],
} as const;

/** Durations in seconds — mirror --dur-* in tokens.css. */
export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.35,
  slow: 0.6,
  roll: 1.6,
} as const;

/**
 * SSR-safe check for the user's reduced-motion preference. Prefer Framer's
 * `useReducedMotion()` inside components (reactive); use this in plain modules.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── Page transitions ───────────────────────────────────────── */

/** Route-level enter/exit: rise + fade in, sink + fade out. Reduced → fade only. */
export function pageVariants(reduced = false): Variants {
  const shift = reduced ? 0 : 16;
  return {
    initial: { opacity: 0, y: shift },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -shift },
  };
}

export const pageTransition: Transition = {
  duration: DURATION.base,
  ease: EASE.out,
};

/* ── Card reveal (and stagger) ──────────────────────────────── */

/** A single card/list-item revealing in. Pair with `staggerContainer`. */
export function cardReveal(reduced = false): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 12, scale: reduced ? 1 : 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: DURATION.base, ease: EASE.out },
    },
  };
}

/** Wrap a list to stagger its `cardReveal` children. */
export function staggerContainer(stagger = 0.06): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: 0.04 } },
  };
}

/* ── Slot-machine roll ──────────────────────────────────────── */

/**
 * Transition for a slot reel spinning to a stop: long duration with a hard
 * deceleration so it "lands." Drive the reel's `y`/`backgroundPositionY`
 * with this. Reduced motion → near-instant settle (no spin spectacle).
 */
export function slotTransition(reduced = false): Transition {
  return reduced
    ? { duration: DURATION.fast, ease: EASE.out }
    : { duration: DURATION.roll, ease: EASE.slot };
}

/* ── Gold burst (championship moment) ───────────────────────── */

/**
 * Celebration pop for a ring/championship — scale punch + glow fade. Consumers
 * layer their own particles; this is the core beat. Reduced → quiet opacity pulse.
 */
export function goldBurst(reduced = false): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      burst: { opacity: 1, transition: { duration: DURATION.fast } },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.6 },
    burst: {
      opacity: [0, 1, 1],
      scale: [0.6, 1.15, 1],
      transition: { duration: DURATION.slow, ease: EASE.spring, times: [0, 0.6, 1] },
    },
  };
}

/** Minimal fade — a safe default whenever a richer animation is suppressed. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base, ease: EASE.out } },
};
