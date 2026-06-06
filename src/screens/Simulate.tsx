import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerBuild } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { loadManifest } from '@/data/loadGameData';
import { assignmentsToRatings } from '@/simulation/career';
import { runCareerInWorker } from '@/simulation/runCareer';
import type { SimContext, SeasonResult } from '@/simulation/types';
import './Simulate.css';

const SEASON_MS = 700;

export default function Simulate() {
  const navigate = useNavigate();
  const { data } = useGameData();
  const assignments = useGameStore((s) => s.assignments);
  const franchise = useGameStore((s) => s.franchise);
  const difficulty = useGameStore((s) => s.difficulty);
  const mode = useGameStore((s) => s.mode);
  const storedSeed = useGameStore((s) => s.seed);
  const setSeed = useGameStore((s) => s.setSeed);
  const result = useGameStore((s) => s.result);
  const setResult = useGameStore((s) => s.setResult);

  const ready = assignments.length === 9 && !!franchise;
  const [revealed, setRevealed] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const startedRef = useRef(false);

  // lock in a seed for this run (stable across re-renders / replays)
  const seed = useMemo(() => {
    if (storedSeed != null) return storedSeed;
    const s = Math.floor(Math.random() * 0xffffffff);
    setSeed(s);
    return s;
  }, [storedSeed, setSeed]);

  useEffect(() => {
    if (!ready) { navigate('/build'); return; }
  }, [ready, navigate]);

  // kick off the simulation once data + build are ready
  useEffect(() => {
    if (!ready || !data || startedRef.current) return;
    startedRef.current = true;
    loadManifest().then((manifest) => {
      const build: PlayerBuild = {
        assignments, franchise: franchise!, difficulty, mode, seed, dataVersion: manifest.dataVersion,
      };
      const ctx: SimContext = {
        build,
        ratings: assignmentsToRatings(assignments),
        franchises: data.franchises.map((f) => ({ id: f.id, name: f.name, baseRating2026: f.baseRating2026 })),
      };
      return runCareerInWorker(ctx);
    }).then((r) => setResult(r)).catch(() => navigate('/preview'));
  }, [ready, data, assignments, franchise, difficulty, mode, seed, setResult, navigate]);

  const seasons = result?.seasons ?? [];

  // step through the seasons on a timer
  useEffect(() => {
    if (!result || skipped) return;
    if (revealed >= seasons.length) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), SEASON_MS);
    return () => clearTimeout(t);
  }, [result, revealed, seasons.length, skipped]);

  const finished = !!result && (skipped || revealed >= seasons.length);
  const shown = skipped ? seasons : seasons.slice(0, revealed);
  const rings = shown.filter((s) => s.wonChampionship).length;
  const finalsLosses = shown.filter((s) => s.madeFinals && !s.wonChampionship).length;
  const current = shown[shown.length - 1];

  if (!ready) return null;

  return (
    <main className="sim">
      <div className="sim__counter">
        <div className="sim__ring-box">
          <span className="sim__ring-num">{rings}</span>
          <span className="sim__ring-label">RINGS</span>
        </div>
        <div className="sim__record">
          Finals <strong>{rings}&ndash;{finalsLosses}</strong>
        </div>
      </div>

      {!result && <p className="muted sim__status">Simulating career…</p>}

      {current && (
        <div className={`season ${current.wonChampionship ? 'season--ring' : current.madeFinals ? 'season--finals' : ''}`}>
          <div className="season__top">
            <span className="season__age">Age {current.age}</span>
            <span className="season__team">{teamName(data, current.team)}</span>
            <span className="season__ovr">{current.ovr} OVR</span>
          </div>
          <div className="season__record">{current.wins}&ndash;{current.losses}</div>
          <div className="season__stats">
            {current.stats.ppg} PPG · {current.stats.rpg} RPG · {current.stats.apg} APG
          </div>
          <div className="season__tag">{seasonTag(current)}</div>
          {current.awards.length > 0 && <div className="season__awards">{current.awards.join(' · ')}</div>}
        </div>
      )}

      <div className="sim__actions">
        {!finished ? (
          <button className="ghost" onClick={() => setSkipped(true)} disabled={!result}>Skip to results →</button>
        ) : (
          <button className="cta" onClick={() => navigate('/results')}>See your legacy →</button>
        )}
      </div>
    </main>
  );
}

function teamName(data: ReturnType<typeof useGameData>['data'], id: string): string {
  return data?.franchisesById.get(id)?.abbreviation ?? id;
}

function seasonTag(s: SeasonResult): string {
  if (s.injury === 'season-ending') return 'Season-ending injury';
  if (s.wonChampionship) return '🏆 CHAMPION';
  if (s.madeFinals) return 'Lost in the Finals';
  if (s.madePlayoffs) return 'Made the playoffs';
  return 'Missed the playoffs';
}
