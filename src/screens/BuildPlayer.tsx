import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Player, Position, RatingCategory, RollBucket } from '@/types';
import { useGameStore, unfilledCategories } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { CATEGORIES, computeOvr } from '@/simulation/categories';
import './BuildPlayer.css';

const POS_FILTERS: { label: string; match: (p: Position) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'G', match: (p) => p === 'PG' || p === 'SG' },
  { label: 'F', match: (p) => p === 'SF' || p === 'PF' },
  { label: 'C', match: (p) => p === 'C' },
];

const bucketKey = (b: { franchise: string; decade: string }) => `${b.franchise}:${b.decade}`;

export default function BuildPlayer() {
  const navigate = useNavigate();
  const { data, loading, error } = useGameData();

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

  // when the build is complete, move to preview
  useEffect(() => {
    if (done) navigate('/preview');
  }, [done, navigate]);

  const reroll = () => {
    if (rerollsLeft <= 0 || !bucket) return;
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

  if (loading) return <main className="build build--center"><p className="muted">Loading rosters…</p></main>;
  if (error) return <main className="build build--center"><p className="muted">Failed to load data: {error}</p></main>;
  if (!data || !bucket) return <main className="build build--center"><p className="muted">Rolling…</p></main>;

  const fr = data.franchisesById.get(bucket.franchise);
  const showStats = difficulty !== 'hard';
  const showOvr = difficulty !== 'hard';

  return (
    <main className="build">
      <header className="build__head">
        <div className="build__progress">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`dot ${i < placements ? 'dot--done' : ''}`} />
          ))}
        </div>
        <p className="build__count">{placements}/10 placed</p>
      </header>

      <section className="roll">
        <div className="roll__slots">
          <div className="roll__slot">
            <span className="roll__abbr">{bucket.franchise}</span>
            <span className="roll__name">{fr?.name ?? bucket.franchise}</span>
          </div>
          <div className="roll__slot">
            <span className="roll__abbr">{bucket.decade}</span>
            <span className="roll__name">Era</span>
          </div>
        </div>
        <button className="roll__reroll" onClick={reroll} disabled={rerollsLeft <= 0}>
          ↻ Re-roll · {rerollsLeft} left
        </button>
      </section>

      {selected ? (
        <section className="assign">
          <button className="assign__back" onClick={() => setSelected(null)}>← back to roster</button>
          <h3 className="assign__title">{selected.name} · {selected.positions.join('/')}</h3>
          <p className="muted">Assign to a category:</p>
          <div className="assign__grid">
            {CATEGORIES.map((c) => {
              const filled = !unfilled.includes(c.key);
              const rating = selected.ratings[c.key];
              return (
                <button
                  key={c.key}
                  className="assign__cat"
                  disabled={filled}
                  onClick={() => assign(c.key)}
                >
                  <span>{c.icon} {c.label}</span>
                  {filled ? <span className="muted">filled ✓</span> : <span className="assign__rating">{fitLabel(rating, difficulty)}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
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

          <ul className="pick__list">
            {roster.map(({ p, ovr }) => (
              <li key={p.id}>
                <button className="player" onClick={() => setSelected(p)}>
                  <span className="player__name">{p.name}</span>
                  <span className="player__pos">{p.positions.join('/')}</span>
                  {showStats && (
                    <span className="player__stats">
                      {p.stats.ppg} PPG · {p.stats.rpg} RPG · {p.stats.apg} APG
                    </span>
                  )}
                  {showOvr && <span className="player__ovr">{ovr}</span>}
                </button>
              </li>
            ))}
          </ul>

          {needFranchise && (
            <button className="pick__franchise" onClick={placeFranchise}>
              🏠 Start your career on the {fr?.name ?? bucket.franchise}
            </button>
          )}
        </section>
      )}
    </main>
  );
}

function fitLabel(rating: number, difficulty: string): string {
  if (difficulty === 'hard') return 'assign';
  const tier = rating >= 92 ? 'Great fit' : rating >= 82 ? 'Good fit' : rating >= 70 ? 'OK fit' : 'Weak fit';
  if (difficulty === 'easy') return `${tier} · ${rating}`;
  return tier;
}
