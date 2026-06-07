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
import {
  CURATED_DIR, OUT_DIR, fetchCached, parseCsv, readJson, writeJson, sha256,
  normName, toNum, pctToFrac, decadeOf, clamp, percentileRanker,
} from './util.ts';

const RAW_HIST = 'https://raw.githubusercontent.com/peasant98/TheNBACSV/master/nbaNew.csv';
const BRESCOU = 'https://raw.githubusercontent.com/Brescou/NBA-dataset-stats-player-team/main/player';
const FALLBACK_PHOTO = '/assets/player-silhouette.svg';
const MODERN_FROM = 2018; // Brescou seasons we trust as the 2018+ tail (nbaNew covers <=2017)
const MIN_SEASON_GAMES = 20; // a season only counts toward a franchise bucket at >= this many games
const MIN_FRANCHISE_DECADE_SEASONS = 2; // 2+ seasons for a franchise in a decade to qualify
const MIN_BUCKET_PLAYERS = 10; // single coverage threshold
const MIN_CAREER_GAMES = 50;

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
    franchises: { id: string; name: string; abbreviation: string; baseRating2026: number; teamCodes: string[] }[];
    defunctCodes: Record<string, string>;
    excludeCodes: string[];
  }>(join(CURATED_DIR, 'franchises.json'));
  const overridesDoc = await readJson<{ overrides: Record<string, { ratings?: Record<string, number>; rationale?: string }> }>(
    join(CURATED_DIR, 'overrides.json'),
  );

  const codeToFranchise = new Map<string, string>();
  for (const f of franchiseDoc.franchises) for (const c of f.teamCodes) codeToFranchise.set(c, f.id);
  const excluded = new Set([...franchiseDoc.excludeCodes, ...Object.keys(franchiseDoc.defunctCodes)]);

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

    const wsum = statRows.reduce((a, s) => a + s.minutes, 0) || 1;
    const w = (sel: (s: SeasonRow) => number) => statRows.reduce((a, s) => a + sel(s) * s.minutes, 0) / wsum;
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
  const rate = (p: number) => clamp(Math.round(38 + p * 57), 25, 99);

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

    // Shooting = shooting TOUCH/efficiency, not scoring volume. 1980+ blends FT% (best cross-era
    // touch proxy) + 3P% (range efficiency) + 3PAr (range willingness/volume) + eFG%/TS% (overall
    // efficiency). PPG is demoted to zero so high-volume non-shooters (Shaq, prime Giannis) fall.
    // Pre-1980 has no 3PT columns, so fall back to FT% + TS% + a small era-relative scoring rank.
    const shooting = has3pt
      ? rate(0.30 * rk.ftPct(a.rep.ftPct) + 0.25 * rk.tpPct(a.rep.tpPct) + 0.18 * rk.tpar(a.rep.tpar)
           + 0.17 * rk.efg(a.rep.efg) + 0.10 * rk.ts(a.rep.ts))
      : rate(0.45 * rk.ftPct(a.rep.ftPct) + 0.35 * rk.ts(a.rep.ts) + 0.20 * rk.ppg(a.rep.ppg));
    const playmaking = rate(0.65 * rk.apg(a.rep.apg) + 0.35 * rk.astPct(a.rep.astPct));
    const rebounding = rate(0.6 * rk.rpg(a.rep.rpg) + 0.4 * rk.rebPct(a.rep.rebPct));
    const defense = hasStlBlk
      ? rate(0.7 * rk.stlBlk(a.rep.stlBlk) + 0.3 * rk.rebPct(a.rep.rebPct))
      : rate(0.55 * rk.rebPct(a.rep.rebPct) + 0.45 * 0.5);
    // Athleticism: box stats are a weak proxy. Steals (perimeter quickness) + ORB% (leaping/motor)
    // lead; blocks are demoted (0.20) so plodding rim-protectors stop topping the scale. Famous
    // athletic reputations are finalised via curated overrides (de-rating plodders, boosting flyers).
    const athleticism = hasStlBlk
      ? rate(0.45 * rk.spg(a.rep.spg) + 0.35 * rk.orbPct(a.rep.orbPct) + 0.20 * rk.bpg(a.rep.bpg))
      : rate(0.5 * rk.rpg(a.rep.rpg) + 0.5 * rk.ppg(a.rep.ppg));
    const basketballIq = rate(0.5 * rk.astTov(a.rep.astTov) + 0.3 * rk.ts(a.rep.ts) + 0.2 * rk.ftPct(a.rep.ftPct));
    const clutch = rate(0.5 * rk.ppg(a.rep.ppg) + 0.3 * rk.ts(a.rep.ts) + 0.2 * rk.usg(a.rep.usg));
    // Height: real listed inches where known; re-tuned linear map so 6'0" guards land ~57 and
    // 7-footers ~89 (32 points per foot above 6'0"). Estimated heights stay flagged confidence:low.
    const height = clamp(Math.round(((a.p.heightIn - 72) / 12) * 32 + 57), 25, 99);
    const durRaw = 0.6 * Math.min(a.seasonsPlayed / 18, 1) + 0.4 * Math.min(a.avgG / 75, 1);
    const durability = clamp(Math.round(35 + durRaw * 60), 25, 99);

    const ratings: Record<string, number> = { shooting, height, playmaking, defense, rebounding, athleticism, basketballIq, clutch, durability };

    const ratingMeta: Record<string, { confidence: string; sourceCoverage: string }> = {};
    if (!has3pt) ratingMeta.shooting = { confidence: 'medium', sourceCoverage: 'partial' };
    if (!hasStlBlk) { ratingMeta.defense = { confidence: 'low', sourceCoverage: 'partial' }; ratingMeta.athleticism = { confidence: 'low', sourceCoverage: 'partial' }; }
    else if (!modern) ratingMeta.athleticism = { confidence: 'medium', sourceCoverage: 'partial' };
    ratingMeta.clutch = { confidence: 'medium', sourceCoverage: 'partial' };
    if (a.p.heightEstimated) ratingMeta.height = { confidence: 'low', sourceCoverage: 'partial' };

    // stable id
    let id = a.p.personId && /^\d+$/.test(a.p.personId) ? a.p.personId : `h${sha256(a.p.key)}`;
    while (usedIds.has(id)) id = `${id}_`;
    usedIds.add(id);

    // curated override
    const ov = overridesDoc.overrides[id];
    if (ov?.ratings) for (const [k2, v2] of Object.entries(ov.ratings)) if (k2 in ratings) ratings[k2] = clamp(Math.round(v2), 0, 99);

    // teams + buckets
    const teams: { franchise: string; decades: string[] }[] = [];
    for (const [fr, dm] of a.franDecades) {
      const qualified = [...dm.entries()].filter(([, c]) => c >= MIN_FRANCHISE_DECADE_SEASONS).map(([d]) => d);
      const allDecades = [...dm.keys()];
      if (allDecades.length) teams.push({ franchise: fr, decades: allDecades.sort() });
      for (const dec of qualified) {
        const bk = `${fr}|${dec}`;
        (buckets.get(bk) ?? buckets.set(bk, new Set()).get(bk)!).add(id);
        (franchiseDecades.get(fr) ?? franchiseDecades.set(fr, new Set()).get(fr)!).add(dec);
      }
    }
    if (teams.length === 0) { usedIds.delete(id); continue; }

    const photo = a.p.personId && /^\d+$/.test(a.p.personId)
      ? { url: `https://cdn.nba.com/headshots/nba/latest/1040x760/${a.p.personId}.png`, status: 'verified', fallback: FALLBACK_PHOTO }
      : { url: FALLBACK_PHOTO, status: 'fallback', fallback: FALLBACK_PHOTO };

    outPlayers.push({
      id, name: a.p.name, positions: [a.p.pos], teams,
      peakSeason: `${a.primaryYear}-${String((a.primaryYear + 1) % 100).padStart(2, '0')}`,
      stats: {
        ppg: round1(a.rep.ppg), rpg: round1(a.rep.rpg), apg: round1(a.rep.apg),
        spg: round1(a.rep.spg), bpg: round1(a.rep.bpg), tsPct: round3(a.rep.ts),
      },
      ratings, ratingMeta,
      height: `${Math.floor(a.p.heightIn / 12)}-${a.p.heightIn % 12}`,
      photo,
    });
  }

  // ---- roll-index: keep only buckets with >= MIN_BUCKET_PLAYERS ----
  const keptIds = new Set<string>();
  const bucketList: { franchise: string; decade: string; playerIds: string[] }[] = [];
  for (const [bk, set] of [...buckets].sort()) {
    if (set.size < MIN_BUCKET_PLAYERS) continue;
    const [franchise, decade] = bk.split('|');
    const ids = [...set].sort();
    bucketList.push({ franchise, decade, playerIds: ids });
    for (const id of ids) keptIds.add(id);
  }
  // drop players that ended up in no surviving bucket
  const finalPlayers = (outPlayers as { id: string }[]).filter((p) => keptIds.has(p.id));

  // ---- franchises (public) with derived decades (only decades that survived as buckets) ----
  const survivingFranDecades = new Map<string, Set<string>>();
  for (const b of bucketList) (survivingFranDecades.get(b.franchise) ?? survivingFranDecades.set(b.franchise, new Set()).get(b.franchise)!).add(b.decade);
  const outFranchises = franchiseDoc.franchises
    .filter((f) => survivingFranDecades.has(f.id))
    .map((f) => ({
      id: f.id, name: f.name, abbreviation: f.abbreviation, baseRating2026: f.baseRating2026,
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
    sourceSummary: 'BR-derived history (peasant98/TheNBACSV 1950-2017) + Brescou MIT modern (2018-2023). Ratings = era-aware percentile formulas + curated overrides.',
    files,
  });

  console.log(`players: ${finalPlayers.length} (of ${outPlayers.length} pre-bucket-filter)`);
  console.log(`buckets >= ${MIN_BUCKET_PLAYERS}: ${bucketList.length}`);
  console.log(`franchises with buckets: ${outFranchises.length}`);
  console.log(`dataVersion: ${dataVersion}`);
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

main().catch((e) => { console.error(e); process.exit(1); });
