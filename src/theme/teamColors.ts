/**
 * Official franchise colors for the 30 NBA teams (WS2 design foundation).
 *
 * Team colors are facts, not trademarks — safe to ship (unlike logos, which we
 * deliberately do NOT use). This is the single source of team identity; the
 * `TeamBadge` component reads it, and WS4/WS5 use that badge everywhere a team
 * appears (roll cards, Built-With, career journey, per-season cards).
 *
 * Keyed by the franchise `id` in public/data/franchises.json — NOT the
 * abbreviation (they differ for a few teams: id PHO ↔ abbrev PHX,
 * id BRK ↔ abbrev BKN). Keep keys exactly matching that file's `id`.
 *
 * - primary:   main team color (used as the badge background)
 * - secondary: accent color (used for the badge ring / detail)
 * - text:      readable foreground on `primary` (all are #fff here — primaries
 *              are dark/saturated enough)
 */
import type { Franchise } from '@/types';

export interface TeamColors {
  primary: string;
  secondary: string;
  text: string;
}

/** franchise id → colors. All 30 v1.0 franchises covered. */
export const TEAM_COLORS: Record<string, TeamColors> = {
  ATL: { primary: '#E03A3E', secondary: '#C1D32F', text: '#FFFFFF' },
  BOS: { primary: '#007A33', secondary: '#BA9653', text: '#FFFFFF' },
  BRK: { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },
  CHA: { primary: '#1D1160', secondary: '#00788C', text: '#FFFFFF' },
  CHI: { primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' },
  CLE: { primary: '#860038', secondary: '#FDBB30', text: '#FFFFFF' },
  DAL: { primary: '#00538C', secondary: '#002B5E', text: '#FFFFFF' },
  DEN: { primary: '#0E2240', secondary: '#FEC524', text: '#FFFFFF' },
  DET: { primary: '#C8102E', secondary: '#1D42BA', text: '#FFFFFF' },
  GSW: { primary: '#1D428A', secondary: '#FFC72C', text: '#FFFFFF' },
  HOU: { primary: '#CE1141', secondary: '#C4CED4', text: '#FFFFFF' },
  IND: { primary: '#002D62', secondary: '#FDBB30', text: '#FFFFFF' },
  LAC: { primary: '#C8102E', secondary: '#1D428A', text: '#FFFFFF' },
  LAL: { primary: '#552583', secondary: '#FDB927', text: '#FFFFFF' },
  MEM: { primary: '#5D76A9', secondary: '#12173F', text: '#FFFFFF' },
  MIA: { primary: '#98002E', secondary: '#F9A01B', text: '#FFFFFF' },
  MIL: { primary: '#00471B', secondary: '#EEE1C6', text: '#FFFFFF' },
  MIN: { primary: '#0C2340', secondary: '#236192', text: '#FFFFFF' },
  NOP: { primary: '#0C2340', secondary: '#C8102E', text: '#FFFFFF' },
  NYK: { primary: '#006BB6', secondary: '#F58426', text: '#FFFFFF' },
  OKC: { primary: '#007AC1', secondary: '#EF3B24', text: '#FFFFFF' },
  ORL: { primary: '#0077C0', secondary: '#C4CED4', text: '#FFFFFF' },
  PHI: { primary: '#006BB6', secondary: '#ED174C', text: '#FFFFFF' },
  PHO: { primary: '#1D1160', secondary: '#E56020', text: '#FFFFFF' },
  POR: { primary: '#E03A3E', secondary: '#000000', text: '#FFFFFF' },
  SAC: { primary: '#5A2D81', secondary: '#63727A', text: '#FFFFFF' },
  SAS: { primary: '#000000', secondary: '#C4CED4', text: '#FFFFFF' },
  TOR: { primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' },
  UTA: { primary: '#002B5C', secondary: '#F9A01B', text: '#FFFFFF' },
  WAS: { primary: '#002B5C', secondary: '#E31837', text: '#FFFFFF' },
};

/** Neutral gold-on-dark fallback for any unknown / future franchise id. */
export const FALLBACK_TEAM_COLORS: TeamColors = {
  primary: '#1d1d2b',
  secondary: '#d4a853',
  text: '#FFFFFF',
};

/** Colors for a franchise id, falling back gracefully for unknown ids. */
export function getTeamColors(franchiseId: string): TeamColors {
  return TEAM_COLORS[franchiseId] ?? FALLBACK_TEAM_COLORS;
}

/**
 * Dev helper: assert every franchise in the dataset has a color entry. Called
 * by the WS2 unit test against public/data/franchises.json so a future
 * franchise can't silently fall back to neutral.
 */
export function missingTeamColors(franchises: Pick<Franchise, 'id'>[]): string[] {
  return franchises.filter((f) => !(f.id in TEAM_COLORS)).map((f) => f.id);
}
