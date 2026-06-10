import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useGameStore, useStoreHydrated } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { CATEGORIES, computeOvr, OVR_WEIGHTS } from '@/simulation/categories';
import { assignmentsToRatings } from '@/simulation/career';
import { RadarChart } from '@/components/RadarChart';
import { PlayerSilhouette } from '@/components/PlayerSilhouette';
import { TeamBadge } from '@/components/TeamBadge';
import { cardReveal, pageTransition, pageVariants, staggerContainer } from '@/lib/motion';
import { buildArchetype, formatHeight, parseHeightInches } from '@/lib/archetype';
import type { OvrCategory, RatingCategory } from '@/types';
import './Preview.css';

// Short radar-axis labels — default is the first word of the category name, but
// "Basketball IQ" must read as "IQ" (not "Basketball").
const SHORT_AXIS_LABEL: Partial<Record<OvrCategory, string>> = {
  basketballIq: 'IQ',
};

export default function Preview() {
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;
  const { data } = useGameData();
  const assignments = useGameStore((s) => s.assignments);
  const franchise = useGameStore((s) => s.franchise);
  const difficulty = useGameStore((s) => s.difficulty);

  const hydrated = useStoreHydrated();
  const ready = assignments.length === 9 && !!franchise;

  // bounce back to build if we somehow landed here without a complete build —
  // but only once the persisted store has rehydrated, so a reload/deep-link of
  // /preview doesn't bounce on the still-empty initial state.
  useEffect(() => {
    if (hydrated && !ready) navigate('/build');
  }, [hydrated, ready, navigate]);

  const ratings = useMemo(() => assignmentsToRatings(assignments), [assignments]);
  const ovr = computeOvr(ratings);

  // Height is not surfaced as a rating — it's shown as the real height + folded into the archetype,
  // so it's dropped from the radar axes.
  const axes = useMemo(
    () =>
      (Object.keys(OVR_WEIGHTS) as OvrCategory[])
        .filter((k) => k !== 'height')
        .map((k) => ({
          label: SHORT_AXIS_LABEL[k] ?? CATEGORIES.find((c) => c.key === k)?.label.split(' ')[0] ?? k,
          value: ratings[k],
        })),
    [ratings],
  );

  const filled = useMemo(() => {
    const f: Partial<Record<RatingCategory, number>> = {};
    for (const k of Object.keys(OVR_WEIGHTS) as OvrCategory[]) f[k] = ratings[k];
    return f;
  }, [ratings]);

  if (!ready) return null;

  const fr = data?.franchisesById.get(franchise!.franchise);
  // Height comes from whoever was assigned to the Height category; archetype folds size in.
  const heightPlayer = data?.playersById.get(assignments.find((a) => a.category === 'height')?.playerId ?? '');
  const heightStr = formatHeight(heightPlayer?.height);
  const archetype = buildArchetype(filled, parseHeightInches(heightPlayer?.height));

  return (
    <motion.main
      className="preview"
      variants={pageVariants(reduced)}
      initial="initial"
      animate="enter"
      transition={pageTransition}
    >
      <header className="preview__head">
        <div className="preview__head-info">
          <div className="preview__ovr">
            <span className="preview__ovr-num">{ovr}</span>
            <span className="preview__ovr-label">OVR</span>
          </div>
          <p className="preview__eyebrow">Player Assembled</p>
          <p className="preview__archetype">{archetype} <span className="preview__height">{heightStr}</span></p>
          {fr && (
            <p className="preview__team">
              <TeamBadge franchiseId={fr.id} abbreviation={fr.abbreviation} name={fr.name} size="sm" />
              <span>Starting on the {fr.name}</span>
            </p>
          )}
          <p className="preview__mode">{difficulty} mode · {franchise!.decade} era</p>
        </div>
        <PlayerSilhouette filled={filled} mode="complete" size="md" className="preview__fig" />
      </header>

      <section className="preview__radar">
        <RadarChart axes={axes} />
      </section>

      <div className="preview__durability">
        <div className="preview__durability-head">
          <span>🏋️ Durability — years in the tank</span>
          <span className="preview__durability-val">{ratings.durability}</span>
        </div>
        <div className="fuel"><div className="fuel__fill" style={{ width: `${ratings.durability}%` }} /></div>
      </div>

      <section className="builtwith">
        <h3 className="builtwith__title">Built With</h3>
        <motion.ul
          className="builtwith__list"
          variants={staggerContainer(0.04)}
          initial="hidden"
          animate="show"
        >
          {CATEGORIES.map((c) => {
            const a = assignments.find((x) => x.category === c.key);
            const player = a && data?.playersById.get(a.playerId);
            const srcFr = a && data?.franchisesById.get(a.source.franchise);
            return (
              <motion.li key={c.key} className="builtwith__row" variants={cardReveal(reduced)}>
                <Headshot
                  url={player?.photo.url}
                  fallback={player?.photo.fallback}
                  name={player?.name ?? '—'}
                />
                <span className="builtwith__cat">
                  <span className="builtwith__icon">{c.icon}</span>
                  <span className="builtwith__cat-label">{c.label}</span>
                </span>
                <span className="builtwith__player">
                  <span className="builtwith__name">{player?.name ?? '—'}</span>
                  {srcFr && (
                    <TeamBadge
                      franchiseId={srcFr.id}
                      abbreviation={srcFr.abbreviation}
                      name={srcFr.name}
                      size="sm"
                    />
                  )}
                </span>
                <span className="builtwith__rating">
                  {c.key === 'height' ? formatHeight(player?.height) : (a?.rating ?? '—')}
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      </section>

      <button className="cta preview__cta" onClick={() => navigate('/simulate')}>Simulate Career →</button>
    </motion.main>
  );
}

/** Player headshot with graceful fallback to the data-provided silhouette URL. */
function Headshot({ url, fallback, name }: { url?: string; fallback?: string; name: string }) {
  const [src, setSrc] = useState(url);
  useEffect(() => setSrc(url), [url]);
  if (!src) return <span className="headshot headshot--empty" aria-hidden>?</span>;
  return (
    <img
      className="headshot"
      src={src}
      alt={name}
      loading="lazy"
      onError={() => fallback && src !== fallback && setSrc(fallback)}
    />
  );
}
