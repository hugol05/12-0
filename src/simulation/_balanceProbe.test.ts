import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { simulateCareer } from './career';
import { computeOvr } from './categories';
import type { Player, Ratings, RatingCategory, PlayerBuild, Decade } from '@/types';
import type { SimFranchise } from './types';

const DATA = join(process.cwd(), 'public', 'data');
const players: Player[] = JSON.parse(readFileSync(join(DATA, 'players.json'), 'utf8'));
const franchises: SimFranchise[] = JSON.parse(readFileSync(join(DATA, 'franchises.json'), 'utf8'));
const roll = JSON.parse(readFileSync(join(DATA, 'roll-index.json'), 'utf8'));
const buckets: { franchise: string; decade: string; playerIds: string[] }[] = roll.buckets;
const byId = new Map(players.map((p) => [p.id, p]));

const CATS: RatingCategory[] = ['shooting', 'playmaking', 'defense', 'clutch', 'athleticism', 'rebounding', 'height', 'basketballIq', 'durability'];

function rngInt(s: { v: number }, n: number): number { s.v = (s.v * 1103515245 + 12345) & 0x7fffffff; return s.v % n; }

type Build = { ratings: Ratings; franchise: string };

/** Controlled band: every OVR category (and durability) pinned to T, so computeOvr ≈ T. */
function bandBuild(T: number): (s: { v: number }) => Build {
  const r: Partial<Ratings> = {};
  for (const c of CATS) r[c] = T;
  return (s) => ({ ratings: r as Ratings, franchise: franchises[rngInt(s, franchises.length)].id });
}

/**
 * Realistic play tiers. Each of the 9 rolls hands a bucket; we take a value for that category at a
 * percentile of the rolled bucket — optimal play grabs the best available, weaker play settles lower.
 */
function tierBuild(pct: number): (s: { v: number }) => Build {
  return (s) => {
    const r: Partial<Ratings> = {};
    for (const c of CATS) {
      const b = buckets[rngInt(s, buckets.length)];
      const vals = b.playerIds.map((id) => byId.get(id)?.ratings[c]).filter((v): v is number => v != null).sort((a, z) => a - z);
      r[c] = vals.length ? vals[Math.min(vals.length - 1, Math.floor(pct * vals.length))] : 70;
    }
    // play skill also shows in franchise choice: optimal picks a strong team, weak picks at random
    const fr = pct >= 0.99
      ? [...franchises].sort((a, b) => b.baseRating2026 - a.baseRating2026)[rngInt(s, 5)]
      : franchises[rngInt(s, franchises.length)];
    return { ratings: r as Ratings, franchise: fr.id };
  };
}

const GLOBAL_MAX: Ratings = (() => {
  const r: Partial<Ratings> = {};
  for (const c of CATS) r[c] = Math.max(...players.map((p) => p.ratings[c]));
  return r as Ratings;
})();
function perfectBuild(s: { v: number }): Build {
  const fr = [...franchises].sort((a, b) => b.baseRating2026 - a.baseRating2026)[0];
  void s;
  return { ratings: GLOBAL_MAX, franchise: fr.id };
}

function run(make: (s: { v: number }) => Build, n: number, label: string) {
  const seed = { v: 987654321 };
  let twelve = 0, perfect = 0, anyTitle = 0, titles = 0, ovrSum = 0, clutchSum = 0, lossSum = 0, seasonSum = 0;
  const hist = new Array(13).fill(0);
  // win-distribution tracking (across all seasons, and specifically champion seasons)
  let winSeasons = 0, winSum = 0, w70 = 0, w72 = 0, w76 = 0, w78 = 0;
  let champSeasons = 0, champWinSum = 0;
  for (let i = 0; i < n; i++) {
    const { ratings, franchise } = make(seed);
    const build: PlayerBuild = {
      assignments: [], franchise: { franchise, decade: '2020s' as Decade },
      difficulty: 'normal', mode: 'newChapter', seed: rngInt(seed, 1e9), dataVersion: 'probe',
    };
    const res = simulateCareer({ build, ratings, franchises });
    const c = res.career.championships;
    if (res.finals.perfect) perfect++;
    if (c >= 12) twelve++;
    if (c > 0) anyTitle++;
    titles += c;
    lossSum += res.finals.losses;
    seasonSum += res.career.seasonsPlayed;
    hist[Math.min(12, c)]++;
    ovrSum += computeOvr(ratings); clutchSum += ratings.clutch;
    for (const s of res.seasons) {
      winSeasons++; winSum += s.wins;
      if (s.wins >= 70) w70++;
      if (s.wins >= 72) w72++;
      if (s.wins >= 76) w76++;
      if (s.wins >= 78) w78++;
      if (s.wonChampionship) { champSeasons++; champWinSum += s.wins; }
    }
  }
  const pct = (x: number) => `${(100 * x / n).toFixed(1)}%`;
  const pctOf = (x: number, d: number) => `${(100 * x / d).toFixed(2)}%`;
  console.log(`\n[${label}] n=${n} avgOVR=${(ovrSum / n).toFixed(1)} avgClutch=${(clutchSum / n).toFixed(1)} avgSeasons=${(seasonSum / n).toFixed(1)}`);
  console.log(`  avg rings: ${(titles / n).toFixed(2)} | 12 rings: ${pct(twelve)} | 12-0: ${pct(perfect)} | avg Finals losses: ${(lossSum / n).toFixed(2)} | 0 rings: ${pct(hist[0])}`);
  console.log(`  ring histogram 0..12: ${hist.join(' ')}`);
  console.log(`  avg wins/season: ${(winSum / winSeasons).toFixed(1)} | avg wins in champ seasons: ${champSeasons ? (champWinSum / champSeasons).toFixed(1) : 'n/a'} (n=${champSeasons})`);
  console.log(`  win-total tail: >=70: ${pctOf(w70, winSeasons)} | >=72: ${pctOf(w72, winSeasons)} | >=76: ${pctOf(w76, winSeasons)} | >=78: ${pctOf(w78, winSeasons)}`);
}

/** A fixed, explicit build (named real-player scenario) repeated over many career seeds. */
function fixedBuild(r: Ratings): (s: { v: number }) => Build {
  return (s) => ({ ratings: r, franchise: [...franchises].sort((a, b) => b.baseRating2026 - a.baseRating2026)[rngInt(s, 6)].id });
}
// Owner's real 94-OVR build (Ray Allen / Shaq / Mourning / Payton / Thurmond ...). Target: 8-11 rings,
// 0-5 Finals losses, 12-0 only ~1-in-7 — NOT a routine 12-0.
const BUILD_94: Ratings = { shooting: 96, height: 88, playmaking: 88, defense: 99, rebounding: 98, athleticism: 92, basketballIq: 99, clutch: 95, durability: 90 };
// A true "god build": elite at everything incl. 99 clutch. Target: ~90% to go 12-0 with monster stats.
const BUILD_GOD: Ratings = { shooting: 98, height: 96, playmaking: 97, defense: 99, rebounding: 99, athleticism: 97, basketballIq: 98, clutch: 99, durability: 97 };

// On-demand balance harness — excluded from the normal suite. Run with:
//   BALANCE=1 npx vitest run src/simulation/_balanceProbe.test.ts
describe.runIf(!!process.env.BALANCE)('balance probe (real pool + real engine)', () => {
  it('named builds — target: 94-OVR ~8-11 rings/0-5 losses/12-0 ~14%; god ~90% 12-0', () => {
    run(fixedBuild(BUILD_94), 4000, `OWNER 94-OVR (clutch 95)  computeOvr=${computeOvr(BUILD_94)}`);
    run(fixedBuild(BUILD_GOD), 4000, `GOD BUILD (clutch 99)     computeOvr=${computeOvr(BUILD_GOD)}`);
    run(perfectBuild, 4000, 'PERFECT (global-max each cat)');
    expect(true).toBe(true);
  });
  it('fixed OVR bands (uniform — clutch == OVR)', () => {
    for (const T of [85, 88, 90, 92, 95, 97]) run(bandBuild(T), 4000, `BAND OVR ${T}`);
    expect(true).toBe(true);
  });
  it('play tiers — target: optimal ~20%/8% (12 rings/12-0), normal ~8 avg, average 4-6, bad 0-2', () => {
    run(tierBuild(1.0), 4000, 'OPTIMAL (best-in-bucket + top franchise)');
    run(tierBuild(0.85), 4000, 'KNOWLEDGEABLE (high pick)');
    run(tierBuild(0.5), 4000, 'AVERAGE (median pick)');
    run(tierBuild(0.15), 4000, 'BAD (low pick)');
    expect(true).toBe(true);
  });
});
