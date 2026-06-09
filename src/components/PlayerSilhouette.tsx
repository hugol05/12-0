import type { RatingCategory } from '@/types';
import './PlayerSilhouette.css';

/**
 * PlayerSilhouette — the game's single, signature figure.
 *
 * One refined, human basketball-player silhouette used everywhere the figure
 * appears: the Build stage centerpiece, the Preview header, and the Results
 * poster. The artwork is a real, detailed silhouette (dark navy body with grey
 * jersey / short / shoe trim) shipped as an optimized PNG; the component layers
 * an ambient championship-gold spotlight and grounding shadow around it so the
 * figure blends into the OLED-black page instead of floating on it.
 *
 * `mode` only changes the finish around / over the figure:
 *
 *   building  — neutral navy figure on a faint cool spotlight (Build stage)
 *   complete  — navy figure lifted by a soft gold glow (Preview)
 *   poster    — the figure tinted to a polished gold "statue" (Results)
 *
 * `filled` is accepted for backwards-compatibility (and drives the a11y label's
 * "N of 8 attributes lit" count) but does not paint zones onto the body — the
 * attributes are read from the rings (Build), the radar (Preview) and the
 * badges (Results).
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
 * SSR-safe. Any ambient motion (e.g. a "breathing" idle) is layered on via CSS
 * by the consumer. (A render smoke test lives in PlayerSilhouette.test.tsx.)
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

const FIGURE_SRC = '/assets/player-figure.png';

export function PlayerSilhouette({
  filled = {},
  mode = 'complete',
  size = 'md',
  className,
}: PlayerSilhouetteProps) {
  const litCount = ZONES.filter((z) => filled[z] != null).length;

  return (
    <div
      className={['silhouette', `silhouette--${size}`, `silhouette--${mode}`, className]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={`Player silhouette — ${litCount} of ${ZONES.length} attributes lit`}
    >
      <span className="silhouette__glow" aria-hidden="true" />
      <img className="silhouette__img" src={FIGURE_SRC} alt="" draggable={false} />
      {/* poster only: a polished gold "statue" of the same figure, painted by
          masking the championship-gold gradient with the figure's alpha. */}
      <span className="silhouette__gold" aria-hidden="true" />
      <span className="silhouette__floor" aria-hidden="true" />
    </div>
  );
}
