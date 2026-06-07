import type { AttributeAssignment, RatingCategory, Ratings } from '@/types';
import { computeOvr } from './categories';
import { SeededRng } from './seededRng';
import type {
  CareerSummary, FinalsSummary, SeasonResult, SeasonStatLine, SimContext, SimulationResult,
} from './types';

// ---- tunable constants (calibrated via career.test.ts Monte Carlo) ----
const START_AGE = 19;
const PLAYOFF_WIN_THRESHOLD = 42;
const SERIES_COEFF = 0.05; // strength delta -> series prob
const ROUND_OPP = [66, 73, 78, 82]; // R1, R2, ConfFinals, Finals baseline opponent strength
const ROUND_STAGES = ['firstRound', 'confSemis', 'confFinals', 'finals'] as const; // round idx -> stage reached
const TITLE_CAP = 12;

const RATING_KEYS: RatingCategory[] = [
  'shooting', 'height', 'playmaking', 'defense', 'rebounding', 'athleticism', 'basketballIq', 'clutch', 'durability',
];

export function assignmentsToRatings(assignments: AttributeAssignment[]): Ratings {
  const r = {} as Ratings;
  for (const k of RATING_KEYS) r[k] = 0;
  for (const a of assignments) r[a.category] = a.rating;
  return r;
}

/** Fraction of peak OVR the player is at, given age and durability. */
function ageFactor(age: number, durability: number): number {
  if (age <= 22) return lerp(0.82, 0.92, (age - START_AGE) / (22 - START_AGE));
  if (age <= 26) return lerp(0.92, 0.98, (age - 22) / 4);
  if (age <= 31) return 0.98 + 0.02 * (1 - Math.abs(29 - age) / 5); // peak ~29, eases 0.98->1.0->0.98
  // decline: rate per year softens with durability
  const k = durability >= 95 ? 0.005 : durability >= 90 ? 0.011 : durability >= 80 ? 0.02 : durability >= 70 ? 0.03 : 0.045;
  return Math.max(0.45, 1.0 - (age - 31) * k);
}

function retirementAge(durability: number): number {
  if (durability >= 95) return 41;
  if (durability >= 90) return 39;
  if (durability >= 80) return 37;
  if (durability >= 70) return 35;
  return 32;
}

function clutchFinalsBonus(clutch: number): number {
  if (clutch >= 95) return 0.18;
  if (clutch >= 90) return 0.14;
  if (clutch >= 85) return 0.1;
  if (clutch >= 75) return 0.04;
  if (clutch >= 65) return 0;
  return -0.06;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function teamStrengthOf(franchiseBase: number, ovr: number): number {
  return franchiseBase * 0.4 + ovr * 0.6;
}

function winsFromStrength(strength: number, rng: SeededRng): number {
  const expected = (strength - 40) * 1.35 + 8;
  const variance = rng.range(-6, 6);
  return Math.max(12, Math.min(73, Math.round(expected + variance)));
}

function seriesWinProb(our: number, opp: number, clutchBonus: number): number {
  return Math.max(0.03, Math.min(0.985, 0.5 + (our - opp) * SERIES_COEFF + clutchBonus));
}

function generateStats(ratings: Ratings, form: number, rng: SeededRng): SeasonStatLine {
  const f = (w: Partial<Record<RatingCategory, number>>) => {
    let sum = 0;
    for (const [k, weight] of Object.entries(w)) sum += ratings[k as RatingCategory] * (weight as number);
    return sum;
  };
  const noise = () => rng.range(0.92, 1.08);
  const ppg = clamp(((f({ shooting: 0.6, athleticism: 0.25, clutch: 0.15 }) / 100) * 34 - 4) * form * noise(), 2, 41);
  const rpg = clamp(((f({ rebounding: 0.5, height: 0.35, athleticism: 0.15 }) / 100) * 15 - 1) * form * noise(), 0.8, 24);
  const apg = clamp(((f({ playmaking: 0.6, basketballIq: 0.3, shooting: 0.1 }) / 100) * 13 - 1) * form * noise(), 0.4, 14);
  const spg = clamp(((f({ defense: 0.5, athleticism: 0.3, basketballIq: 0.2 }) / 100) * 3) * form * noise(), 0.1, 3.5);
  const bpg = clamp(((f({ defense: 0.4, height: 0.45, athleticism: 0.15 }) / 100) * 3.2 - 0.3) * form * noise(), 0, 4);
  const tsPct = clamp(0.42 + (f({ shooting: 0.5, basketballIq: 0.3, height: 0.2 }) / 100) * 0.2 + rng.range(-0.02, 0.02), 0.4, 0.7);
  return {
    ppg: round1(ppg), rpg: round1(rpg), apg: round1(apg), spg: round1(spg), bpg: round1(bpg), tsPct: round3(tsPct),
  };
}

interface LeagueTeam { id: string; rating: number; }

export function simulateCareer(ctx: SimContext): SimulationResult {
  const { build, ratings, franchises } = ctx;
  const rng = new SeededRng(build.seed);
  const peakOvr = computeOvr(ratings);
  const durability = ratings.durability;
  const clutch = ratings.clutch;
  const retireAge = retirementAge(durability);

  // league model: every franchise gets a drifting rating
  const league: LeagueTeam[] = franchises.map((f) => ({ id: f.id, rating: f.baseRating2026 }));
  const leagueById = new Map(league.map((t) => [t.id, t]));
  const startId = build.franchise.franchise;
  let currentTeam = leagueById.get(startId) ? startId : (franchises[0]?.id ?? startId);

  const seasons: SeasonResult[] = [];
  const totals = { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, games: 0 };
  let championships = 0;
  let finalsLosses = 0;
  let mvps = 0, finalsMvps = 0, allStars = 0, allNba = 0, dpoys = 0;
  let seasonsOnCurrentTeam = 0;
  let contractLength = rng.int(3, 6);
  let ovrPenalty = 0;
  const teamsPlayedFor = new Set<string>([currentTeam]);

  let age = START_AGE;
  for (let i = 0; ; i++) {
    // drift league ratings each season
    for (const t of league) t.rating = clamp(t.rating + rng.range(-4, 4), 58, 95);

    const aged = peakOvr * ageFactor(age, durability);
    const ovr = clamp(Math.round(aged - ovrPenalty), 30, 99);
    ovrPenalty = Math.max(0, ovrPenalty - 2);

    const franchiseBase = leagueById.get(currentTeam)?.rating ?? 75;
    const strength = teamStrengthOf(franchiseBase, ovr);

    // injury check (weighted by durability)
    const injuryRisk = durability >= 95 ? 0.05 : durability >= 90 ? 0.08 : durability >= 80 ? 0.12 : durability >= 70 ? 0.17 : 0.26;
    let injury: SeasonResult['injury'];
    let missedGames = 0;
    if (rng.chance(injuryRisk)) {
      const roll = rng.next();
      if (roll < 0.6) { injury = 'minor'; missedGames = rng.int(10, 20); }
      else if (roll < 0.9) { injury = 'major'; missedGames = rng.int(30, 60); ovrPenalty = rng.int(2, 5); }
      else { injury = 'season-ending'; missedGames = rng.int(60, 82); ovrPenalty = rng.int(2, 5); }
    }

    const wins = winsFromStrength(strength, rng);
    const losses = 82 - wins;
    const gp = clamp(Math.round(82 * (0.7 + (durability / 100) * 0.3)) - missedGames + rng.range(-3, 3), 0, 82);

    const form = clamp(aged / peakOvr, 0.5, 1);
    const stats = injury === 'season-ending' ? zeroStats() : generateStats(ratings, form, rng);

    // playoffs
    const madePlayoffs = injury !== 'season-ending' && wins >= PLAYOFF_WIN_THRESHOLD;
    let madeFinals = false;
    let wonChampionship = false;
    // deepest stage reached — derived from the same 4-round sim (no extra RNG).
    let roundReached: SeasonResult['roundReached'] = madePlayoffs ? 'firstRound' : 'missed';
    if (madePlayoffs) {
      let alive = true;
      for (let round = 0; round < 4 && alive; round++) {
        const isFinals = round === 3;
        const isConfFinals = round === 2;
        const bonus = isFinals ? clutchFinalsBonus(clutch) : isConfFinals ? clutchFinalsBonus(clutch) / 2 : 0;
        const opp = clamp(ROUND_OPP[round] + rng.range(-3, 3), 55, 95);
        const prob = seriesWinProb(strength, opp, bonus);
        roundReached = ROUND_STAGES[round]; // reached/playing this round
        if (isFinals) madeFinals = true;
        if (rng.chance(prob)) {
          if (isFinals) { wonChampionship = true; roundReached = 'champion'; }
        } else {
          alive = false;
          if (isFinals) finalsLosses++;
        }
      }
    }

    if (wonChampionship && championships < TITLE_CAP) championships++;
    else if (wonChampionship) { wonChampionship = false; roundReached = 'finals'; } // hard cap at 12 titles

    // awards
    const awards: string[] = [];
    const leagueBest = Math.max(...league.map((t) => t.rating));
    if (ovr >= 96 && wins > 50 && ovr >= leagueBest - 2) { awards.push('MVP'); mvps++; }
    if (wonChampionship && clutch > 80) { awards.push('Finals MVP'); finalsMvps++; }
    if (ovr > 83) { awards.push('All-Star'); allStars++; }
    if (ovr > 90) { awards.push('All-NBA First Team'); allNba++; }
    else if (ovr > 85) { awards.push('All-NBA'); allNba++; }
    if (ratings.defense > 93) { awards.push('DPOY'); dpoys++; }

    totals.points += Math.round(stats.ppg * gp);
    totals.rebounds += Math.round(stats.rpg * gp);
    totals.assists += Math.round(stats.apg * gp);
    totals.steals += Math.round(stats.spg * gp);
    totals.blocks += Math.round(stats.bpg * gp);
    totals.games += gp;

    seasons.push({
      seasonIndex: i, age, team: currentTeam, ovr, teamStrength: round1(strength), wins, losses,
      gamesPlayed: gp, madePlayoffs, madeFinals, wonChampionship, roundReached, injury, stats, awards,
    });

    // retirement
    if (shouldRetire(age, retireAge, ovr, injury, championships, rng)) break;
    if (i > 30) break; // safety

    // movement (off-season)
    seasonsOnCurrentTeam++;
    if (seasonsOnCurrentTeam >= contractLength && rng.chance(0.6)) {
      const dest = pickDestination(league, currentTeam, ovr, rng);
      if (dest && dest !== currentTeam) {
        currentTeam = dest;
        teamsPlayedFor.add(dest);
        seasonsOnCurrentTeam = 0;
        contractLength = rng.int(2, 5);
      }
    }
    age++;
  }

  const finals: FinalsSummary = {
    wins: championships,
    losses: finalsLosses,
    perfect: championships >= TITLE_CAP && finalsLosses === 0,
  };
  const career: CareerSummary = {
    seasonsPlayed: seasons.length,
    championships,
    finalsRecord: `${championships}-${finalsLosses}`,
    mvps, finalsMvps, allStars, allNba, dpoys,
    peakOvr,
    totals,
  };

  return {
    seed: build.seed,
    dataVersion: build.dataVersion,
    startingFranchise: startId,
    legacyTier: legacyTier(career, finals, teamsPlayedFor.size),
    seasons, career, finals,
  };
}

function shouldRetire(
  age: number, retireAge: number, ovr: number, injury: SeasonResult['injury'],
  championships: number, rng: SeededRng,
): boolean {
  if (championships >= TITLE_CAP) return true; // mission complete — ride off at 12 rings
  if (championships === 11) return false; // always give a shot at 12-0
  if (age >= retireAge && ovr < 80) return true;
  if (age >= retireAge + 2) return true;
  if (injury === 'season-ending' && age >= 35 && rng.chance(0.5)) return true;
  return false;
}

function pickDestination(league: LeagueTeam[], current: string, ovr: number, rng: SeededRng): string | null {
  const ranked = [...league].filter((t) => t.id !== current).sort((a, b) => b.rating - a.rating);
  if (ranked.length === 0) return null;
  const tiers = ovr >= 96 ? [0.9, 0.07, 0.02, 0.01]
    : ovr >= 92 ? [0.8, 0.12, 0.06, 0.02]
    : ovr >= 88 ? [0.65, 0.2, 0.1, 0.05]
    : [0.45, 0.3, 0.15, 0.1];
  const r = rng.next();
  let bucket: LeagueTeam[];
  if (r < tiers[0]) bucket = ranked.slice(0, 5);
  else if (r < tiers[0] + tiers[1]) bucket = ranked.slice(5, 10);
  else if (r < tiers[0] + tiers[1] + tiers[2]) bucket = ranked.slice(10, 18);
  else bucket = ranked.slice(18);
  if (bucket.length === 0) bucket = ranked;
  // weight top-5 bucket toward the top
  if (bucket === ranked.slice(0, 5) || (bucket.length === 5 && bucket[0] === ranked[0])) {
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
    let acc = rng.next();
    for (let i = 0; i < bucket.length; i++) { acc -= weights[i] ?? 0; if (acc <= 0) return bucket[i].id; }
  }
  return rng.pick(bucket).id;
}

function legacyTier(c: CareerSummary, f: FinalsSummary, teams: number): string {
  if (f.perfect) return '12-0 Immortal';
  if (c.championships >= 12) return 'Russell Breaker';
  if (c.championships >= 7 && f.losses === 0) return 'Jordan Argument';
  if (c.championships >= 10) return 'One-Team Myth';
  if (c.championships >= 1 && teams >= 3 && c.championships >= 3) return 'Mercenary King';
  if (c.seasonsPlayed >= 20) return 'Iron Crown';
  if (c.championships >= 6 || c.mvps >= 5) return 'All-Time Inner Circle';
  if (c.championships >= 10) return 'Almost Mythic';
  if (c.championships >= 1) return 'Champion';
  return 'Cult Legend';
}

function zeroStats(): SeasonStatLine {
  return { ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0, tsPct: 0 };
}
function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }
function round1(n: number): number { return Math.round(n * 10) / 10; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
