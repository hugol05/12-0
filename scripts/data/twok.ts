/**
 * 2K-style rated dataset loader + category mapper (data-source/2k/*.csv).
 *
 * This is the rating source of truth for every player it covers. Where the old box-score
 * pipeline derived the 9 categories from proxies (steals≈defense, PPG≈clutch …) — the source
 * of the "weird ratings" — these are hand-rated attributes, so we map them directly.
 *
 * Mapping (decided with owner):
 *   Shooting    = pure jump shot (3PT/mid/FT/shotIQ). Inside finishing is NOT shooting.
 *   Athleticism = 2K athleticism (speed/vert/strength) + inside finishing (dunks) so a rim-
 *                 rocker's inside scoring isn't wasted.
 *   Playmaking / Defense / Rebounding = the matching 2K group, 1:1.
 *   Basketball IQ = pass IQ + shot IQ + help-defense IQ.
 *   Durability  = 2K overall durability.
 *   Height      = listed height + wingspan blend, anchored (tallest=99, 7'0"≥90, 6'9"≈84).
 *   Clutch      = derived (no 2K clutch attribute): star tier + championship bonus + curated
 *                 legends, ringless players capped. See clutchRating().
 */
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { ROOT, parseCsv, normName, clamp } from './util.ts';

export const TWOK_DIR = join(ROOT, 'data-source', '2k');

export interface TwokPlayer {
  name: string;
  archetype: string;
  position1: string;
  position2: string;
  heightIn: number;
  wingspanIn?: number;
  overall: number;
  intangibles: number;
  team: string; // full franchise name (current file) or "All-Time <Team>" (all-time file)
  source: 'all-time' | 'current';
  raw: Record<string, string>;
}

export interface ClutchConfig {
  ringlessCap: number;
  legendFloor: number;
  rings: Record<string, number>;
  legends: string[];
}

function num(r: Record<string, string>, k: string): number {
  const n = Number(r[k]);
  return Number.isFinite(n) ? n : 0;
}

/** Parse a 2K height/wingspan string like `7'4"` to inches. */
export function feetToInches(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)\s*'\s*(\d+)/);
  if (!m) return undefined;
  return Number(m[1]) * 12 + Number(m[2]);
}

/** Load both CSVs, deduped by normName (keeping the higher-overall entry). */
export async function loadTwok(aliases: Record<string, string>): Promise<Map<string, TwokPlayer>> {
  // alias map resolves any name to a single canonical normName so 2K + box-score agree.
  const aliasNorm = new Map<string, string>();
  for (const [from, to] of Object.entries(aliases)) aliasNorm.set(normName(from), normName(to));
  const canon = (name: string): string => {
    const k = normName(name);
    return aliasNorm.get(k) ?? k;
  };

  const out = new Map<string, TwokPlayer>();
  for (const [file, source] of [['all_time_2k.csv', 'all-time'], ['current_2k.csv', 'current']] as const) {
    const rows = parseCsv(await readFile(join(TWOK_DIR, file), 'utf8'));
    for (const r of rows) {
      const name = (r.name ?? '').trim();
      if (!name) continue;
      const heightIn = feetToInches(r.height_feet);
      if (!heightIn) continue;
      const tp: TwokPlayer = {
        name,
        archetype: (r.archetype ?? '').trim(),
        position1: (r.position_1 ?? '').trim(),
        position2: (r.position_2 ?? '').trim(),
        heightIn,
        wingspanIn: feetToInches(r.wingspan_feet),
        overall: num(r, 'overall'),
        intangibles: num(r, 'intangibles'),
        team: (r.team ?? '').trim(),
        source,
        raw: r,
      };
      const key = canon(name);
      const prev = out.get(key);
      // Prefer the higher-overall card; when tied, prefer the current-roster entry (real team).
      if (!prev || tp.overall > prev.overall || (tp.overall === prev.overall && source === 'current')) {
        out.set(key, tp);
      }
    }
  }
  return out;
}

/** The 7 non-clutch, non-height categories, mapped directly from 2K attributes. */
export function mapSkills(r: Record<string, string>): {
  shooting: number; playmaking: number; defense: number; rebounding: number;
  athleticism: number; basketballIq: number; durability: number;
} {
  const g = (k: string) => num(r, k);
  // Pure jump shooting — close_shot (a layup) is deliberately excluded.
  const shooting = Math.round(0.45 * g('three_point_shot') + 0.25 * g('mid_range_shot') + 0.20 * g('free_throw') + 0.10 * g('shot_iq'));
  // Athleticism + inside finishing (dunks), so explosive rim-finishing isn't lost (no scoring slot for it).
  const athleticism = Math.round(0.70 * g('group_athleticism') + 0.15 * g('driving_dunk') + 0.15 * g('standing_dunk'));
  const basketballIq = Math.round(0.40 * g('pass_iq') + 0.30 * g('shot_iq') + 0.30 * g('help_defense_iq'));
  return {
    shooting: clamp(shooting, 25, 99),
    playmaking: clamp(Math.round(g('group_playmaking')), 25, 99),
    defense: clamp(Math.round(g('group_defense')), 25, 99),
    rebounding: clamp(Math.round(g('group_rebounding')), 25, 99),
    athleticism: clamp(athleticism, 25, 99),
    basketballIq: clamp(basketballIq, 25, 99),
    durability: clamp(Math.round(g('overall_durability')), 25, 99),
  };
}

/**
 * Height rating — hidden from the user (shown as real height + folded into the archetype), but
 * still feeds OVR (.08). Anchored per owner: tallest in any dataset (7'6") = 99, every 7-footer
 * (84") ≥ 90, 6'9" (81") ≈ 84. Piecewise-linear in listed height, then a small wingspan nudge.
 */
export function heightRating(heightIn: number, wingspanIn?: number): number {
  const pure = heightIn >= 84 ? 90 + 1.5 * (heightIn - 84) : 90 - 2.0 * (84 - heightIn);
  // Wingspan only ADDS (long arms boost), never subtracts — so the tallest player still hits 99 and
  // every 7-footer stays >= 90 regardless of arm length, while a freak wingspan (Gobert) rises.
  const nudge = wingspanIn ? clamp((wingspanIn - heightIn - 4) * 0.6, 0, 5) : 0;
  return clamp(Math.round(pure + nudge), 25, 99);
}

/**
 * Clutch — star tier + championship-aware. Best players are clutch; winning multiplies it; a
 * ringless star (Westbrook/Harden/Malone) is capped below 90; curated big-shot legends are
 * floored high regardless of rings (Lillard, Reggie, Haliburton).
 */
export function clutchRating(name: string, overall: number, intangibles: number, cfg: ClutchConfig): number {
  const ringsByNorm = new Map<string, number>();
  // (caller can pre-build, but keeping it local keeps the signature simple)
  for (const [n, c] of Object.entries(cfg.rings)) ringsByNorm.set(normName(n), c);
  const legendSet = new Set(cfg.legends.map(normName));
  const key = normName(name);

  let base = ((overall - 50) / 49) * 37 + 55; // overall 99→92, 50→55
  base += (intangibles - 70) * 0.06;
  const rings = ringsByNorm.get(key) ?? 0;
  base += Math.min(rings, 6) * 1.8;
  let c = Math.round(clamp(base, 25, 99));
  if (legendSet.has(key)) c = Math.max(c, cfg.legendFloor);
  else if (rings === 0) c = Math.min(c, cfg.ringlessCap);
  return clamp(c, 25, 99);
}
