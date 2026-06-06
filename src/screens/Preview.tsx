import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { CATEGORIES, computeOvr, OVR_WEIGHTS } from '@/simulation/categories';
import { assignmentsToRatings } from '@/simulation/career';
import { RadarChart } from '@/components/RadarChart';
import type { OvrCategory } from '@/types';
import './Preview.css';

export default function Preview() {
  const navigate = useNavigate();
  const { data } = useGameData();
  const assignments = useGameStore((s) => s.assignments);
  const franchise = useGameStore((s) => s.franchise);

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

  if (!ready) return null;

  const fr = data?.franchisesById.get(franchise!.franchise);

  return (
    <main className="preview">
      <header className="preview__head">
        <p className="muted">Your Created Player</p>
        <div className="preview__ovr">
          <span className="preview__ovr-num">{ovr}</span>
          <span className="preview__ovr-label">OVR</span>
        </div>
        <p className="preview__team">Starting on the {fr?.name ?? franchise!.franchise}</p>
      </header>

      <RadarChart axes={axes} />

      <div className="preview__durability">
        <div className="preview__durability-head">
          <span>🏋️ Durability</span>
          <span className="preview__durability-val">{ratings.durability}</span>
        </div>
        <div className="fuel"><div className="fuel__fill" style={{ width: `${ratings.durability}%` }} /></div>
      </div>

      <section className="builtwith">
        <h3 className="builtwith__title">Built With</h3>
        <ul className="builtwith__list">
          {CATEGORIES.map((c) => {
            const a = assignments.find((x) => x.category === c.key);
            const player = a && data?.playersById.get(a.playerId);
            return (
              <li key={c.key} className="builtwith__row">
                <span className="builtwith__cat">{c.icon} {c.label}</span>
                <span className="builtwith__player">{player?.name ?? '—'}</span>
                <span className="builtwith__rating">{a?.rating ?? '—'}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <button className="cta" onClick={() => navigate('/simulate')}>Simulate Career →</button>
    </main>
  );
}
