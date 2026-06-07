import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { OvrCategory, Player, Position, RatingCategory, RollBucket } from '@/types';
import { useGameStore, unfilledCategories } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { CATEGORIES, OVR_WEIGHTS, computeOvr } from '@/simulation/categories';
import { PlayerSilhouette } from '@/components/PlayerSilhouette';
import { TeamBadge } from '@/components/TeamBadge';
import { DURATION, cardReveal, pageTransition, pageVariants, slotTransition, staggerContainer } from '@/lib/motion';
import './BuildPlayer.css';

const POS_FILTERS: { label: string; match: (p: Position) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'G', match: (p) => p === 'PG' || p === 'SG' },
  { label: 'F', match: (p) => p === 'SF' || p === 'PF' },
  { label: 'C', match: (p) => p === 'C' },
];

const bucketKey = (b: { franchise: string; decade: string }) => `${b.franchise}:${b.decade}`;

// Slot-reel geometry. A reel is a vertical strip of fillers ending on the real
// value; we translate it up so the final item lands in the one-row window.
const REEL_FILLERS = 18;
const DECADE_DELAY = 0.22; // decade reel lands a beat after the franchise reel

export default function BuildPlayer() {
  const navigate = useNavigate();
  const { data, loading, error } = useGameData();
  const reduced = useReducedMotion() ?? false;

  const difficulty = useGameStore((s) => s.difficulty);
  const assignments = useGameStore((s) => s.assignments);
  const franchise = useGameStore((s) => s.franchise);
  const usedBuckets = useGameStore((s) => s.usedBuckets);
  const rerollsLeft = useGameStore((s) => s.rerollsLeft);
  const assignPlayer = useGameStore((s) => s.assignPlayer);
  const setFranchise = useGameStore((s) => s.setFranchise);
  const markBucketUsed = useGameStore((s) => s.markBucketUsed);
  const useReroll = useGameStore((s) => s.useReroll);
  const advanceRoll = useGameStore((s) => s.advanceRoll);

  const [bucket, setBucket] = useState<RollBucket | null>(null);
  const [selected, setSelected] = useState<Player | null>(null);
  const [filter, setFilter] = useState(0);
  const [search, setSearch] = useState('');

  // Slot-machine spin state — bumped whenever a fresh bucket appears.
  const [spinId, setSpinId] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const needFranchise = !franchise;
  const unfilled = unfilledCategories(assignments);
  const done = assignments.length === 9 && !needFranchise;
  const placements = assignments.length + (franchise ? 1 : 0);

  // pick a random bucket not already used (and not the one currently shown)
  const drawBucket = useCallback(
    (exclude?: string): RollBucket | null => {
      if (!data) return null;
      const used = new Set(usedBuckets);
      if (exclude) used.add(exclude);
      const pool = data.rollIndex.buckets.filter((b) => !used.has(bucketKey(b)));
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [data, usedBuckets],
  );

  // auto-roll a fresh bucket whenever we need one
  useEffect(() => {
    if (!data || done || bucket) return;
    const next = drawBucket();
    if (next) {
      setBucket(next);
      markBucketUsed(bucketKey(next));
    }
  }, [data, done, bucket, drawBucket, markBucketUsed]);

  // spin the reels each time a new bucket lands, then reveal the roster
  const currentKey = bucket ? bucketKey(bucket) : null;
  useEffect(() => {
    if (!currentKey) return;
    setSpinId((n) => n + 1);
    setSpinning(true);
    const ms = (reduced ? DURATION.fast : DURATION.roll) * 1000 + DECADE_DELAY * 1000 + 140;
    const t = setTimeout(() => setSpinning(false), ms);
    return () => clearTimeout(t);
  }, [currentKey, reduced]);

  // when the build is complete, move to preview
  useEffect(() => {
    if (done) navigate('/preview');
  }, [done, navigate]);

  const reroll = () => {
    if (rerollsLeft <= 0 || !bucket || spinning) return;
    const next = drawBucket(bucketKey(bucket));
    if (!next) return;
    markBucketUsed(bucketKey(next));
    setBucket(next);
    setSelected(null);
    useReroll();
  };

  const placeFranchise = () => {
    if (!bucket) return;
    setFranchise({ franchise: bucket.franchise, decade: bucket.decade });
    advanceRoll();
    setBucket(null);
    setSelected(null);
  };

  const assign = (category: RatingCategory) => {
    if (!selected || !bucket) return;
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
    if (!data || !bucket) return [];
    const f = POS_FILTERS[filter].match;
    const q = search.trim().toLowerCase();
    return bucket.playerIds
      .map((id) => data.playersById.get(id))
      .filter((p): p is Player => !!p)
      .filter((p) => p.positions.some(f))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .map((p) => ({ p, ovr: computeOvr(p.ratings) }))
      .sort((a, b) => b.ovr - a.ovr);
  }, [data, bucket, filter, search]);

  // live silhouette + running OVR from what's been assigned so far
  const filled = useMemo(() => {
    const f: Partial<Record<RatingCategory, number>> = {};
    for (const a of assignments) f[a.category] = a.rating;
    return f;
  }, [assignments]);
  const ovrSoFar = useMemo(() => {
    let sum = 0;
    for (const a of assignments) {
      const w = OVR_WEIGHTS[a.category as OvrCategory];
      if (w) sum += a.rating * w;
    }
    return Math.round(sum);
  }, [assignments]);

  const franchisePool = useMemo(() => (data ? data.franchises.map((f) => f.abbreviation) : []), [data]);
  const decadePool = useMemo(
    () => (data ? Array.from(new Set(data.rollIndex.buckets.map((b) => b.decade))) : []),
    [data],
  );

  if (loading) return <main className="build build--center"><p className="muted">Loading rosters…</p></main>;
  if (error) return <main className="build build--center"><p className="muted">Failed to load data: {error}</p></main>;
  if (!data || !bucket) return <main className="build build--center"><p className="muted">Rolling…</p></main>;

  const fr = data.franchisesById.get(bucket.franchise);
  const startFr = franchise ? data.franchisesById.get(franchise.franchise) : null;
  const showStats = difficulty !== 'hard';
  const showOvr = difficulty !== 'hard';
  const showRatingRow = difficulty === 'easy';

  return (
    <motion.main
      className="build"
      variants={pageVariants(reduced)}
      initial="initial"
      animate="enter"
      transition={pageTransition}
    >
      <header className="build__head">
        <div className="build__progress" aria-label={`${placements} of 10 placed`}>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`dot ${i < placements ? 'dot--done' : ''}`} />
          ))}
        </div>
        <p className="build__count">{placements}<span>/10</span></p>
      </header>

      {/* ── slot-machine roll ─────────────────────────────────── */}
      <section className="roll">
        <p className="roll__eyebrow">{needFranchise ? 'Pick a player — or claim this team' : 'Draft a player'}</p>
        <div className="roll__slots">
          <div className="roll__slot">
            <AnimatePresence mode="wait" initial={false}>
              {spinning ? (
                <SlotReel
                  key={`fr-spin-${spinId}`}
                  finalLabel={fr?.abbreviation ?? bucket.franchise}
                  pool={franchisePool}
                  spinId={spinId}
                  reduced={reduced}
                />
              ) : (
                <motion.div
                  key={`fr-land-${spinId}`}
                  className="roll__landed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: DURATION.fast }}
                >
                  <TeamBadge franchiseId={bucket.franchise} abbreviation={fr?.abbreviation} name={fr?.name} size="lg" />
                </motion.div>
              )}
            </AnimatePresence>
            <span className="roll__caption">{fr?.name ?? bucket.franchise}</span>
          </div>

          <div className="roll__slot">
            <AnimatePresence mode="wait" initial={false}>
              {spinning ? (
                <SlotReel
                  key={`dec-spin-${spinId}`}
                  finalLabel={bucket.decade}
                  pool={decadePool}
                  spinId={spinId}
                  reduced={reduced}
                  delay={DECADE_DELAY}
                />
              ) : (
                <motion.div
                  key={`dec-land-${spinId}`}
                  className="roll__landed roll__landed--decade"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: DURATION.fast }}
                >
                  <span className="roll__decade">{bucket.decade}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <span className="roll__caption">Era</span>
          </div>
        </div>
        <button className="roll__reroll" onClick={reroll} disabled={rerollsLeft <= 0 || spinning}>
          ↻ Re-roll · {rerollsLeft} left
        </button>
      </section>

      {/* ── pick / assign ─────────────────────────────────────── */}
      <div className="build__main">
        <AnimatePresence mode="wait" initial={false}>
          {spinning ? (
            <motion.p
              key="rolling"
              className="build__rolling muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Spinning the wheel…
            </motion.p>
          ) : selected ? (
            <motion.section
              key="assign"
              className="assign"
              variants={pageVariants(reduced)}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={pageTransition}
            >
              <button className="assign__back" onClick={() => setSelected(null)}>← back to roster</button>
              <h3 className="assign__title">{selected.name} <span>· {selected.positions.join('/')}</span></h3>
              <p className="muted">Assign to a category:</p>
              <div className="assign__grid">
                {CATEGORIES.map((c) => {
                  const isFilled = !unfilled.includes(c.key);
                  const rating = selected.ratings[c.key];
                  return (
                    <button
                      key={c.key}
                      className="assign__cat"
                      disabled={isFilled}
                      onClick={() => assign(c.key)}
                    >
                      <span className="assign__cat-name">{c.icon} {c.label}</span>
                      {isFilled ? (
                        <span className="muted">filled ✓</span>
                      ) : (
                        <span className="assign__rating">{fitLabel(rating, difficulty)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="pick"
              className="pick"
              variants={pageVariants(reduced)}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={pageTransition}
            >
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

              <motion.ul
                className="pick__list"
                variants={staggerContainer(0.035)}
                initial="hidden"
                animate="show"
              >
                {roster.map(({ p, ovr }) => (
                  <motion.li key={p.id} variants={cardReveal(reduced)}>
                    <button className="player" onClick={() => setSelected(p)}>
                      <span className="player__name">{p.name}</span>
                      <span className="player__pos">{p.positions.join('/')}</span>
                      {showStats && (
                        <span className="player__stats">
                          {p.stats.ppg} PPG · {p.stats.rpg} RPG · {p.stats.apg} APG
                        </span>
                      )}
                      {showOvr && <span className="player__ovr">{ovr}</span>}
                      {showRatingRow && (
                        <span className="player__ratings">
                          {CATEGORIES.map((c) => (
                            <span key={c.key} className="player__rating-chip">
                              {c.icon}<b>{p.ratings[c.key]}</b>
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  </motion.li>
                ))}
              </motion.ul>

              {needFranchise && (
                <button className="pick__franchise" onClick={placeFranchise}>
                  🏠 Start your career on the {fr?.name ?? bucket.franchise}
                </button>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* ── live "your player" stage ──────────────────────────── */}
      <section className="stage">
        <PlayerSilhouette filled={filled} mode="building" size="sm" className="stage__fig" />
        <div className="stage__info">
          <p className="stage__eyebrow">Your player</p>
          <div className="stage__ovr">
            <span className="stage__ovr-num">{assignments.length ? ovrSoFar : '—'}</span>
            <span className="stage__ovr-label">OVR<br />so far</span>
          </div>
          <p className="stage__meta">{assignments.length}/8 attributes · {placements}/10 placed</p>
          {startFr && (
            <p className="stage__team">
              <TeamBadge franchiseId={franchise!.franchise} abbreviation={startFr.abbreviation} name={startFr.name} size="sm" />
              <span>{startFr.name}</span>
            </p>
          )}
        </div>
      </section>
    </motion.main>
  );
}

/** A single slot reel: a strip of random fillers spinning to a stop on `finalLabel`. */
function SlotReel({
  finalLabel,
  pool,
  spinId,
  reduced,
  delay = 0,
}: {
  finalLabel: string;
  pool: string[];
  spinId: number;
  reduced: boolean;
  delay?: number;
}) {
  const items = useMemo(() => {
    const fillers = Array.from({ length: REEL_FILLERS }, () =>
      pool.length ? pool[Math.floor(Math.random() * pool.length)] : finalLabel,
    );
    return [...fillers, finalLabel];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId, finalLabel]);

  const travel = `-${(items.length - 1) * 100}%`;

  return (
    <div className="reel" aria-hidden>
      <motion.div
        className="reel__strip"
        initial={{ y: 0 }}
        animate={{ y: travel }}
        transition={{ ...slotTransition(reduced), delay }}
      >
        {items.map((it, i) => (
          <span className="reel__item" key={i}>{it}</span>
        ))}
      </motion.div>
    </div>
  );
}

function fitLabel(rating: number, difficulty: string): string {
  if (difficulty === 'hard') return 'assign';
  const tier = rating >= 92 ? 'Great fit' : rating >= 82 ? 'Good fit' : rating >= 70 ? 'OK fit' : 'Weak fit';
  if (difficulty === 'easy') return `${tier} · ${rating}`;
  return tier;
}
