import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { Franchise, OvrCategory, Player, Position, RatingCategory, RollBucket } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { CATEGORIES, OVR_WEIGHTS } from '@/simulation/categories';
import { BuildStage, type StageSlot } from '@/components/BuildStage';
import { TeamBadge } from '@/components/TeamBadge';
import { cardReveal, staggerContainer } from '@/lib/motion';
import './BuildPlayer.css';

const POS_FILTERS: { label: string; match: (p: Position) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'G', match: (p) => p === 'PG' || p === 'SG' },
  { label: 'F', match: (p) => p === 'SF' || p === 'PF' },
  { label: 'C', match: (p) => p === 'C' },
];

// Display order of the 9 rings: [0..2] top, [3..5] left column, [6..8] right column.
const STAGE_ORDER: { category: RatingCategory; label: string }[] = [
  { category: 'shooting', label: 'Shooting' },
  { category: 'playmaking', label: 'Playmaking' },
  { category: 'clutch', label: 'Clutch' },
  { category: 'defense', label: 'Defense' },
  { category: 'rebounding', label: 'Rebounding' },
  { category: 'athleticism', label: 'Athleticism' },
  { category: 'height', label: 'Height' },
  { category: 'basketballIq', label: 'IQ' },
  { category: 'durability', label: 'Durability' },
];

const bucketKey = (b: { franchise: string; decade: string }) => `${b.franchise}:${b.decade}`;
const ROLL_MS = 650;

export default function BuildPlayer() {
  const navigate = useNavigate();
  const { data, loading, error } = useGameData();
  const reduced = useReducedMotion() ?? false;

  const difficulty = useGameStore((s) => s.difficulty);
  const assignments = useGameStore((s) => s.assignments);
  const franchise = useGameStore((s) => s.franchise);
  const usedBuckets = useGameStore((s) => s.usedBuckets);
  const rerollTeamLeft = useGameStore((s) => s.rerollTeamLeft);
  const rerollEraLeft = useGameStore((s) => s.rerollEraLeft);
  const rerollFranchiseLeft = useGameStore((s) => s.rerollFranchiseLeft);
  const assignPlayer = useGameStore((s) => s.assignPlayer);
  const setFranchise = useGameStore((s) => s.setFranchise);
  const markBucketUsed = useGameStore((s) => s.markBucketUsed);
  const useRerollTeam = useGameStore((s) => s.useRerollTeam);
  const useRerollEra = useGameStore((s) => s.useRerollEra);
  const useRerollFranchise = useGameStore((s) => s.useRerollFranchise);
  const advanceRoll = useGameStore((s) => s.advanceRoll);

  const [bucket, setBucket] = useState<RollBucket | null>(null);
  const [selected, setSelected] = useState<Player | null>(null);
  const [startRoll, setStartRoll] = useState<Franchise | null>(null);
  const [filter, setFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [rolling, setRolling] = useState(false);

  const attrDone = assignments.length === 9;
  const phase: 'attributes' | 'franchise' | 'done' = !attrDone ? 'attributes' : franchise ? 'done' : 'franchise';
  const placements = assignments.length + (franchise ? 1 : 0);

  // ── attribute phase: draw a fresh bucket whenever we need one ──
  const drawBucket = useCallback((): RollBucket | null => {
    if (!data) return null;
    const used = new Set(usedBuckets);
    const pool = data.rollIndex.buckets.filter((b) => !used.has(bucketKey(b)));
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [data, usedBuckets]);

  useEffect(() => {
    if (!data || phase !== 'attributes' || bucket) return;
    const next = drawBucket();
    if (next) {
      setBucket(next);
      markBucketUsed(bucketKey(next));
    }
  }, [data, phase, bucket, drawBucket, markBucketUsed]);

  // ── franchise phase: roll a starting team ──
  useEffect(() => {
    if (!data || phase !== 'franchise' || startRoll) return;
    setStartRoll(data.franchises[Math.floor(Math.random() * data.franchises.length)]);
  }, [data, phase, startRoll]);

  // brief, smooth roll flourish whenever the rolled subject changes (never blanks the screen)
  const rollSubject = phase === 'franchise' ? startRoll?.id : bucket ? bucketKey(bucket) : null;
  useEffect(() => {
    if (!rollSubject) return;
    setRolling(true);
    const t = setTimeout(() => setRolling(false), reduced ? 0 : ROLL_MS);
    return () => clearTimeout(t);
  }, [rollSubject, reduced]);

  // advance to preview once the starting franchise is locked
  useEffect(() => {
    if (phase === 'done') navigate('/preview');
  }, [phase, navigate]);

  // ── re-rolls (attribute phase) ──
  const teamAlternatives = useMemo(() => {
    if (!data || !bucket) return 0;
    const used = new Set(usedBuckets);
    return data.rollIndex.buckets.filter((b) => b.decade === bucket.decade && b.franchise !== bucket.franchise && !used.has(bucketKey(b))).length;
  }, [data, bucket, usedBuckets]);
  const eraAlternatives = useMemo(() => {
    if (!data || !bucket) return 0;
    const used = new Set(usedBuckets);
    return data.rollIndex.buckets.filter((b) => b.franchise === bucket.franchise && b.decade !== bucket.decade && !used.has(bucketKey(b))).length;
  }, [data, bucket, usedBuckets]);

  const swapBucket = (pred: (b: RollBucket) => boolean) => {
    if (!data || !bucket || rolling) return false;
    const used = new Set(usedBuckets);
    const pool = data.rollIndex.buckets.filter((b) => pred(b) && !used.has(bucketKey(b)));
    if (!pool.length) return false;
    const next = pool[Math.floor(Math.random() * pool.length)];
    markBucketUsed(bucketKey(next));
    setBucket(next);
    setSelected(null);
    return true;
  };
  const rerollTeam = () => {
    if (rerollTeamLeft <= 0 || !bucket) return;
    if (swapBucket((b) => b.decade === bucket.decade && b.franchise !== bucket.franchise)) useRerollTeam();
  };
  const rerollEra = () => {
    if (rerollEraLeft <= 0 || !bucket) return;
    if (swapBucket((b) => b.franchise === bucket.franchise && b.decade !== bucket.decade)) useRerollEra();
  };

  // ── franchise reroll / confirm ──
  const rerollFranchise = () => {
    if (!data || rerollFranchiseLeft <= 0 || !startRoll || rolling) return;
    const pool = data.franchises.filter((f) => f.id !== startRoll.id);
    if (!pool.length) return;
    setStartRoll(pool[Math.floor(Math.random() * pool.length)]);
    useRerollFranchise();
  };
  const confirmFranchise = () => {
    if (!startRoll) return;
    setFranchise({ franchise: startRoll.id, decade: '2020s' });
    advanceRoll();
  };

  // ── assignment ──
  const assign = (category: RatingCategory) => {
    if (!selected || !bucket) return;
    if (assignments.some((a) => a.category === category)) return;
    assignPlayer({
      category,
      playerId: selected.id,
      rating: selected.ratings[category],
      source: { franchise: bucket.franchise, decade: bucket.decade },
    });
    advanceRoll();
    setBucket(null);
    setSelected(null);
  };

  const roster = useMemo(() => {
    if (!data || !bucket) return [] as Player[];
    const f = POS_FILTERS[filter].match;
    const q = search.trim().toLowerCase();
    return bucket.playerIds
      .map((id) => data.playersById.get(id))
      .filter((p): p is Player => !!p)
      .filter((p) => p.positions.some(f))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => b.ratings[STAGE_ORDER[0].category] - a.ratings[STAGE_ORDER[0].category]);
  }, [data, bucket, filter, search]);

  // running OVR = weighted average over the OVR categories assigned so far
  const ovrSoFar = useMemo(() => {
    let num = 0;
    let den = 0;
    for (const a of assignments) {
      const w = OVR_WEIGHTS[a.category as OvrCategory];
      if (w) { num += a.rating * w; den += w; }
    }
    return den ? Math.round(num / den) : null;
  }, [assignments]);

  // build the 9 ring slots
  const slots: StageSlot[] = useMemo(() => {
    return STAGE_ORDER.map(({ category, label }) => {
      const a = assignments.find((x) => x.category === category);
      if (a) {
        const pl = data?.playersById.get(a.playerId);
        const photoUrl = pl && pl.photo.status === 'verified' ? pl.photo.url : undefined;
        return { category, label, fill: { rating: a.rating, playerName: pl?.name ?? '—', photoUrl } };
      }
      const open = phase === 'attributes' && !!selected && !rolling;
      return { category, label, highlighted: open, onClick: open ? () => assign(category) : undefined };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, data, selected, phase, rolling]);

  if (loading) return <main className="build build--center"><p className="muted">Loading rosters…</p></main>;
  if (error) return <main className="build build--center"><p className="muted">Failed to load data: {error}</p></main>;
  if (!data) return <main className="build build--center"><p className="muted">Rolling…</p></main>;

  const fr = bucket ? data.franchisesById.get(bucket.franchise) : null;
  const showStats = difficulty !== 'hard';
  const showRatings = difficulty !== 'hard'; // category ratings revealed once a player is selected

  return (
    <main className="build">
      <header className="build__head">
        <div className="build__progress" aria-label={`${placements} of 10 placed`}>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`dot ${i < placements ? 'dot--done' : ''}`} />
          ))}
        </div>
        <p className="build__count">{placements}<span>/10</span></p>
      </header>

      {/* ── centerpiece: silhouette + 9 category rings ── */}
      <BuildStage slots={slots} ovr={ovrSoFar} className="build__stage" />

      {phase === 'done' ? (
        <p className="build__entering muted">Entering your career…</p>
      ) : phase === 'franchise' ? (
        <FranchisePanel
          fr={startRoll}
          rolling={rolling}
          rerollLeft={rerollFranchiseLeft}
          onReroll={rerollFranchise}
          onConfirm={confirmFranchise}
        />
      ) : (
        <>
          {/* ── roll (team + era), smooth + always visible ── */}
          <section className="roll2">
            <Reel
              className="roll2__team"
              rolling={rolling || !bucket}
              pool={data.franchises.map((f) => f.abbreviation)}
              render={() => <TeamBadge franchiseId={bucket!.franchise} abbreviation={fr?.abbreviation} name={fr?.name} size="md" />}
              shuffleRender={(s) => <span className="roll2__shuf">{s}</span>}
            />
            <Reel
              className="roll2__era"
              rolling={rolling || !bucket}
              pool={data.rollIndex.buckets.map((b) => b.decade)}
              render={() => <span className="roll2__decade">{bucket!.decade}</span>}
              shuffleRender={(s) => <span className="roll2__shuf">{s}</span>}
            />
            <div className="roll2__rerolls">
              <button className="reroll" onClick={rerollTeam} disabled={rerollTeamLeft <= 0 || rolling || teamAlternatives === 0}>
                ↻ Team · {rerollTeamLeft}
              </button>
              <button className="reroll" onClick={rerollEra} disabled={rerollEraLeft <= 0 || rolling || eraAlternatives === 0}>
                ↻ Era · {rerollEraLeft}
              </button>
            </div>
          </section>

          {/* ── active player's 9 ratings (assign by clicking a ring or a chip) ── */}
          {selected && (
            <section className="ratingrow" aria-label={`${selected.name} ratings`}>
              <p className="ratingrow__name">{selected.name} <span>· {selected.positions.join('/')}</span></p>
              <div className="ratingrow__chips">
                {CATEGORIES.map((c) => {
                  const taken = assignments.some((a) => a.category === c.key);
                  return (
                    <button
                      key={c.key}
                      className={`chip ${taken ? 'chip--taken' : 'chip--open'}`}
                      disabled={taken}
                      onClick={() => assign(c.key)}
                      title={taken ? 'Already filled' : `Assign ${c.label}`}
                    >
                      <span className="chip__cat">{c.icon}</span>
                      {showRatings ? <b className="chip__val">{selected.ratings[c.key]}</b> : <b className="chip__val">＋</b>}
                    </button>
                  );
                })}
              </div>
              <p className="ratingrow__hint">{selected ? 'Tap a glowing ring (or a chip) to lock this player into a category' : ''}</p>
            </section>
          )}

          {/* ── player list ── */}
          <section className="pick">
            <div className="pick__controls">
              <div className="pick__filters">
                {POS_FILTERS.map((f, i) => (
                  <button key={f.label} className={`pill ${i === filter ? 'pill--active' : ''}`} onClick={() => setFilter(i)}>{f.label}</button>
                ))}
              </div>
              <input
                className="pick__search"
                placeholder="Search player…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <motion.ul className="pick__list" variants={staggerContainer(0.03)} initial="hidden" animate="show">
              {roster.map((p) => {
                const isActive = selected?.id === p.id;
                return (
                  <motion.li key={p.id} variants={cardReveal(reduced)}>
                    <button className={`player ${isActive ? 'player--active' : ''}`} onClick={() => setSelected(isActive ? null : p)}>
                      <span className="player__name">{p.name}</span>
                      <span className="player__pos">{p.positions.join('/')}</span>
                      {showStats && (
                        <span className="player__stats">{p.stats.ppg} PPG · {p.stats.rpg} RPG · {p.stats.apg} APG</span>
                      )}
                      {isActive && <span className="player__active">selecting →</span>}
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          </section>
        </>
      )}
    </main>
  );
}

/** A small reel that rapidly shuffles random pool values while `rolling`, then shows the real content. */
function Reel({
  rolling,
  pool,
  render,
  shuffleRender,
  className = '',
}: {
  rolling: boolean;
  pool: string[];
  render: () => ReactNode;
  shuffleRender: (s: string) => ReactNode;
  className?: string;
}) {
  const [shuf, setShuf] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!rolling || pool.length === 0) {
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
      return;
    }
    timer.current = setInterval(() => {
      setShuf(pool[Math.floor(Math.random() * pool.length)]);
    }, 70);
    return () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  }, [rolling, pool]);
  return <div className={`reel2 ${className}`}>{rolling ? shuffleRender(shuf) : render()}</div>;
}

/** Strength / age / market are masked into readable labels so the player reads good-future vs win-now. */
function strengthLabel(r: number): { label: string; tone: string } {
  if (r >= 85) return { label: 'Title contender', tone: 'hot' };
  if (r >= 78) return { label: 'Playoff team', tone: 'warm' };
  if (r >= 70) return { label: 'Play-in hopeful', tone: 'mid' };
  return { label: 'Rebuilding', tone: 'cold' };
}
function ageLabel(youth: number | undefined): string {
  const y = youth ?? 0.5;
  if (y >= 0.66) return 'Young core';
  if (y >= 0.33) return 'Balanced roster';
  return 'Veteran team';
}
function marketLabel(tier: string | undefined): string {
  if (tier === 'large') return 'Big market';
  if (tier === 'small') return 'Small market';
  return 'Mid market';
}
function verdict(r: number, youth: number | undefined): string {
  const young = (youth ?? 0.5) >= 0.55;
  if (r >= 85) return young ? 'Loaded and young — win now and later.' : 'Win-now window — immediate impact.';
  if (r >= 78) return young ? 'On the rise — a young playoff core.' : 'Solid now — push for more.';
  if (r >= 70) return young ? 'Bright future — grow with a young core.' : "Middling — you're the difference.";
  return 'A project — you carry the rebuild.';
}

function FranchisePanel({
  fr,
  rolling,
  rerollLeft,
  onReroll,
  onConfirm,
}: {
  fr: Franchise | null;
  rolling: boolean;
  rerollLeft: number;
  onReroll: () => void;
  onConfirm: () => void;
}) {
  if (!fr) return <section className="franpanel"><p className="muted">Rolling your team…</p></section>;
  const str = strengthLabel(fr.baseRating2026);
  return (
    <section className="franpanel">
      <p className="franpanel__eyebrow">Your starting franchise</p>
      <div className={`franpanel__card ${rolling ? 'franpanel__card--rolling' : ''}`}>
        <TeamBadge franchiseId={fr.id} abbreviation={fr.abbreviation} name={fr.name} size="lg" />
        <h2 className="franpanel__name">{fr.name}</h2>
        <div className="franpanel__tags">
          <span className={`ftag ftag--${str.tone}`}>{str.label}</span>
          <span className="ftag">{ageLabel(fr.youthIndex)}</span>
          <span className="ftag">{marketLabel(fr.marketTier)}</span>
        </div>
        <p className="franpanel__verdict">{verdict(fr.baseRating2026, fr.youthIndex)}</p>
      </div>
      <div className="franpanel__actions">
        <button className="reroll" onClick={onReroll} disabled={rerollLeft <= 0 || rolling}>↻ Re-roll team · {rerollLeft}</button>
        <button className="franpanel__go" onClick={onConfirm} disabled={rolling}>Start career →</button>
      </div>
    </section>
  );
}
