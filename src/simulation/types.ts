import type { PlayerBuild, Ratings } from '@/types';

/** Minimal franchise info the engine needs (from franchises.json). */
export interface SimFranchise {
  id: string;
  name: string;
  baseRating2026: number;
}

export interface SimContext {
  build: PlayerBuild;
  ratings: Ratings;
  franchises: SimFranchise[];
}

/**
 * The deepest playoff stage the player reached in a season. Derived from the
 * existing 4-round playoff simulation in career.ts (no new RNG) — additive and
 * non-breaking alongside the boolean playoff flags.
 *   missed      — did not make the playoffs
 *   firstRound  — made the playoffs, lost in round 1
 *   confSemis   — lost in the conference semifinals (round 2)
 *   confFinals  — lost in the conference finals (round 3)
 *   finals      — reached the Finals but lost
 *   champion    — won the championship
 */
export type RoundReached =
  | 'missed'
  | 'firstRound'
  | 'confSemis'
  | 'confFinals'
  | 'finals'
  | 'champion';

export interface SeasonStatLine {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  tsPct: number;
}

export interface SeasonResult {
  seasonIndex: number;
  age: number;
  team: string; // franchise id
  ovr: number;
  teamStrength: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  madePlayoffs: boolean;
  madeFinals: boolean;
  wonChampionship: boolean;
  /** deepest playoff stage reached this season (derived from the playoff sim). */
  roundReached: RoundReached;
  injury?: 'minor' | 'major' | 'season-ending';
  stats: SeasonStatLine;
  awards: string[];
}

export interface CareerSummary {
  seasonsPlayed: number;
  championships: number;
  finalsRecord: string; // "12-0"
  mvps: number;
  finalsMvps: number;
  allStars: number;
  allNba: number;
  dpoys: number;
  peakOvr: number;
  totals: { points: number; rebounds: number; assists: number; steals: number; blocks: number; games: number };
}

export interface FinalsSummary {
  wins: number;
  losses: number;
  perfect: boolean;
}

export interface SimulationResult {
  seed: number;
  dataVersion: string;
  startingFranchise: string;
  legacyTier: string;
  seasons: SeasonResult[];
  career: CareerSummary;
  finals: FinalsSummary;
}
