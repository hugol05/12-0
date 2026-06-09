/**
 * 12-0 data pipeline — builds public/data/{players,franchises,roll-index,manifest}.json
 * from openly-reachable bulk datasets (see data-source/sources.json).
 *
 *   Historical 1950-2017 : peasant98/TheNBACSV nbaNew.csv (Basketball-Reference-derived)
 *   Modern    2018-2023  : Brescou/NBA-dataset-stats-player-team (MIT) traditional+advanced
 *   Heights / headshot id: Brescou player_index (real NBA PERSON_ID = cdn headshot id)
 *
 * Ratings are era-aware: each input metric is percentile-ranked within the player's
 * primary decade, so a 1960s player is not punished for the absent 3PT/STL/BLK columns.
 * Only box/rate stats that exist identically in BOTH sources are used for ranking, so the
 * historical and modern halves stay on one consistent scale. Curated overrides
 * (data-source/curated/overrides.json) are layered last.
 */
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import {
  CURATED_DIR, OUT_DIR, ROOT, fetchCached, parseCsv, readJson, writeJson, sha256,
  normName, toNum, pctToFrac, decadeOf, clamp, percentileRanker,
} from './util.ts';
import { loadTwok, loadCurrentTeams, mapSkills, heightRating, clutchRating, type ClutchConfig } from './twok.ts';

const RAW_HIST = 'https://raw.githubusercontent.com/peasant98/TheNBACSV/master/nbaNew.csv';
const BRESCOU = 'https://raw.githubusercontent.com/Brescou/NBA-dataset-stats-player-team/main/player';
const FALLBACK_PHOTO = '/assets/player-silhouette.svg';
const MODERN_FROM = 2018; // Brescou seasons we trust as the 2018+ tail (nbaNew covers <=2017)
const MIN_SEASON_GAMES = 20; // a season only counts toward a franchise bucket at >= this many games
const MIN_FRANCHISE_DECADE_SEASONS = 2; // 2+ seasons for a franchise in a decade to qualify
const MIN_BUCKET_PLAYERS = 10; // single coverage threshold
const MIN_CAREER_GAMES = 50;

// OVR weights (mirror src/simulation/categories.ts — durability excluded). Used to cap the OVR of
// players the 2K dataset does not cover: if you aren't in 2K you aren't a marquee name, so your
// overall is clamped to CAP_OVR (skill ratings scaled down to hit it; height/durability untouched).
const OVR_WEIGHTS: Record<string, number> = {
  shooting: 0.2, playmaking: 0.15, defense: 0.15, clutch: 0.15,
  athleticism: 0.1, rebounding: 0.1, height: 0.08, basketballIq: 0.07,
};
const SKILL_CATS = ['shooting', 'playmaking', 'defense', 'clutch', 'athleticism', 'rebounding', 'basketballIq'] as const;
const CAP_OVR = 80; // best a non-2K (filler) player can be overall
function computeOvr(r: Record<string, number>): number {
  let ovr = 0;
  for (const [c, w] of Object.entries(OVR_WEIGHTS)) ovr += (r[c] ?? 0) * w;
  return Math.round(ovr);
}

type Pos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

interface SeasonRow {
  year: number;            // SeasonStart (1996-97 -> 1996)
  team: string;            // franchise id (tag rows) or 'TOT'/'MODERN' (stat rows)
  g: number;
  minutes: number;         // total minutes that season; 0 marks a franchise-tag row
  pos?: Pos;               // set on stat rows only
  ppg: number; rpg: number; apg: number; spg: number; bpg: number; topg: number;
  ts: number; astPct: number; rebPct: number; usg: number; orbPct: number; ftPct: number;
  tpPct: number; tpar: number; efg: number; // 3P%, 3-point attempt rate (3PA/FGA), eFG%
}

interface Player {
  key: string;             // normName
  name: string;
  personId?: string;       // NBA id (headshot)
  pos: Pos;
  heightIn: number;
  heightEstimated: boolean;
  seasons: SeasonRow[];
}

const POS_HEIGHT: Record<Pos, number> = { PG: 73, SG: 77, SF: 80, PF: 82, C: 84 };

// Era-strength discount (points subtracted from skill ratings, by peak decade). Ratings are
// percentile-ranked WITHIN a decade, which makes a top-of-era player in a shallow old league look
// as good as a top-of-era player in today's far deeper league. This gradient corrects for that:
// a 95th-percentile 1970s big is genuinely strong, but not the equal of a modern 95th-percentile
// star. True all-time greats sit high enough in their era to remain near the top after the haircut;
// merely-very-good role players (Alvan Adams, Bob Lanier) drop to where they belong. Height and
// durability are NOT era-adjusted (a 7-footer is 7 feet in any era; longevity is era-neutral).
const ERA_PEN: Record<string, number> = {
  '1940s': 4, '1950s': 3, '1960s': 2, '1970s': 2.5, '1980s': 1, '1990s': 0.5,
  '2000s': 0, '2010s': 0, '2020s': 0,
};

function parsePos(raw: string | undefined): Pos {
  const t = (raw ?? '').split(/[-/]/)[0].trim().toUpperCase();
  if (t === 'PG' || t === 'G') return 'PG';
  if (t === 'SG') return 'SG';
  if (t === 'SF' || t === 'F') return 'SF';
  if (t === 'PF') return 'PF';
  if (t === 'C') return 'C';
  return 'SF';
}

function parseHeight(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^(\d)-(\d{1,2})$/);
  if (!m) return undefined;
  return Number(m[1]) * 12 + Number(m[2]);
}

function tsFromBox(ppg: number, fga: number, fta: number): number {
  const denom = 2 * (fga + 0.44 * fta);
  return denom > 0 ? ppg / denom : 0;
}

async function main(): Promise<void> {
  console.log('12-0 data build');

  // ---- curated inputs ----
  const franchiseDoc = await readJson<{
    franchises: {
      id: string; name: string; abbreviation: string; baseRating2026: number;
      marketTier: 'large' | 'mid' | 'small'; youthIndex: number; teamCodes: string[];
    }[];
    defunctCodes: Record<string, string>;
    excludeCodes: string[];
  }>(join(CURATED_DIR, 'franchises.json'));
  const overridesDoc = await readJson<{ overrides: Record<string, { ratings?: Record<string, number>; rationale?: string }> }>(
    join(CURATED_DIR, 'overrides.json'),
  );
  // 2K-style rated dataset (rating source of truth) + its curated knobs.
  const clutchCfg = await readJson<ClutchConfig>(join(CURATED_DIR, 'clutch.json'));
  const aliasesDoc = await readJson<{ aliases: Record<string, string> }>(join(CURATED_DIR, 'player-aliases.json'));
  const twokMap = await loadTwok(aliasesDoc.aliases);
  const twokMatched = new Set<string>(); // normName keys matched to a roster player
  const cappedReport: { id: string; name: string; oldOvr: number; newOvr: number; height: string; teams: string }[] = [];

  const codeToFranchise = new Map<string, string>();
  for (const f of franchiseDoc.franchises) for (const c of f.teamCodes) codeToFranchise.set(c, f.id);
  const excluded = new Set([...franchiseDoc.excludeCodes, ...Object.keys(franchiseDoc.defunctCodes)]);

  // Map a 2K full team name -> franchise id (used both to re-anchor 2020s rosters and to add new players).
  const nameToFr = new Map<string, string>();
  for (const f of franchiseDoc.franchises) nameToFr.set(f.name.toLowerCase(), f.id);
  nameToFr.set('los angeles clippers', 'LAC'); // 2K uses the full name; franchise is "LA Clippers"
  // 2020s re-anchor: every current 2K player's REAL 2025-26 team (by canonical key). The box-score
  // window ends in 2023, so a player's 2020s franchise tags are stale (and the 2020s buckets were
  // collapsing below the size threshold). For the 2020s decade we take the team straight from the
  // current 2K roster instead — so LeBron/Luka land on the Lakers, AD on Dallas, etc.
  const currentFrByKey = new Map<string, string>();
  for (const [key, teamName] of await loadCurrentTeams(aliasesDoc.aliases)) {
    const fr = nameToFr.get(teamName.toLowerCase());
    if (fr) currentFrByKey.set(key, fr);
  }

  const players = new Map<string, Player>();
  const ensure = (name: string): Player => {
    const key = normName(name);
    let p = players.get(key);
    if (!p) {
      p = { key, name, pos: 'SF', heightIn: POS_HEIGHT.SF, heightEstimated: true, seasons: [] };
      players.set(key, p);
    }
    return p;
  };

  // ---- Brescou player_index: heights + person ids + positions ----
  const indexCsv = parseCsv(await fetchCached(`${BRESCOU}/player_index.csv`, 'brescou_player_index.csv'));
  for (const r of indexCsv) {
    const name = `${r.PLAYER_FIRST_NAME ?? ''} ${r.PLAYER_LAST_NAME ?? ''}`.trim();
    if (!name) continue;
    const p = ensure(name);
    p.personId = (r.PERSON_ID ?? '').trim() || p.personId;
    const h = parseHeight(r.HEIGHT);
    if (h) { p.heightIn = h; p.heightEstimated = false; }
    p.pos = parsePos(r.POSITION);
  }

  // ---- historical 1950-2017 (nbaNew.csv) ----
  const hist = parseCsv(await fetchCached(RAW_HIST, 'nbaNew.csv'));
  // For each (player, year) the traded players have several team rows + a TOT row.
  // Use TOT (or the single row) for the season's rate/box line; use the per-team rows for franchise tagging.
  type HistRow = Record<string, string>;
  const byPlayerYear = new Map<string, HistRow[]>();
  for (const r of hist) {
    const y = Math.trunc(toNum(r.SeasonStart));
    if (y < 1950 || y > 2017) continue;
    const name = r.PlayerName?.trim();
    if (!name) continue;
    const k = `${normName(name)}|${y}`;
    (byPlayerYear.get(k) ?? byPlayerYear.set(k, []).get(k)!).push(r);
  }
  for (const [k, rows] of byPlayerYear) {
    const name = rows[0].PlayerName.trim();
    const y = Math.trunc(toNum(rows[0].SeasonStart));
    const p = ensure(name);
    if (p.pos === 'SF' && rows[0].Pos) p.pos = parsePos(rows[0].Pos);
    const tot = rows.find((r) => r.Tm === 'TOT') ?? rows[0];
    const g = toNum(tot.G);
    if (g <= 0) continue;
    const minutes = toNum(tot.MP);
    p.seasons.push({
      year: y, team: 'TOT', g, minutes, pos: parsePos(tot.Pos),
      ppg: toNum(tot.PTS) / g, rpg: toNum(tot.TRB) / g, apg: toNum(tot.AST) / g,
      spg: toNum(tot.STL) / g, bpg: toNum(tot.BLK) / g, topg: toNum(tot.TOV) / g,
      ts: pctToFrac(tot['TS%']), astPct: toNum(tot['AST%']), rebPct: toNum(tot['TRB%']),
      usg: toNum(tot['USG%']), orbPct: toNum(tot['ORB%']), ftPct: pctToFrac(tot['FT%']),
      tpPct: pctToFrac(tot['3P%']), tpar: toNum(tot['3PAr']), efg: pctToFrac(tot['eFG%']),
    });
    // franchise tagging: per-team rows (skip TOT/defunct/unmapped)
    for (const r of rows) {
      if (r.Tm === 'TOT') continue;
      const gg = toNum(r.G);
      if (gg < MIN_SEASON_GAMES) continue;
      const fr = codeToFranchise.get(r.Tm);
      if (!fr || excluded.has(r.Tm)) continue;
      p.seasons.push({ year: y, team: fr, g: gg, minutes: 0, ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0, topg: 0, ts: 0, astPct: 0, rebPct: 0, usg: 0, orbPct: 0, ftPct: 0, tpPct: 0, tpar: 0, efg: 0 });
    }
    void k;
  }

  // ---- modern tail 2018-2023 (Brescou traditional + advanced) ----
  const trad = parseCsv(await fetchCached(`${BRESCOU}/player_stats_traditionnal_rs.csv`, 'brescou_traditional_rs.csv'));
  const adv = parseCsv(await fetchCached(`${BRESCOU}/player_stats_advanced_rs.csv`, 'brescou_advanced_rs.csv'));
  const advByKey = new Map<string, Record<string, string>>();
  for (const r of adv) advByKey.set(`${r.PLAYER_ID}|${r.SEASON}`, r);
  for (const r of trad) {
    const year = Math.trunc(toNum(r.SEASON?.slice(0, 4)));
    if (year < MODERN_FROM) continue;
    const name = r.PLAYER_NAME?.trim();
    if (!name) continue;
    const p = ensure(name);
    if (!p.personId && r.PLAYER_ID) p.personId = r.PLAYER_ID.trim();
    const g = toNum(r.GP);
    if (g <= 0) continue;
    const a = advByKey.get(`${r.PLAYER_ID}|${r.SEASON}`);
    const ppg = toNum(r.PTS);
    const ts = a ? pctToFrac(a.TS_PCT) : tsFromBox(ppg, toNum(r.FGA), toNum(r.FTA));
    const fga = toNum(r.FGA);
    const efg = a ? pctToFrac(a.EFG_PCT) : (fga > 0 ? (toNum(r.FGM) + 0.5 * toNum(r.FG3M)) / fga : 0);
    p.seasons.push({
      year, team: 'MODERN', g, minutes: toNum(r.MIN) * g, pos: p.pos,
      ppg, rpg: toNum(r.REB), apg: toNum(r.AST), spg: toNum(r.STL), bpg: toNum(r.BLK), topg: toNum(r.TOV),
      ts, astPct: a ? pctToFrac(a.AST_PCT) * 100 : 0, rebPct: a ? pctToFrac(a.REB_PCT) * 100 : 0,
      usg: a ? pctToFrac(a.USG_PCT) * 100 : 0, orbPct: a ? pctToFrac(a.OREB_PCT) * 100 : 0, ftPct: pctToFrac(r.FT_PCT),
      tpPct: pctToFrac(r.FG3_PCT), tpar: fga > 0 ? toNum(r.FG3A) / fga : 0, efg,
    });
    const fr = codeToFranchise.get(r.TEAM_ABBREVIATION);
    if (fr && g >= MIN_SEASON_GAMES) {
      p.seasons.push({ year, team: fr, g, minutes: 0, ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0, topg: 0, ts: 0, astPct: 0, rebPct: 0, usg: 0, orbPct: 0, ftPct: 0, tpPct: 0, tpar: 0, efg: 0 });
    }
  }

  // ---- aggregate each player into a representative line + franchise/decade tags ----
  interface Agg {
    p: Player;
    rep: Record<string, number>; // weighted representative metrics
    primaryYear: number;
    era: string;
    seasonsPlayed: number;
    totalG: number;
    avgG: number;
    franDecades: Map<string, Map<string, number>>; // franchiseId -> decade -> qualifying-season count
  }
  const franchiseIds = new Set(franchiseDoc.franchises.map((f) => f.id));
  const aggs: Agg[] = [];
  for (const p of players.values()) {
    const statRows = p.seasons.filter((s) => s.minutes > 0); // box/rate lines
    const tagRows = p.seasons.filter((s) => s.minutes === 0 && franchiseIds.has(s.team)); // franchise tags
    if (statRows.length === 0) continue;
    const years = new Set(statRows.map((s) => s.year));
    const totalG = statRows.reduce((a, s) => a + s.g, 0);
    if (totalG < MIN_CAREER_GAMES) continue;

    // Prime-weighted representative line. 2K-style ratings reflect a player's PRIME, not their
    // career average — so drop token/rookie/decline seasons (< half the player's peak-minutes
    // season) and emphasise the biggest seasons (minutes^1.3). This stops durable greats
    // (Kareem, Kobe, LeBron) from being diluted by long tails of low-minute seasons.
    const maxMin = Math.max(...statRows.map((s) => s.minutes));
    const primeRows = statRows.filter((s) => s.minutes >= 0.5 * maxMin);
    const wRows = primeRows.length ? primeRows : statRows;
    const wt = (s: SeasonRow) => Math.pow(s.minutes, 1.3);
    const wsum = wRows.reduce((a, s) => a + wt(s), 0) || 1;
    const w = (sel: (s: SeasonRow) => number) => wRows.reduce((a, s) => a + sel(s) * wt(s), 0) / wsum;
    const rep: Record<string, number> = {
      ppg: w((s) => s.ppg), rpg: w((s) => s.rpg), apg: w((s) => s.apg), spg: w((s) => s.spg),
      bpg: w((s) => s.bpg), topg: w((s) => s.topg), ts: w((s) => s.ts), astPct: w((s) => s.astPct),
      rebPct: w((s) => s.rebPct), usg: w((s) => s.usg), orbPct: w((s) => s.orbPct), ftPct: w((s) => s.ftPct),
      tpPct: w((s) => s.tpPct), tpar: w((s) => s.tpar), efg: w((s) => s.efg),
    };
    rep.stlBlk = rep.spg + rep.bpg;
    rep.astTov = rep.topg > 0 ? rep.apg / rep.topg : rep.apg;

    const peak = statRows.reduce((a, s) => (s.minutes > a.minutes ? s : a));
    const era = decadeOf(peak.year);
    p.pos = peak.pos ?? p.pos;

    const franDecades = new Map<string, Map<string, number>>();
    for (const t of tagRows) {
      const dec = decadeOf(t.year);
      const dm = franDecades.get(t.team) ?? franDecades.set(t.team, new Map()).get(t.team)!;
      dm.set(dec, (dm.get(dec) ?? 0) + 1);
    }
    if (franDecades.size === 0) continue;

    aggs.push({
      p, rep, primaryYear: peak.year, era, seasonsPlayed: years.size,
      totalG, avgG: totalG / years.size, franDecades,
    });
  }

  // ---- per-era percentile rankers ----
  const metrics = ['ppg', 'rpg', 'apg', 'ts', 'astPct', 'rebPct', 'usg', 'stlBlk', 'orbPct', 'astTov', 'ftPct', 'tpPct', 'tpar', 'efg', 'spg', 'bpg'] as const;
  const byEra = new Map<string, Agg[]>();
  for (const a of aggs) (byEra.get(a.era) ?? byEra.set(a.era, []).get(a.era)!).push(a);
  const rankers = new Map<string, Record<string, (v: number) => number>>();
  for (const [era, list] of byEra) {
    const r: Record<string, (v: number) => number> = {};
    for (const m of metrics) r[m] = percentileRanker(list.map((a) => a.rep[m]));
    rankers.set(era, r);
  }
  // Percentile -> rating curve. Ceiling raised to 99 (was 95) so all-time greats can actually
  // reach the top of the scale, and gently convex (exponent > 1) so the elite separate from the
  // merely-good instead of everyone bunching in the 80s.
  const STAR_EXP = 1.25;
  const rate = (p: number) => clamp(Math.round(36 + 63 * Math.pow(clamp(p, 0, 1), STAR_EXP)), 25, 99);

  // ---- assemble players ----
  const usedIds = new Set<string>();
  const outPlayers: unknown[] = [];
  const buckets = new Map<string, Set<string>>(); // `${fr}|${dec}` -> playerIds
  const franchiseDecades = new Map<string, Set<string>>();

  for (const a of aggs) {
    const rk = rankers.get(a.era)!;
    const has3pt = a.primaryYear >= 1980;
    const hasStlBlk = a.primaryYear >= 1974;
    const modern = a.primaryYear >= 1996;

    // era-adjusted rate: percentile -> rating, minus the era-strength discount for this peak decade.
    const eraPen = ERA_PEN[a.era] ?? 0;
    const R = (p: number) => clamp(Math.round(rate(p) - eraPen), 25, 99);

    // Shooting = shooting TOUCH/efficiency, not scoring volume. 1980+ blends FT% (best cross-era
    // touch proxy) + 3P% (range efficiency) + 3PAr (range willingness/volume) + eFG%/TS% (overall
    // efficiency). PPG is demoted to zero so high-volume non-shooters (Shaq, prime Giannis) fall.
    // Pre-1980 has no 3PT columns, so fall back to FT% + TS% + a small era-relative scoring rank.
    const shooting = has3pt
      ? R(0.30 * rk.ftPct(a.rep.ftPct) + 0.25 * rk.tpPct(a.rep.tpPct) + 0.18 * rk.tpar(a.rep.tpar)
           + 0.17 * rk.efg(a.rep.efg) + 0.10 * rk.ts(a.rep.ts))
      : R(0.45 * rk.ftPct(a.rep.ftPct) + 0.35 * rk.ts(a.rep.ts) + 0.20 * rk.ppg(a.rep.ppg));
    const playmaking = R(0.65 * rk.apg(a.rep.apg) + 0.35 * rk.astPct(a.rep.astPct));
    const rebounding = R(0.6 * rk.rpg(a.rep.rpg) + 0.4 * rk.rebPct(a.rep.rebPct));
    const defense = hasStlBlk
      ? R(0.7 * rk.stlBlk(a.rep.stlBlk) + 0.3 * rk.rebPct(a.rep.rebPct))
      : R(0.55 * rk.rebPct(a.rep.rebPct) + 0.45 * 0.5);
    // Athleticism: box stats are a weak proxy. Steals (perimeter quickness) + ORB% (leaping/motor)
    // lead; blocks are demoted (0.20) so plodding rim-protectors stop topping the scale. Famous
    // athletic reputations are finalised via curated overrides (de-rating plodders, boosting flyers).
    const athleticism = hasStlBlk
      ? R(0.45 * rk.spg(a.rep.spg) + 0.35 * rk.orbPct(a.rep.orbPct) + 0.20 * rk.bpg(a.rep.bpg))
      : R(0.5 * rk.rpg(a.rep.rpg) + 0.5 * rk.ppg(a.rep.ppg));
    const basketballIq = R(0.5 * rk.astTov(a.rep.astTov) + 0.3 * rk.ts(a.rep.ts) + 0.2 * rk.ftPct(a.rep.ftPct));
    const clutch = R(0.5 * rk.ppg(a.rep.ppg) + 0.3 * rk.ts(a.rep.ts) + 0.2 * rk.usg(a.rep.usg));
    // Height: anchored to listed inches (tallest=99, 7'0">=90, 6'9"~84). Hidden from the user as a
    // number (shown as real height + folded into the archetype) but still feeds OVR (.08).
    const height = heightRating(a.p.heightIn);
    const durRaw = 0.6 * Math.min(a.seasonsPlayed / 18, 1) + 0.4 * Math.min(a.avgG / 75, 1);
    const durability = clamp(Math.round(35 + durRaw * 60), 25, 99);

    const ratings: Record<string, number> = { shooting, height, playmaking, defense, rebounding, athleticism, basketballIq, clutch, durability };

    // ---- 2K-style rated dataset = rating source of truth wherever it covers the player ----
    const tw = twokMap.get(a.p.key);
    let archetype: string | undefined;
    let wingspanIn: number | undefined;
    const positions: Pos[] = [a.p.pos];
    const ratingMeta: Record<string, { confidence: string; sourceCoverage: string }> = {};
    if (tw) {
      twokMatched.add(a.p.key);
      Object.assign(ratings, mapSkills(tw.raw)); // shooting/playmaking/defense/rebounding/athleticism/IQ/durability
      ratings.clutch = clutchRating(tw.name, tw.overall, tw.intangibles, clutchCfg);
      ratings.height = heightRating(a.p.heightIn, tw.wingspanIn);
      wingspanIn = tw.wingspanIn;
      archetype = tw.archetype || undefined;
      // Positions: prefer the 2K card. The box-score/Brescou position is often wrong for the fan
      // (Zion shipped as SF; 2K lists him PF/C). Use position_1 as primary + position_2 if distinct.
      positions[0] = parsePos(tw.position1);
      const p2 = tw.position2 ? parsePos(tw.position2) : undefined;
      if (p2 && p2 !== positions[0]) positions.push(p2);
      a.p.pos = positions[0];
      // hand-rated values — no box-score proxy caveats
    } else {
      if (!has3pt) ratingMeta.shooting = { confidence: 'medium', sourceCoverage: 'partial' };
      if (!hasStlBlk) { ratingMeta.defense = { confidence: 'low', sourceCoverage: 'partial' }; ratingMeta.athleticism = { confidence: 'low', sourceCoverage: 'partial' }; }
      else if (!modern) ratingMeta.athleticism = { confidence: 'medium', sourceCoverage: 'partial' };
      ratingMeta.clutch = { confidence: 'medium', sourceCoverage: 'partial' };
      if (a.p.heightEstimated) ratingMeta.height = { confidence: 'low', sourceCoverage: 'partial' };
    }

    // stable id
    let id = a.p.personId && /^\d+$/.test(a.p.personId) ? a.p.personId : `h${sha256(a.p.key)}`;
    while (usedIds.has(id)) id = `${id}_`;
    usedIds.add(id);

    // The box-score tail (not in 2K): apply curated overrides, then cap OVR so non-marquee players
    // can't be highly rated. 2K-covered players bypass both (they are the source of truth).
    if (!tw) {
      const ov = overridesDoc.overrides[id];
      if (ov?.ratings) for (const [k2, v2] of Object.entries(ov.ratings)) if (k2 in ratings) ratings[k2] = clamp(Math.round(v2), 0, 99);
      const ovr0 = computeOvr(ratings);
      // A curated override marks a marquee player the 2K set happens to omit (e.g. Barkley) —
      // exempt from the filler cap. Everyone else not in 2K is clamped to CAP_OVR.
      if (ovr0 > CAP_OVR && !ov?.ratings) {
        const hPart = ratings.height * OVR_WEIGHTS.height;
        const skillPart = SKILL_CATS.reduce((s, c) => s + ratings[c] * OVR_WEIGHTS[c], 0);
        const factor = skillPart > 0 ? (CAP_OVR - hPart) / skillPart : 1;
        for (const c of SKILL_CATS) ratings[c] = clamp(Math.round(ratings[c] * factor), 25, 99);
        cappedReport.push({
          id, name: a.p.name, oldOvr: ovr0, newOvr: computeOvr(ratings),
          height: `${Math.floor(a.p.heightIn / 12)}-${a.p.heightIn % 12}`,
          teams: [...a.franDecades.keys()].join('/'),
        });
      }
    } else if (tw.source === 'all-time') {
      // Legend floor: when the OVR formula under-rates a 2K-rated great (the .20 shooting weight
      // drags non-shooting bigs like Wilt/Russell down), lift their skill ratings proportionally so
      // the OVR can't read embarrassingly low. Tied to 2K's own overall (trust 2K): floor ≈ 2K
      // overall − 12, capped at 92 so the floor alone never manufactures a 95+ player. Gated to
      // ALL-TIME cards only — a current card's "overall" is potential-inflated for rookies (Cooper
      // Flagg, Ace Bailey), which would otherwise get a huge bogus lift.
      const floor = clamp(Math.round(tw.overall - 12), 25, 92);
      if (computeOvr(ratings) < floor) {
        const hPart = ratings.height * OVR_WEIGHTS.height;
        const skillPart = SKILL_CATS.reduce((s, c) => s + ratings[c] * OVR_WEIGHTS[c], 0);
        const factor = skillPart > 0 ? (floor - hPart) / skillPart : 1;
        for (const c of SKILL_CATS) ratings[c] = clamp(Math.round(ratings[c] * factor), 25, 99);
      }
    }

    // teams + buckets. The 2020s decade is re-anchored to the real current roster (see
    // currentFrByKey) — so box-score 2020s tags are dropped here and the current 2K team added below.
    const currentFr = currentFrByKey.get(a.p.key);
    const teams: { franchise: string; decades: string[] }[] = [];
    for (const [fr, dm] of a.franDecades) {
      const qualified = [...dm.entries()].filter(([d, c]) => d !== '2020s' && c >= MIN_FRANCHISE_DECADE_SEASONS).map(([d]) => d);
      const allDecades = [...dm.keys()].filter((d) => d !== '2020s');
      if (allDecades.length) teams.push({ franchise: fr, decades: allDecades.sort() });
      for (const dec of qualified) {
        const bk = `${fr}|${dec}`;
        (buckets.get(bk) ?? buckets.set(bk, new Set()).get(bk)!).add(id);
        (franchiseDecades.get(fr) ?? franchiseDecades.set(fr, new Set()).get(fr)!).add(dec);
      }
    }
    // 2020s = the real current roster (from the current 2K dataset), overriding the stale box-score window.
    if (currentFr) {
      const existing = teams.find((t) => t.franchise === currentFr);
      if (existing) { if (!existing.decades.includes('2020s')) { existing.decades.push('2020s'); existing.decades.sort(); } }
      else teams.push({ franchise: currentFr, decades: ['2020s'] });
      const bk = `${currentFr}|2020s`;
      (buckets.get(bk) ?? buckets.set(bk, new Set()).get(bk)!).add(id);
      (franchiseDecades.get(currentFr) ?? franchiseDecades.set(currentFr, new Set()).get(currentFr)!).add('2020s');
    }
    if (teams.length === 0) { usedIds.delete(id); continue; }

    const photo = a.p.personId && /^\d+$/.test(a.p.personId)
      ? { url: `https://cdn.nba.com/headshots/nba/latest/1040x760/${a.p.personId}.png`, status: 'verified', fallback: FALLBACK_PHOTO }
      : { url: FALLBACK_PHOTO, status: 'fallback', fallback: FALLBACK_PHOTO };

    outPlayers.push({
      id, name: a.p.name, positions, teams,
      peakSeason: `${a.primaryYear}-${String((a.primaryYear + 1) % 100).padStart(2, '0')}`,
      stats: {
        ppg: round1(a.rep.ppg), rpg: round1(a.rep.rpg), apg: round1(a.rep.apg),
        spg: round1(a.rep.spg), bpg: round1(a.rep.bpg), tsPct: round3(a.rep.ts),
      },
      ratings, ratingMeta,
      height: `${Math.floor(a.p.heightIn / 12)}-${a.p.heightIn % 12}`,
      ...(wingspanIn ? { wingspan: `${Math.floor(wingspanIn / 12)}-${wingspanIn % 12}` } : {}),
      ...(archetype ? { archetype } : {}),
      photo,
    });
  }

  // ---- roll-index: keep only buckets with >= MIN_BUCKET_PLAYERS ----
  const keptIds = new Set<string>();
  const bucketList: { franchise: string; decade: string; playerIds: string[] }[] = [];
  for (const [bk, set] of [...buckets].sort()) {
    const [franchise, decade] = bk.split('|');
    // 2020s buckets are real current rosters (always full NBA teams) — exempt from the size threshold
    // so a team isn't dropped and then resurrected containing only the patched-in rookies.
    if (decade !== '2020s' && set.size < MIN_BUCKET_PLAYERS) continue;
    const ids = [...set].sort();
    bucketList.push({ franchise, decade, playerIds: ids });
    for (const id of ids) keptIds.add(id);
  }
  // drop players that ended up in no surviving bucket
  const finalPlayers = (outPlayers as { id: string; name: string }[]).filter((p) => keptIds.has(p.id));

  // ---- add current 2K players absent from the shipped roster, as 2020s players ----
  // Real current NBA players the box-score history doesn't reach (2023-25 debuts) OR that matched a
  // box-score record which didn't qualify for a bucket (e.g. Cade Cunningham, one Detroit season).
  // Gated on the SHIPPED roster (not just "matched"), so we never duplicate a player who already
  // shipped — all-time names that map to an existing entry are handled by aliases instead.
  const shippedKeys = new Set(finalPlayers.map((p) => normName(p.name)));
  const has2kGroups = (raw: Record<string, string>) =>
    ['group_outside_scoring', 'group_playmaking', 'group_defense', 'group_rebounding'].every((k) => (raw[k] ?? '').trim() !== '');
  const addedReport: { name: string; ovr: number; team: string; archetype: string; photo: boolean }[] = [];
  for (const [key, tw] of twokMap) {
    if (shippedKeys.has(key)) continue;            // already on the roster — never duplicate
    if (tw.source !== 'current' || tw.team.startsWith('All-Time')) continue; // 2020s players only
    if (!has2kGroups(tw.raw)) continue;            // skip incomplete rows (e.g. a not-yet-rated rookie)
    const frId = nameToFr.get(tw.team.toLowerCase());
    if (!frId) continue;
    const idxP = players.get(key); // player_index entry (real personId/height) if present
    const personId = idxP?.personId && /^\d+$/.test(idxP.personId) ? idxP.personId : undefined;
    const heightIn = idxP && !idxP.heightEstimated ? idxP.heightIn : tw.heightIn;

    const ratings: Record<string, number> = {
      ...mapSkills(tw.raw),
      height: heightRating(heightIn, tw.wingspanIn),
      clutch: clutchRating(tw.name, tw.overall, tw.intangibles, clutchCfg),
    };
    let id = personId ?? `t${sha256(key)}`;
    while (usedIds.has(id)) id = `${id}_`;
    usedIds.add(id);

    const photo = personId
      ? { url: `https://cdn.nba.com/headshots/nba/latest/1040x760/${personId}.png`, status: 'verified', fallback: FALLBACK_PHOTO }
      : { url: FALLBACK_PHOTO, status: 'fallback', fallback: FALLBACK_PHOTO };

    finalPlayers.push({
      id, name: tw.name, positions: [parsePos(tw.position1)],
      teams: [{ franchise: frId, decades: ['2020s'] }],
      peakSeason: '2025-26',
      stats: synthStats(tw.raw), // estimated from 2K attributes (no box score for these players)
      ratings, ratingMeta: {},
      height: `${Math.floor(heightIn / 12)}-${heightIn % 12}`,
      ...(tw.wingspanIn ? { wingspan: `${Math.floor(tw.wingspanIn / 12)}-${tw.wingspanIn % 12}` } : {}),
      ...(tw.archetype ? { archetype: tw.archetype } : {}),
      photo,
    } as never);
    shippedKeys.add(key);
    keptIds.add(id);
    let bucket = bucketList.find((b) => b.franchise === frId && b.decade === '2020s');
    if (!bucket) { bucket = { franchise: frId, decade: '2020s', playerIds: [] }; bucketList.push(bucket); }
    bucket.playerIds.push(id);
    addedReport.push({ name: tw.name, ovr: computeOvr(ratings), team: tw.team, archetype: tw.archetype, photo: !!personId });
  }
  for (const b of bucketList) b.playerIds.sort();
  bucketList.sort((a, b) => (a.franchise + a.decade).localeCompare(b.franchise + b.decade));

  // ---- franchises (public) with derived decades (only decades that survived as buckets) ----
  const survivingFranDecades = new Map<string, Set<string>>();
  for (const b of bucketList) (survivingFranDecades.get(b.franchise) ?? survivingFranDecades.set(b.franchise, new Set()).get(b.franchise)!).add(b.decade);
  const outFranchises = franchiseDoc.franchises
    .filter((f) => survivingFranDecades.has(f.id))
    .map((f) => ({
      id: f.id, name: f.name, abbreviation: f.abbreviation, baseRating2026: f.baseRating2026,
      marketTier: f.marketTier, youthIndex: f.youthIndex,
      decades: [...survivingFranDecades.get(f.id)!].sort(),
    }));

  // ---- write outputs ----
  const dataVersion = new Date().toISOString().slice(0, 10) + '.1';
  await writeJson(join(OUT_DIR, 'players.json'), finalPlayers);
  await writeJson(join(OUT_DIR, 'franchises.json'), outFranchises);
  await writeJson(join(OUT_DIR, 'roll-index.json'), { dataVersion, minBucketSize: MIN_BUCKET_PLAYERS, buckets: bucketList });

  const files: Record<string, { hash: string; bytes: number }> = {};
  for (const f of ['players.json', 'franchises.json', 'roll-index.json']) {
    const text = await readJson<unknown>(join(OUT_DIR, f)).then((v) => JSON.stringify(v));
    files[f] = { hash: sha256(text), bytes: Buffer.byteLength(text) };
  }
  await writeJson(join(OUT_DIR, 'manifest.json'), {
    dataVersion, generatedAt: new Date().toISOString(),
    sourceSummary: 'BR-derived history (peasant98/TheNBACSV 1950-2017) + Brescou MIT modern. Ratings: 2K-style rated dataset (data-source/2k) is the source of truth where it covers a player; the remaining box-score tail uses era-aware formulas and is OVR-capped. Curated clutch (rings/legends) + name aliases.',
    files,
  });

  // ---- review report: who the 2K dataset rates, who got capped, who is missing ----
  const keptKeys = new Set(finalPlayers.map((p) => normName((p as { name: string }).name)));
  const shippedCapped = cappedReport.filter((c) => keptIds.has(c.id)).sort((x, y) => y.oldOvr - x.oldOvr);
  const matchedShipped = [...twokMatched].filter((k) => keptKeys.has(k)).length;
  // 2K players that did NOT end up on the shipped roster (mostly all-time/ABA names with no match).
  const unmatched2k = [...twokMap.entries()]
    .filter(([k]) => !keptKeys.has(k))
    .map(([, v]) => v)
    .sort((x, y) => y.overall - x.overall);
  const reportLines: string[] = [];
  reportLines.push('# 2K rating-integration report', '');
  reportLines.push(`Generated ${new Date().toISOString().slice(0, 10)} by \`npm run data\`. dataVersion ${dataVersion}.`, '');
  reportLines.push(`- Roster shipped: **${finalPlayers.length}** players.`);
  reportLines.push(`- Rated from the 2K dataset (source of truth): **${matchedShipped}**.`);
  reportLines.push(`- Box-score tail OVR-capped at ${CAP_OVR}: **${shippedCapped.length}**.`);
  reportLines.push(`- 2K players not on our roster (no franchise/decade history): **${unmatched2k.length}**.`, '');
  reportLines.push('## Capped players (OVR clamped to ' + CAP_OVR + ')', '');
  reportLines.push('Sorted by pre-cap OVR. A genuinely famous name high in this list is probably a **name-mismatch** with the 2K set — add it to `data-source/curated/player-aliases.json` so it gets real 2K ratings instead of being capped.', '');
  reportLines.push('| Pre | → | Name | Height | Franchises |', '|----|----|------|--------|-----------|');
  for (const c of shippedCapped) reportLines.push(`| ${c.oldOvr} | ${c.newOvr} | ${c.name} | ${c.height} | ${c.teams} |`);
  reportLines.push('', '## Notable 2K players NOT on our roster (overall ≥ 82)', '');
  reportLines.push('These are rated by 2K but absent from the box-score history (mostly 2023-25 debuts), so they have no franchise/decade buckets. Candidates to add as 2020s players if you want them playable.', '');
  reportLines.push('| OVR | Name | Pos | 2K team | Archetype |', '|----|------|-----|---------|-----------|');
  for (const v of unmatched2k) if (v.overall >= 82) reportLines.push(`| ${v.overall} | ${v.name} | ${v.position1} | ${v.team} | ${v.archetype} |`);
  reportLines.push('', `## Added 2020s players (${addedReport.length})`, '');
  reportLines.push('Real current players absent from the box-score history, added with 2K ratings on their current team (2020s). Stats are estimated from 2K attributes (no box score exists for them). A ✓ in Photo means a real headshot was found.', '');
  reportLines.push('| OVR | Name | Team | Archetype | Photo |', '|----|------|------|-----------|-------|');
  for (const v of [...addedReport].sort((a, b) => b.ovr - a.ovr)) reportLines.push(`| ${v.ovr} | ${v.name} | ${v.team} | ${v.archetype} | ${v.photo ? '✓' : '—'} |`);
  await writeFile(join(ROOT, 'data-source', '2k', 'integration-report.md'), reportLines.join('\n') + '\n', 'utf8');

  console.log(`players: ${finalPlayers.length} (of ${outPlayers.length} pre-bucket-filter)`);
  console.log(`buckets >= ${MIN_BUCKET_PLAYERS}: ${bucketList.length}`);
  console.log(`franchises with buckets: ${outFranchises.length}`);
  console.log(`2K-rated (shipped): ${matchedShipped} | capped: ${shippedCapped.length} | 2K-unmatched: ${unmatched2k.length} | added-2020s: ${addedReport.length}`);
  console.log(`report: data-source/2k/integration-report.md`);
  console.log(`dataVersion: ${dataVersion}`);
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

/**
 * Approximate per-game stats from a 2K attribute row, for current players that have no box-score
 * line. Display-only (the simulation runs off the built player's ratings, not these) — a rough but
 * plausible card so an added 2020s player doesn't read 0/0/0.
 */
function synthStats(raw: Record<string, string>): { ppg: number; rpg: number; apg: number; spg: number; bpg: number; tsPct: number } {
  const n = (k: string) => { const v = Number(raw[k]); return Number.isFinite(v) ? v : 0; };
  const m = (raw.height_feet ?? '').match(/(\d+)\D+(\d+)/);
  const hin = m ? Number(m[1]) * 12 + Number(m[2]) : 78;
  const score = Math.max(n('group_outside_scoring'), n('group_inside_scoring'));
  return {
    ppg: clamp(round1((score - 50) * 0.40 + (n('overall') - 70) * 0.25 + 7), 2, 32),
    rpg: clamp(round1((n('group_rebounding') - 40) * 0.16 + (hin - 74) * 0.18 + 1.2), 0.5, 14),
    apg: clamp(round1((n('group_playmaking') - 40) * 0.13 + 0.4), 0.3, 11),
    spg: clamp(round1((n('group_defense') - 50) * 0.025 + 0.4), 0.1, 2.6),
    bpg: clamp(round1((n('block') - 50) * 0.03 + (hin - 80) * 0.04 + 0.2), 0, 3.2),
    tsPct: round3(clamp(0.50 + (n('free_throw') - 70) * 0.0008 + (n('group_inside_scoring') - 60) * 0.0007, 0.45, 0.66)),
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
