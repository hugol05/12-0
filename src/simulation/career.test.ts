import { describe, it, expect } from 'vitest';
import type { PlayerBuild, Ratings, RatingCategory } from '@/types';
import { simulateCareer, projectLeagueTrajectory } from './career';
import type { MarketTier, SimContext, SimFranchise, SimulationResult } from './types';

const RATING_KEYS: RatingCategory[] = [
  'shooting', 'height', 'playmaking', 'defense', 'rebounding', 'athleticism', 'basketballIq', 'clutch', 'durability',
];

// A representative 30-team league. Base ratings spread 68-88, mirroring franchises.json,
// with a market/youth mix so the WS7 trajectory model is exercised by the balance bands.
const MARKET_TIERS: MarketTier[] = ['large', 'mid', 'small'];
function makeFranchises(): SimFranchise[] {
  return Array.from({ length: 30 }, (_, i) => ({
    id: `T${i}`,
    name: `Team ${i}`,
    baseRating2026: 68 + (i % 21), // 68..88
    marketTier: MARKET_TIERS[i % 3],
    youthIndex: (i % 10) / 10, // 0.0 .. 0.9
  }));
}

function uniformRatings(value: number): Ratings {
  const r = {} as Ratings;
  for (const k of RATING_KEYS) r[k] = value;
  return r;
}

function makeBuild(seed: number): PlayerBuild {
  return {
    assignments: [],
    franchise: { franchise: 'T10', decade: '2010s' },
    difficulty: 'normal',
    mode: 'newChapter',
    seed,
    dataVersion: 'test',
  };
}

function runCareer(ratings: Ratings, seed: number): SimulationResult {
  const ctx: SimContext = { build: makeBuild(seed), ratings, franchises: makeFranchises() };
  return simulateCareer(ctx);
}

/** Fraction of runs that achieve a perfect 12-0 across `n` seeds. */
function perfectRate(ratings: Ratings, n: number): number {
  let perfect = 0;
  for (let s = 0; s < n; s++) if (runCareer(ratings, s).finals.perfect) perfect++;
  return perfect / n;
}

describe('simulateCareer determinism', () => {
  it('same build + seed produces an identical result', () => {
    const ratings = uniformRatings(88);
    const a = runCareer(ratings, 4242);
    const b = runCareer(ratings, 4242);
    expect(a).toEqual(b);
  });

  it('different seeds produce different careers', () => {
    const ratings = uniformRatings(88);
    const a = runCareer(ratings, 1);
    const b = runCareer(ratings, 2);
    expect(a).not.toEqual(b);
  });

  it('emits a coherent finals record', () => {
    const res = runCareer(uniformRatings(90), 7);
    expect(res.finals.wins).toBe(res.career.championships);
    expect(res.finals.wins).toBeLessThanOrEqual(12);
    expect(res.career.finalsRecord).toBe(`${res.finals.wins}-${res.finals.losses}`);
    expect(res.seasons.length).toBeGreaterThan(0);
  });

  it('never exceeds the 12-title cap', () => {
    for (let s = 0; s < 50; s++) {
      expect(runCareer(uniformRatings(99), s).career.championships).toBeLessThanOrEqual(12);
    }
  });

  it('roundReached is consistent with the playoff flags every season', () => {
    const STAGES = ['missed', 'firstRound', 'confSemis', 'confFinals', 'finals', 'champion'];
    // sweep ratings/seeds so we exercise misses, early exits, Finals losses, and titles
    for (const value of [80, 88, 95]) {
      for (let s = 0; s < 40; s++) {
        for (const season of runCareer(uniformRatings(value), s).seasons) {
          expect(STAGES).toContain(season.roundReached);
          // boolean flags and the stage must agree
          expect(season.roundReached === 'missed').toBe(!season.madePlayoffs);
          expect(season.roundReached === 'champion').toBe(season.wonChampionship);
          if (season.roundReached === 'finals' || season.roundReached === 'champion') {
            expect(season.madeFinals).toBe(true);
          }
          if (season.madeFinals && !season.wonChampionship) {
            expect(season.roundReached).toBe('finals');
          }
        }
      }
    }
  });
});

describe('franchise trajectory model (WS7)', () => {
  const BASE = 78;
  const mk = (id: string, marketTier: MarketTier, youthIndex: number): SimFranchise => (
    { id, name: id, baseRating2026: BASE, marketTier, youthIndex }
  );
  // average a franchise's rating at a given season index across many seeds (washes out noise)
  function avgAt(f: SimFranchise, seasonIdx: number, seasons: number, n: number): number {
    let sum = 0;
    for (let s = 0; s < n; s++) sum += projectLeagueTrajectory([f], s, seasons).get(f.id)![seasonIdx];
    return sum / n;
  }

  it('large markets trend up over a career (free-agency reload)', () => {
    expect(avgAt(mk('L', 'large', 0.5), 15, 15, 300)).toBeGreaterThan(BASE + 2);
  });

  it('small markets with an old roster regress over a career', () => {
    expect(avgAt(mk('S', 'small', 0.05), 15, 15, 300)).toBeLessThan(BASE - 2);
  });

  it("a young small-market core peaks early then its window closes", () => {
    const f = mk('SY', 'small', 0.9);
    const early = avgAt(f, 5, 15, 300); // mid-window
    const late = avgAt(f, 15, 15, 300); // window long closed
    expect(early).toBeGreaterThan(late);
    expect(early).toBeGreaterThan(BASE); // it actually rose while young
  });

  it('drift is deterministic for a given seed', () => {
    const f = mk('D', 'mid', 0.5);
    expect(projectLeagueTrajectory([f], 99, 10)).toEqual(projectLeagueTrajectory([f], 99, 10));
  });
});

describe('simulateCareer difficulty balance', () => {
  const N = 600;

  it('perfect rolls (all 95) hit 12-0 occasionally but not usually', () => {
    const rate = perfectRate(uniformRatings(95), N);
    // documented target ~20%
    expect(rate).toBeGreaterThan(0.08);
    expect(rate).toBeLessThan(0.4);
  });

  it('good rolls (all 90) rarely go 12-0', () => {
    const rate = perfectRate(uniformRatings(90), N);
    expect(rate).toBeGreaterThan(0.005);
    expect(rate).toBeLessThan(0.12);
  });

  it('average rolls (all 85) almost never go 12-0', () => {
    const rate = perfectRate(uniformRatings(85), N);
    expect(rate).toBeLessThan(0.02);
  });

  it('higher ratings monotonically improve perfect odds', () => {
    const hi = perfectRate(uniformRatings(95), N);
    const mid = perfectRate(uniformRatings(90), N);
    const lo = perfectRate(uniformRatings(85), N);
    expect(hi).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThanOrEqual(lo);
  });
});
