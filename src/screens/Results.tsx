import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import './Results.css';

export default function Results() {
  const navigate = useNavigate();
  const { data } = useGameData();
  const result = useGameStore((s) => s.result);
  const reset = useGameStore((s) => s.reset);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!result) navigate('/');
  }, [result, navigate]);

  if (!result) return null;

  const { career, finals, legacyTier, seasons, startingFranchise } = result;
  const startTeam = data?.franchisesById.get(startingFranchise)?.name ?? startingFranchise;
  const perfect = finals.perfect;

  const playAgain = () => { reset(); navigate('/'); };

  const share = async () => {
    const line = `I went ${finals.wins}\u2013${finals.losses} in the Finals on 12-0. Legacy: ${legacyTier}.`;
    try {
      if (navigator.share) await navigator.share({ title: '12-0', text: line });
      else { await navigator.clipboard.writeText(line); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* user dismissed share sheet */ }
  };

  return (
    <main className="results">
      <article className={`poster ${perfect ? 'poster--perfect' : ''}`}>
        <header className="poster__head">
          <span className="poster__brand">12&ndash;0</span>
          <span className="poster__tier">{legacyTier}</span>
        </header>

        <div className="poster__hero">
          <span className="poster__record">{finals.wins}&ndash;{finals.losses}</span>
          <span className="poster__record-label">Finals Record</span>
          {perfect && <span className="poster__perfect">PERFECT — RECORD BROKEN</span>}
        </div>

        <div className="poster__grid">
          <Stat label="Championships" value={career.championships} />
          <Stat label="MVPs" value={career.mvps} />
          <Stat label="Finals MVP" value={career.finalsMvps} />
          <Stat label="All-Star" value={career.allStars} />
          <Stat label="All-NBA" value={career.allNba} />
          <Stat label="DPOY" value={career.dpoys} />
          <Stat label="Seasons" value={career.seasonsPlayed} />
          <Stat label="Peak OVR" value={career.peakOvr} />
        </div>

        <div className="poster__totals">
          <span>{fmt(career.totals.points)} PTS</span>
          <span>{fmt(career.totals.rebounds)} REB</span>
          <span>{fmt(career.totals.assists)} AST</span>
        </div>

        <footer className="poster__foot">Started on the {startTeam}</footer>
      </article>

      <div className="results__actions">
        <button className="cta" onClick={share}>{copied ? 'Copied!' : 'Share'}</button>
        <button className="ghost" onClick={playAgain}>Play Again</button>
      </div>

      <button className="results__archive-toggle" onClick={() => setArchiveOpen((v) => !v)}>
        Career archive {archiveOpen ? '▲' : '▼'}
      </button>
      {archiveOpen && (
        <ul className="archive">
          {seasons.map((s) => (
            <li key={s.seasonIndex} className={`archive__row ${s.wonChampionship ? 'archive__row--ring' : ''}`}>
              <span className="archive__age">{s.age}</span>
              <span className="archive__team">{data?.franchisesById.get(s.team)?.abbreviation ?? s.team}</span>
              <span className="archive__rec">{s.wins}-{s.losses}</span>
              <span className="archive__stat">{s.stats.ppg}/{s.stats.rpg}/{s.stats.apg}</span>
              <span className="archive__tag">{s.wonChampionship ? '🏆' : s.madeFinals ? 'F' : s.madePlayoffs ? 'P' : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
