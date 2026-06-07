import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { CATEGORIES, computeOvr, OVR_WEIGHTS } from '@/simulation/categories';
import { assignmentsToRatings } from '@/simulation/career';
import { RadarChart } from '@/components/RadarChart';
import { PlayerSilhouette } from '@/components/PlayerSilhouette';
import { TeamBadge } from '@/components/TeamBadge';
import { cardReveal, pageTransition, pageVariants, staggerContainer } from '@/lib/motion';
import type { OvrCategory, RatingCategory } from '@/types';
import './Preview.css';

export default function Preview() {
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;
  const { data } = useGameData();
  const assignments = useGameStore((s) => s.assignments);
  const franchise = useGameStore((s) => s.franchise);
  const difficulty = useGameStore((s) => s.difficulty);

  const ready = assignments.length === 9 && !!franchise;

  // bounce back to build if we somehow landed here without a complete build
  useEffect(() => {
    if (!ready) navigate('/build');
  }, [ready, navigate]);

  const ratings = useMemo(() => assignmentsToRatings(assignments), [assignments]);
  const ovr = computeOvr(ratings);

  const axes = useMemo(
    () =>
      (Object.keys(OVR_WEIGHTS) as OvrCategory[]).map((k) => ({
        label: CATEGORIES.find((c) => c.key === k)?.label.split(' ')[0] ?? k,
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

  return (
    <motion.main
      className="preview"
      variants={pageVariants(reduced)}
      initial="initial"
      animate="enter"
      transition={pageTransition}
    >
      <header className="preview__head">
        <p className="preview__eyebrow">Player Assembled</p>
        <PlayerSilhouette filled={filled} mode="complete" size="lg" className="preview__fig" />
        <div className="preview__ovr">
          <span className="preview__ovr-num">{ovr}</span>
          <span className="preview__ovr-label">OVR</span>
        </div>
        {fr && (
          <p className="preview__team">
            <TeamBadge franchiseId={fr.id} abbreviation={fr.abbreviation} name={fr.name} size="md" />
            <span>Starting on the {fr.name}</span>
          </p>
        )}
        <p className="preview__mode">{difficulty} mode · {franchise!.decade} era</p>
      </header>

      <section className="preview__radar">
        <RadarChart axes={axes} />
      </section>

      <div className="preview__durability">
        <div className="preview__durability-head">
          <span>🏋️ Durability — career fuel</span>
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
                <span className="builtwith__rating">{a?.rating ?? '—'}</span>
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
