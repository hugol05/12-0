import { useId } from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import type { RatingCategory } from '@/types';
import './PlayerSilhouette.css';

/**
 * PlayerSilhouette — the game's signature centerpiece.
 *
 * A hand-crafted, premium basketball-player SVG whose 8 attribute zones light up
 * with gold glow as attributes are assigned. Carried through Build → Preview → Results.
 *
 * Zone → body-region mapping (per docs/visual-design.md §Signature Design Elements):
 *   shooting     → raised shooting arm + ball
 *   height       → overall figure scale (taller as the rating rises)
 *   playmaking   → off-hand / guide arm
 *   defense      → wingspan / stance aura (side brackets)
 *   rebounding   → torso
 *   athleticism  → legs
 *   basketballIq → head + thinking aura ring
 *   clutch       → glowing chest core with a heartbeat pulse
 * (durability has no zone — it governs career length only and is ignored here.)
 *
 * Each zone's glow + opacity scale with its 0–99 rating. Absent categories stay unlit.
 *
 * ## Prop API
 * ```ts
 * interface PlayerSilhouetteProps {
 *   filled: Partial<Record<RatingCategory, number>>; // category -> 0-99 rating; absent = unlit
 *   mode: 'building' | 'complete' | 'poster';        // building animates each new fill;
 *                                                    // complete shows all lit; poster is static (screenshot-safe)
 *   size?: 'sm' | 'md' | 'lg';                       // default 'md'
 *   className?: string;
 * }
 * ```
 *
 * - `building`  — newly-lit zones glow/scale in (spring); the clutch core keeps a heartbeat pulse.
 * - `complete`  — all assigned zones render fully lit; no entrance animation.
 * - `poster`    — fully static, no motion at all (safe for html-to-image screenshots / SSR).
 *
 * Respects `prefers-reduced-motion`: all entrance + looping animation is dropped, final
 * state is rendered immediately. `poster` mode is also always static regardless of preference.
 *
 * ## Preview / harness
 * This is a pure, self-contained component (no store/router coupling). To eyeball it without
 * wiring a screen, temporarily render it anywhere, e.g. in `src/App.tsx`:
 * ```tsx
 * <PlayerSilhouette mode="building" size="lg" filled={{ shooting: 97, clutch: 94, height: 88,
 *   rebounding: 80, playmaking: 70, defense: 60, athleticism: 75, basketballIq: 90 }} />
 * ```
 * (A render smoke test lives in PlayerSilhouette.test.tsx.)
 */

export type SilhouetteMode = 'building' | 'complete' | 'poster';
export type SilhouetteSize = 'sm' | 'md' | 'lg';

export interface PlayerSilhouetteProps {
  /** category -> 0-99 rating; absent categories stay unlit. */
  filled: Partial<Record<RatingCategory, number>>;
  mode: SilhouetteMode;
  size?: SilhouetteSize;
  className?: string;
}

/** The 8 OVR-contributing zones the figure visualises (durability excluded). */
const ZONES = [
  'height',
  'rebounding',
  'shooting',
  'playmaking',
  'athleticism',
  'defense',
  'basketballIq',
  'clutch',
] as const;

const SPRING: Transition = { type: 'spring', stiffness: 200, damping: 18, mass: 0.7 };

/** rating 0-99 -> 0..1 */
const norm = (v: number) => Math.max(0, Math.min(1, v / 99));
/** lit zones are clearly on even at low ratings, but dimmer than a 99. */
const litOpacity = (i: number) => 0.5 + 0.5 * i;
/** glow radius (px) scales with intensity; `boost` for hero zones (clutch/height). */
const glowPx = (i: number, boost = 1) => (5 + i * 13) * boost;

export function PlayerSilhouette({
  filled,
  mode,
  size = 'md',
  className,
}: PlayerSilhouetteProps) {
  const uid = useId().replace(/[:]/g, '');
  const reduce = useReducedMotion();
  // Entrance / looping motion only when actively building and motion is allowed.
  const animate = mode === 'building' && !reduce;

  const litCount = ZONES.filter((z) => filled[z] != null).length;
  const heightInt = filled.height != null ? norm(filled.height) : 0;
  // Height drives overall scale: ~0.94 (short) → ~1.07 (tall), anchored at the feet.
  const heightScale = 0.94 + 0.13 * heightInt;

  // A lit zone wraps its shapes; an unlit zone renders nothing (the dark base shows through).
  const Zone = ({
    cat,
    children,
    boost = 1,
  }: {
    cat: RatingCategory;
    children: React.ReactNode;
    boost?: number;
  }) => {
    const rating = filled[cat];
    if (rating == null) return null;
    const i = norm(rating);
    const target = litOpacity(i);
    const style = {
      transformBox: 'fill-box' as const,
      transformOrigin: 'center',
      filter: `drop-shadow(0 0 ${glowPx(i, boost)}px var(--gold-glow))`,
    };
    if (mode === 'poster' || reduce) {
      return (
        <g style={style} opacity={target}>
          {children}
        </g>
      );
    }
    return (
      <motion.g
        style={style}
        initial={animate ? { opacity: 0, scale: 0.55 } : false}
        animate={{ opacity: target, scale: 1 }}
        transition={SPRING}
      >
        {children}
      </motion.g>
    );
  };

  const fill = `url(#${uid}-gold)`;

  return (
    <div
      className={['silhouette', `silhouette--${size}`, className].filter(Boolean).join(' ')}
      role="img"
      aria-label={`Player silhouette — ${litCount} of ${ZONES.length} attributes lit`}
    >
      <svg viewBox="0 0 220 340" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-glow)" />
            <stop offset="55%" stopColor="var(--gold-primary)" />
            <stop offset="100%" stopColor="var(--court-wood)" />
          </linearGradient>
          <linearGradient id={`${uid}-dark`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b1b24" />
            <stop offset="100%" stopColor="#101016" />
          </linearGradient>
        </defs>

        {/* ground shadow — grounds the figure on the void */}
        <ellipse cx="110" cy="328" rx="56" ry="9" fill="#000" opacity="0.55" />
        <ellipse cx="110" cy="328" rx="40" ry="6" fill="var(--court-wood)" opacity="0.1" />

        {/* whole figure scales with HEIGHT, anchored at the feet */}
        <g style={{ transformOrigin: '110px 320px' }} transform={`scale(1 ${heightScale})`}>
          {/* ---------- DARK BASE (always visible so the shape reads) ---------- */}
          <g
            fill={`url(#${uid}-dark)`}
            stroke="#2a2a38"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* legs */}
            <path d={LEG_L} fill="none" stroke="#23232f" strokeWidth={17} />
            <path d={LEG_R} fill="none" stroke="#23232f" strokeWidth={17} />
            {/* arms */}
            <path d={ARM_SHOOT} fill="none" stroke="#23232f" strokeWidth={15} />
            <path d={ARM_OFF} fill="none" stroke="#23232f" strokeWidth={14} />
            {/* torso + head */}
            <path d={TORSO} />
            <circle cx="110" cy="46" r="21" />
            {/* ball */}
            <circle cx="192" cy="30" r="15" />
          </g>

          {/* ---------- LIT ZONES ---------- */}

          {/* DEFENSE — wingspan / stance brackets framing the figure */}
          <Zone cat="defense">
            <path d={WING_L} fill="none" stroke={fill} strokeWidth={5} strokeLinecap="round" />
            <path d={WING_R} fill="none" stroke={fill} strokeWidth={5} strokeLinecap="round" />
          </Zone>

          {/* ATHLETICISM — legs */}
          <Zone cat="athleticism">
            <path d={LEG_L} fill="none" stroke={fill} strokeWidth={17} strokeLinecap="round" />
            <path d={LEG_R} fill="none" stroke={fill} strokeWidth={17} strokeLinecap="round" />
          </Zone>

          {/* REBOUNDING — torso */}
          <Zone cat="rebounding">
            <path d={TORSO} fill={fill} />
          </Zone>

          {/* PLAYMAKING — off-hand / guide arm */}
          <Zone cat="playmaking">
            <path d={ARM_OFF} fill="none" stroke={fill} strokeWidth={14} strokeLinecap="round" />
            <circle cx="53" cy="150" r="8" fill={fill} />
          </Zone>

          {/* SHOOTING — raised arm + ball */}
          <Zone cat="shooting">
            <path d={ARM_SHOOT} fill="none" stroke={fill} strokeWidth={15} strokeLinecap="round" />
            <circle cx="192" cy="30" r="15" fill={fill} />
            <path
              d="M192 15 C186 22 186 38 192 45"
              fill="none"
              stroke="var(--bg-void)"
              strokeWidth={1.5}
              opacity={0.55}
            />
            <path
              d="M177 30 C184 26 200 26 207 30"
              fill="none"
              stroke="var(--bg-void)"
              strokeWidth={1.5}
              opacity={0.55}
            />
          </Zone>

          {/* IQ — head + thinking aura ring */}
          <Zone cat="basketballIq">
            <circle cx="110" cy="46" r="21" fill={fill} />
            <circle
              cx="110"
              cy="46"
              r="30"
              fill="none"
              stroke={fill}
              strokeWidth={2}
              strokeDasharray="4 6"
              opacity={0.8}
            />
          </Zone>

          {/* CLUTCH — glowing chest core with a heartbeat pulse */}
          <ClutchCore
            rating={filled.clutch}
            fill={fill}
            animate={animate}
            posterOrReduce={mode === 'poster' || !!reduce}
          />
        </g>
      </svg>
    </div>
  );
}

/** The clutch heart — pulses when building, static otherwise. */
function ClutchCore({
  rating,
  fill,
  animate,
  posterOrReduce,
}: {
  rating: number | undefined;
  fill: string;
  animate: boolean;
  posterOrReduce: boolean;
}) {
  if (rating == null) return null;
  const i = norm(rating);
  const target = litOpacity(i);
  const style = {
    transformBox: 'fill-box' as const,
    transformOrigin: 'center',
    filter: `drop-shadow(0 0 ${glowPx(i, 1.4)}px var(--gold-glow))`,
  };
  const core = (
    <>
      <circle cx="110" cy="122" r="10" fill={fill} />
      <circle cx="110" cy="122" r="4.5" fill="var(--gold-glow)" />
    </>
  );
  if (posterOrReduce) {
    return (
      <g style={style} opacity={target}>
        {core}
      </g>
    );
  }
  return (
    <motion.g
      style={style}
      initial={animate ? { opacity: 0, scale: 0.4 } : false}
      animate={
        animate
          ? { opacity: [target, target * 0.78, target], scale: [1, 1.22, 1] }
          : { opacity: target, scale: 1 }
      }
      transition={
        animate
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : SPRING
      }
    >
      {core}
    </motion.g>
  );
}

/* ---------- shared path geometry (viewBox 0 0 220 340) ---------- */
const TORSO =
  'M84 88 C84 81 92 79 110 79 C128 79 136 81 136 88 L148 150 C150 177 132 197 110 197 C88 197 70 177 72 150 Z';
const ARM_SHOOT = 'M138 96 C156 92 170 80 176 58 C179 48 182 42 186 38';
const ARM_OFF = 'M82 96 C66 104 56 124 54 146';
const LEG_L = 'M100 193 C94 231 90 271 86 309';
const LEG_R = 'M120 193 C126 231 130 271 134 309';
const WING_L = 'M44 178 C25 151 27 107 47 79';
const WING_R = 'M176 178 C195 151 193 107 173 79';
