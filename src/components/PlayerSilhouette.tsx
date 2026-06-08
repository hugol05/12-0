import { useId } from 'react';
import type { RatingCategory } from '@/types';
import './PlayerSilhouette.css';

/**
 * PlayerSilhouette — the game's single, signature figure.
 *
 * One refined, human basketball-player silhouette used everywhere the figure
 * appears: the Build stage centerpiece, the Preview header, the Home hero, and
 * the Results poster. (Previously there were two competing figures; this is the
 * unified, more-human one.)
 *
 * The figure itself is intentionally a clean, solid silhouette — the player's
 * attributes are read from the rings (Build), the radar (Preview) and the badges
 * (Results), not painted onto the body. `mode` only changes the finish:
 *
 *   building  — neutral slate figure (matches the Build stage)
 *   complete  — slate figure with a soft gold glow (Preview / Home)
 *   poster    — a polished golden "statue" finish for the Results archetype
 *
 * `filled` is accepted for backwards-compatibility (and drives the a11y label's
 * "N of 8 attributes lit" count) but no longer paints zones onto the body.
 *
 * ## Prop API
 * ```ts
 * interface PlayerSilhouetteProps {
 *   filled?: Partial<Record<RatingCategory, number>>; // optional; a11y count only
 *   mode?: 'building' | 'complete' | 'poster';        // finish (default 'complete')
 *   size?: 'sm' | 'md' | 'lg';                        // rendered width (default 'md')
 *   className?: string;
 * }
 * ```
 *
 * Pure + static (no framer-motion, no infinite loops) so it is screenshot- and
 * SSR-safe. Any ambient motion (Home's "breathing") is layered on via CSS by the
 * consumer. (A render smoke test lives in PlayerSilhouette.test.tsx.)
 */

export type SilhouetteMode = 'building' | 'complete' | 'poster';
export type SilhouetteSize = 'sm' | 'md' | 'lg';

export interface PlayerSilhouetteProps {
  /** category -> 0-99 rating; optional. Only used for the a11y "lit" count. */
  filled?: Partial<Record<RatingCategory, number>>;
  mode?: SilhouetteMode;
  size?: SilhouetteSize;
  className?: string;
}

/** The 8 OVR-contributing categories (durability excluded) — for the a11y count. */
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

export function PlayerSilhouette({
  filled = {},
  mode = 'complete',
  size = 'md',
  className,
}: PlayerSilhouetteProps) {
  const uid = useId().replace(/[:]/g, '');
  const litCount = ZONES.filter((z) => filled[z] != null).length;

  const bodyFill = mode === 'poster' ? `url(#${uid}-gold)` : `url(#${uid}-slate)`;
  const glow =
    mode === 'poster'
      ? 'drop-shadow(0 0 18px rgba(214,178,92,0.5)) drop-shadow(0 10px 22px rgba(0,0,0,0.6))'
      : mode === 'complete'
        ? 'drop-shadow(0 0 12px rgba(214,178,92,0.3)) drop-shadow(0 10px 20px rgba(0,0,0,0.55))'
        : 'drop-shadow(0 10px 22px rgba(0,0,0,0.55))';
  const rim = mode === 'poster' ? 'rgba(255,240,205,0.35)' : 'rgba(255,255,255,0.10)';

  return (
    <div
      className={['silhouette', `silhouette--${size}`, `silhouette--${mode}`, className]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={`Player silhouette — ${litCount} of ${ZONES.length} attributes lit`}
    >
      <svg viewBox="0 0 200 360" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`${uid}-slate`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="#474d5b" />
            <stop offset="45%" stopColor="#2a2e37" />
            <stop offset="100%" stopColor="#161920" />
          </linearGradient>
          <linearGradient id={`${uid}-gold`} x1="0.15" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#f0dca0" />
            <stop offset="45%" stopColor="#c69a44" />
            <stop offset="100%" stopColor="#6b4f22" />
          </linearGradient>
        </defs>

        {/* grounding shadow */}
        <ellipse cx="100" cy="351" rx="52" ry="8" fill="#000" opacity="0.5" />
        <ellipse cx="100" cy="351" rx="34" ry="5" fill="var(--court-wood)" opacity="0.12" />

        {/* ── the figure: overlapping same-fill shapes read as one solid silhouette ── */}
        <g fill={bodyFill} style={{ filter: glow }}>
          {/* head */}
          <circle cx="100" cy="48" r="25" />
          {/* neck */}
          <path d={NECK} />
          {/* arms (behind torso) */}
          <path d={ARM_L} />
          <path d={ARM_R} />
          {/* torso (broad shoulders → tapered waist) */}
          <path d={TORSO} />
          {/* pelvis */}
          <path d={HIPS} />
          {/* legs */}
          <path d={LEG_L} />
          <path d={LEG_R} />
          {/* feet */}
          <ellipse cx="82" cy="350" rx="15" ry="7" />
          <ellipse cx="118" cy="350" rx="15" ry="7" />
        </g>

        {/* rim light — a few highlight arcs (no full outline, so no internal seams) */}
        <g fill="none" stroke={rim} strokeWidth="2.2" strokeLinecap="round">
          <path d="M82 33 Q75 41 76 56" opacity="0.9" />
          <path d="M62 100 Q50 110 46 138" opacity="0.7" />
          <path d="M84 214 Q78 250 80 292" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

/* ---------- figure geometry (viewBox 0 0 200 360, centered on x=100) ---------- */
const NECK = 'M90 66 Q100 74 110 66 L112 92 L88 92 Z';
const TORSO =
  'M58 98 Q56 84 76 80 Q100 75 124 80 Q144 84 142 98 L130 182 Q127 202 100 204 Q73 202 70 182 Z';
const ARM_L = 'M62 98 Q42 104 38 140 Q36 168 45 196 L58 192 Q50 168 52 140 Q54 114 70 104 Z';
const ARM_R = 'M138 98 Q158 104 162 140 Q164 168 155 196 L142 192 Q150 168 148 140 Q146 114 130 104 Z';
const HIPS = 'M72 194 Q70 212 76 224 L124 224 Q130 212 128 194 Z';
const LEG_L = 'M80 212 Q73 256 75 298 L71 340 Q70 354 84 354 Q96 354 96 340 L98 298 Q100 258 98 214 Z';
const LEG_R = 'M120 212 Q127 256 125 298 L129 340 Q130 354 116 354 Q104 354 104 340 L102 298 Q100 258 102 214 Z';
