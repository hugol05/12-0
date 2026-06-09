// Shared domain types for 12-0. The simulation engine and UI both depend on these.
// Keep in sync with docs/data-strategy.md (player data structure) and data/schemas/.

/** The 8 categories that feed OVR, plus durability (career length only). */
export type RatingCategory =
  | 'shooting'
  | 'height'
  | 'playmaking'
  | 'defense'
  | 'rebounding'
  | 'athleticism'
  | 'basketballIq'
  | 'clutch'
  | 'durability';

/** The 8 OVR-contributing categories (durability excluded). */
export type OvrCategory = Exclude<RatingCategory, 'durability'>;

export type Ratings = Record<RatingCategory, number>;

export type Decade =
  | '1940s'
  | '1950s'
  | '1960s'
  | '1970s'
  | '1980s'
  | '1990s'
  | '2000s'
  | '2010s'
  | '2020s';

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export type Confidence = 'high' | 'medium' | 'low';
export type Coverage = 'complete' | 'partial';

export interface RatingMeta {
  confidence: Confidence;
  sourceCoverage: Coverage;
}

export interface PlayerTeamStint {
  franchise: string; // franchise id, e.g. "GSW"
  decades: Decade[];
}

export interface BoxStats {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  tsPct?: number;
}

export interface PlayerPhoto {
  url: string;
  status: 'verified' | 'fallback';
  fallback: string;
}

export interface Player {
  id: string;
  name: string;
  positions: Position[];
  teams: PlayerTeamStint[];
  peakSeason?: string;
  stats: BoxStats;
  ratings: Ratings;
  ratingMeta?: Partial<Record<RatingCategory, RatingMeta>>;
  height?: string; // e.g. "6-2"
  wingspan?: string; // e.g. "7-3" (2K-rated players only)
  archetype?: string; // 2K archetype string, e.g. "Offensive Architect" (2K-rated players only)
  photo: PlayerPhoto;
}

export interface Franchise {
  id: string; // "GSW"
  name: string; // "Golden State Warriors"
  abbreviation: string;
  baseRating2026: number; // 65-90 scale
  marketTier?: 'large' | 'mid' | 'small'; // WS7 franchise-trajectory inputs (emitted by the pipeline)
  youthIndex?: number; // 0-1, higher = younger roster
  decades: Decade[];
}

/** A franchise+decade roll bucket. */
export interface RollBucket {
  franchise: string;
  decade: Decade;
  playerIds: string[];
}

export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'newChapter' | 'rewritingHistory';

/** One filled attribute slot during the build phase. */
export interface AttributeAssignment {
  category: RatingCategory;
  playerId: string;
  rating: number;
  /** the franchise/decade bucket this player was drafted from */
  source: { franchise: string; decade: Decade };
}

export interface FranchiseSelection {
  franchise: string;
  decade: Decade;
}

/** The complete, serializable build that seeds a career simulation. */
export interface PlayerBuild {
  assignments: AttributeAssignment[]; // 9 categories
  franchise: FranchiseSelection;
  difficulty: Difficulty;
  mode: GameMode;
  seed: number;
  dataVersion: string;
}

export interface DataManifest {
  dataVersion: string;
  generatedAt: string;
  sourceSummary: string;
  files: Record<string, { hash: string; bytes: number }>;
}
