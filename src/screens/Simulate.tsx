import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { PlayerBuild } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { loadManifest } from '@/data/loadGameData';
import { assignmentsToRatings } from '@/simulation/career';
import { runCareerInWorker } from '@/simulation/runCareer';
import type { SimContext, SeasonResult } from '@/simulation/types';
import { TeamBadge } from '@/components/TeamBadge';
import { cardReveal, goldBurst } from '@/lib/motion';
import './Simulate.css';

// Pacing per docs/visual-design.md Screen 4: regular 1.5s, Finals 2.5s, championship 3s.
const PACE = { regular: 1500, finals: 2500, champion: 3000, kickoff: 650 };
const SEASON_START_YEAR = 2027; // New Chapter: first Finals lands 2026-27

const ROUND_LABEL: Record<SeasonResult['roundReached'], string> = {
  missed: 'Missed the playoffs',
  firstRound: 'Lost in the First Round',
  confSemis: 'Lost in the Conf. Semis',
  confFinals: 'Lost in the Conf. Finals',
  finals: 'Lost in the Finals',
  champion: 'NBA CHAMPION',
};

export default function Simulate() {
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
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

  // step through the seasons, lingering on big moments so they read
  useEffect(() => {
    if (!result || skipped) return;
    if (revealed >= seasons.length) return;
    const justShown = seasons[revealed - 1]; // the card currently on screen
    const delay = !justShown ? PACE.kickoff
      : justShown.wonChampionship ? PACE.champion
      : justShown.madeFinals ? PACE.finals
      : PACE.regular;
    const t = setTimeout(() => setRevealed((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [result, revealed, seasons, skipped]);

  const finished = !!result && (skipped || revealed >= seasons.length);
  const shown = skipped ? seasons : seasons.slice(0, revealed);
  const rings = shown.filter((s) => s.wonChampionship).length;
  const finalsLosses = shown.filter((s) => s.madeFinals && !s.wonChampionship).length;
  const current = shown[shown.length - 1];
  const prev = shown[shown.length - 2];
  const moved = !!prev && !!current && prev.team !== current.team;

  // haptic + nothing else: the gold burst is visual. Pulse the device on a ring.
  useEffect(() => {
    if (!current?.wonChampionship || skipped) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(60);
  }, [current?.seasonIndex, current?.wonChampionship, skipped]);

  if (!ready) return null;

  const abbr = (id: string) => data?.franchisesById.get(id)?.abbreviation ?? id;
  const teamName = (id: string) => data?.franchisesById.get(id)?.name ?? id;

  return (
    <main className="sim">
      <div className="sim__counter">
        <span className="sim__eyebrow">Finals Record</span>
        <div className="sim__record">
          <span className="sim__record-num">{rings}</span>
          <span className="sim__record-dash">&ndash;</span>
          <span className="sim__record-num sim__record-num--loss">{finalsLosses}</span>
        </div>
        <div className="sim__rings" aria-hidden>
          {Array.from({ length: Math.min(rings, 12) }).map((_, i) => (
            <span key={i} className="sim__ring-dot" />
          ))}
          {rings > 12 && <span className="sim__ring-more">+{rings - 12}</span>}
        </div>
      </div>

      {!result && <p className="muted sim__status">Simulating career…</p>}

      <div className="sim__stage">
        {/* A changing `key` remounts the single card so the entrance re-fires each
            season — no AnimatePresence (exit-removal is unreliable on React 19). */}
        {current && (
            <motion.div
              key={current.seasonIndex}
              className={`season ${current.wonChampionship ? 'season--ring' : current.madeFinals ? 'season--finals' : ''}`}
              variants={cardReveal(reduce)}
              initial="hidden"
              animate="show"
            >
              {moved && (
                <div className="season__moved">
                  Moved to <TeamBadge franchiseId={current.team} abbreviation={abbr(current.team)} name={teamName(current.team)} size="sm" />
                </div>
              )}

              <div className="season__top">
                <span className="season__year">’{String(SEASON_START_YEAR + current.seasonIndex).slice(2)}</span>
                <TeamBadge franchiseId={current.team} abbreviation={abbr(current.team)} name={teamName(current.team)} size="md" />
                <span className="season__age">Age {current.age}</span>
              </div>

              <div className="season__record">
                <span className="season__wins">{current.wins}</span>
                <span className="season__sep">&ndash;</span>
                <span className="season__losses">{current.losses}</span>
                <span className="season__ovr">{current.ovr} OVR</span>
              </div>

              <div className="season__stats">
                <Stat v={current.stats.ppg} l="PPG" />
                <Stat v={current.stats.rpg} l="RPG" />
                <Stat v={current.stats.apg} l="APG" />
              </div>

              <div className={`season__tag ${tagClass(current)}`}>{seasonTag(current)}</div>
              {current.awards.length > 0 && (
                <div className="season__awards">
                  {current.awards.map((a) => <span key={a} className="season__award">{a}</span>)}
                </div>
              )}

              {current.wonChampionship && !reduce && (
                <motion.div
                  className="season__burst"
                  variants={goldBurst(reduce)}
                  initial="hidden"
                  animate="burst"
                  aria-hidden
                />
              )}
            </motion.div>
          )}
      </div>

      <div className="sim__actions">
        {!finished ? (
          <button className="ghost" onClick={() => setSkipped(true)} disabled={revealed < 3}>
            {revealed < 3 ? 'Simulating…' : 'Skip to results →'}
          </button>
        ) : (
          <button className="cta" onClick={() => navigate('/results')}>See your legacy →</button>
        )}
      </div>
    </main>
  );
}

function Stat({ v, l }: { v: number; l: string }) {
  return (
    <div className="season__stat">
      <span className="season__stat-v">{v}</span>
      <span className="season__stat-l">{l}</span>
    </div>
  );
}

function tagClass(s: SeasonResult): string {
  if (s.injury === 'season-ending') return 'season__tag--injury';
  if (s.wonChampionship) return 'season__tag--ring';
  if (s.madeFinals) return 'season__tag--finals';
  return '';
}

function seasonTag(s: SeasonResult): string {
  if (s.injury === 'season-ending') return 'Season-ending injury';
  return ROUND_LABEL[s.roundReached];
}
