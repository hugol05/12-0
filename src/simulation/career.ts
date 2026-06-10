import type { AttributeAssignment, RatingCategory, Ratings } from '@/types';
import { computeOvr } from './categories';
import { SeededRng } from './seededRng';
import type {
  CareerSummary, FinalsSummary, MarketTier, SeasonResult, SeasonStatLine,
  SimContext, SimFranchise, SimulationResult,
} from './types';

// ---- tunable constants (calibrated via career.test.ts Monte Carlo) ----
const START_AGE = 19;
const PLAYOFF_WIN_THRESHOLD = 42;
const SERIES_COEFF = 0.045; // strength delta -> series prob
// Opponents climb toward the player's strength each round. They're set HIGH on purpose: REACHING
// the Finals (winning 3 prior rounds vs strong fields) is the OVR-gated grind that decides how many
// rings a career can pile up — a ~92-OVR build reaches the Finals about half its prime years (≈7
// titles), a god build nearly every year. This is the "total rings" axis (driven by OVR).
const ROUND_OPP = [82, 85, 88, 86]; // R1, R2, ConfFinals, Finals baseline opponent strength
// Rubber-band: in the FINALS the league's best "reload" to challenge a great player, so the
// opponent floats up to within GAP of the player's own strength. The Finals is then decided almost
// entirely by CLUTCH (the second axis): a 90-95 clutch still drops 1-3 Finals across a 12-ring
// career, and only a 97+ clutch keeps you loss-free for a true 12-0. Robust to rating inflation.
const ROUND_RUBBER_GAP = [Infinity, Infinity, Infinity, 3];
const ROUND_STAGES = ['firstRound', 'confSemis', 'confFinals', 'finals'] as const; // round idx -> stage reached
const TITLE_CAP = 12;

// ---- franchise trajectory model (WS7) ----
// Each season a team's rating drifts by: random noise + a market bias + a
// youth bias that decays as the simulated career advances. Big markets reload
// via free agency (steady upward); small markets only rise while their young
// core's window is open, then regress. Deterministic — one seeded draw/team/season.
const DRIFT_NOISE = 3; // +/- random component per season (was +/-4 pure random)
const MARKET_STEADY: Record<MarketTier, number> = { large: 0.8, mid: 0, small: -0.6 };
const YOUTH_GAIN = 1.6; // peak per-season upward push for a maximally-young roster
const YOUTH_WINDOW = 8; // seasons until the youth window fully closes
const DEFAULT_MARKET: MarketTier = 'mid';
const DEFAULT_YOUTH = 0.5;

/** Biased per-season rating drift for one team, `yearsElapsed` into the career. */
function seasonDrift(team: LeagueTeam, yearsElapsed: number, rng: SeededRng): number {
  const noise = rng.range(-DRIFT_NOISE, DRIFT_NOISE);
  // fraction of the youth window still open (1 at career start -> 0 after YOUTH_WINDOW seasons)
  const windowOpen = clamp(1 - yearsElapsed / YOUTH_WINDOW, 0, 1);
  const youthBias = team.youthIndex * windowOpen * YOUTH_GAIN; // decays to 0 as the window closes
  return noise + MARKET_STEADY[team.marketTier] + youthBias;
}

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

// Durability -> career length (years in the league), anchored to specific 2K-style ratings:
// 87->15, 89->16, 91->17, 95->18, 96->19, 98->20, 99->21+ (piecewise-linear between/around anchors).
const DURABILITY_YEARS: ReadonlyArray<readonly [number, number]> = [
  [25, 4], [60, 7], [70, 10], [80, 13], [87, 15], [89, 16], [91, 17], [95, 18], [96, 19], [98, 20], [99, 22],
];

function yearsFromDurability(durability: number): number {
  const pts = DURABILITY_YEARS;
  if (durability <= pts[0][0]) return pts[0][1];
  if (durability >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [d0, y0] = pts[i];
    const [d1, y1] = pts[i + 1];
    if (durability <= d1) return y0 + ((y1 - y0) * (durability - d0)) / (d1 - d0);
  }
  return pts[pts.length - 1][1];
}

// Career starts at START_AGE (19), so playing `years` seasons retires at START_AGE + years - 1.
// A small +/-1 year variance keeps careers from being perfectly deterministic by durability alone.
function retirementAge(durability: number, rng: SeededRng): number {
  const years = yearsFromDurability(durability) + rng.int(-1, 1);
  return START_AGE + Math.max(3, Math.round(years)) - 1;
}

// Clutch is THE separator for deep playoff runs. The curve is steep at the top: only a near-perfect
// clutch rating pushes a Finals series toward the ~0.95 win-prob needed to string 12 titles together,
// while a merely-very-good clutch (90) gets only a small nudge and a poor one is actively penalised.
function clutchFinalsBonus(clutch: number): number {
  if (clutch >= 99) return 0.50;
  if (clutch >= 97) return 0.40;
  if (clutch >= 95) return 0.27;
  if (clutch >= 93) return 0.20;
  if (clutch >= 90) return 0.15;
  if (clutch >= 87) return 0.08;
  if (clutch >= 83) return 0.0;
  if (clutch >= 78) return -0.08;
  if (clutch >= 72) return -0.16;
  return -0.24;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function teamStrengthOf(franchiseBase: number, ovr: number): number {
  return franchiseBase * 0.4 + ovr * 0.6;
}

// Regular-season wins as a smooth, saturating function of team strength — no hard cap, and
// crucially NO floor of 70 for champions. Most title teams (real NBA history included) win in the
// 50s-low 60s; the tanh baseline saturates around there even for elite strength.
function winsFromStrength(strength: number, rng: SeededRng): number {
  const expected = 50 + 14 * Math.tanh((strength - 82) / 14);
  const variance = rng.range(-7, 7);
  // "Career year" tail: both the chance of catching fire and how hot it gets ramp up with
  // strength. A strong-but-not-elite team (~88-93 strength) rarely threatens 70 wins; a true
  // god-tier team (~94+) catches fire often enough to post several 70+ (and the occasional
  // 74+, 73-9-record-threatening) seasons across a career.
  const hotChance = clamp((strength - 86) / 7, 0, 1);
  const hotCeiling = clamp((strength - 87) * 1.2, 0, 12);
  let bonus = 0;
  if (rng.chance(hotChance)) bonus = rng.range(0, hotCeiling);
  return clamp(Math.round(expected + variance + bonus), 15, 82);
}

function seriesWinProb(our: number, opp: number, clutchBonus: number): number {
  return Math.max(0.03, Math.min(0.99, 0.5 + (our - opp) * SERIES_COEFF + clutchBonus));
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

interface LeagueTeam { id: string; rating: number; marketTier: MarketTier; youthIndex: number; }

/**
 * Project each franchise's rating path over `seasons` years under the WS7
 * market/youth trajectory model, isolated from any player. Useful for
 * inspecting league drift (tests, a `?debug` trace panel). Deterministic for a
 * given seed — mirrors the exact seeding + drift used inside `simulateCareer`.
 * Returns franchiseId -> [baseRating, …rating after each season].
 */
export function projectLeagueTrajectory(
  franchises: SimFranchise[], seed: number, seasons: number,
): Map<string, number[]> {
  const rng = new SeededRng(seed);
  const league: LeagueTeam[] = franchises.map((f) => ({
    id: f.id,
    rating: f.baseRating2026,
    marketTier: f.marketTier ?? DEFAULT_MARKET,
    youthIndex: f.youthIndex ?? DEFAULT_YOUTH,
  }));
  const series = new Map<string, number[]>(league.map((t) => [t.id, [t.rating]]));
  for (let i = 0; i < seasons; i++) {
    for (const t of league) {
      t.rating = clamp(t.rating + seasonDrift(t, i, rng), 58, 95);
      series.get(t.id)!.push(t.rating);
    }
  }
  return series;
}

export function simulateCareer(ctx: SimContext): SimulationResult {
  const { build, ratings, franchises } = ctx;
  const rng = new SeededRng(build.seed);
  const peakOvr = computeOvr(ratings);
  const durability = ratings.durability;
  const clutch = ratings.clutch;
  const retireAge = retirementAge(durability, rng);

  // league model: every franchise gets a rating that drifts along a market/youth trajectory
  const league: LeagueTeam[] = franchises.map((f) => ({
    id: f.id,
    rating: f.baseRating2026,
    marketTier: f.marketTier ?? DEFAULT_MARKET,
    youthIndex: f.youthIndex ?? DEFAULT_YOUTH,
  }));
  const leagueById = new Map(league.map((t) => [t.id, t]));
  const startId = build.franchise.franchise;
  let currentTeam = leagueById.get(startId) ? startId : (franchises[0]?.id ?? startId);

  const seasons: SeasonResult[] = [];
  const totals = { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, games: 0 };
  let championships = 0;
  let finalsLosses = 0;
  let mvps = 0, finalsMvps = 0, allStars = 0, allNba = 0, dpoys = 0, scoringTitles = 0;
  let seasonsOnCurrentTeam = 0;
  let contractLength = rng.int(3, 6);
  let ovrPenalty = 0;
  const teamsPlayedFor = new Set<string>([currentTeam]);

  let age = START_AGE;
  for (let i = 0; ; i++) {
    // drift league ratings each season along their market/youth trajectory
    for (const t of league) t.rating = clamp(t.rating + seasonDrift(t, i, rng), 58, 95);

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
        const oppBase = Math.max(ROUND_OPP[round], strength - ROUND_RUBBER_GAP[round]);
        const opp = clamp(oppBase + rng.range(-3, 3), 55, 99);
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
    // Scoring title — an elite-scoring season that leads the league. No other
    // players are simulated, so approximate the league lead with a high PPG bar
    // gated on being a star-caliber year (avoids handing it out in down years).
    if (stats.ppg >= 28 && ovr >= leagueBest - 6) { awards.push('Scoring Champion'); scoringTitles++; }

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
    if (shouldRetire(age, retireAge, injury, championships, rng)) break;
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
    mvps, finalsMvps, allStars, allNba, dpoys, scoringTitles,
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
  age: number, retireAge: number, injury: SeasonResult['injury'],
  championships: number, rng: SeededRng,
): boolean {
  if (championships >= TITLE_CAP) return true; // mission complete — ride off at 12 rings
  if (championships === 11) return false; // always give a shot at 12-0
  if (age >= retireAge) return true;
  // a season-ending injury late in a long career can end things a year or two early
  if (injury === 'season-ending' && age >= retireAge - 2 && rng.chance(0.35)) return true;
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
