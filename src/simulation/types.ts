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
