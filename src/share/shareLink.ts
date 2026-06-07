import type {
  AttributeAssignment,
  Decade,
  Difficulty,
  FranchiseSelection,
  RatingCategory,
} from '@/types';
import type { GameData } from '@/data/useGameData';

// A 12-0 share link captures everything needed to deterministically replay a career:
// the 9 drafted players (in canonical category order), the starting franchise+decade,
// the difficulty, the RNG seed, and the dataVersion it was built against. Ratings are
// NOT stored — they are re-derived from the player records at decode time, so the link
// stays compact and always matches the shipped dataset. Same build + dataVersion + seed
// ⇒ identical career (the determinism contract), so the recipient sees the exact result.

/** Canonical category order. The 9 assignments are emitted/parsed in this order. */
export const CANON_CATEGORIES: RatingCategory[] = [
  'shooting',
  'playmaking',
  'defense',
  'clutch',
  'athleticism',
  'rebounding',
  'height',
  'basketballIq',
  'durability',
];

const DECADES: Decade[] = [
  '1940s',
  '1950s',
  '1960s',
  '1970s',
  '1980s',
  '1990s',
  '2000s',
  '2010s',
  '2020s',
];

const DIFF_CODE: Record<Difficulty, string> = { easy: 'e', normal: 'n', hard: 'h' };
const CODE_DIFF: Record<string, Difficulty> = { e: 'easy', n: 'normal', h: 'hard' };

export interface SharePayload {
  v: 1;
  difficulty: Difficulty;
  seed: number;
  dataVersion: string;
  franchise: FranchiseSelection;
  /** playerId + source bucket per assignment, in CANON_CATEGORIES order. */
  picks: { playerId: string; franchise: string; decade: Decade }[];
}

function base64UrlEncode(s: string): string {
  // btoa works on Latin-1; our payload is ASCII (ids, abbreviations, digits) so this is safe.
  const b64 = typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
}

/**
 * Encode a build into a compact, URL-safe code. Returns null if the build is
 * incomplete (needs all 9 categories + a franchise).
 */
export function encodeBuild(input: {
  difficulty: Difficulty;
  seed: number | null;
  dataVersion: string;
  franchise: FranchiseSelection | null;
  assignments: AttributeAssignment[];
}): string | null {
  const { difficulty, seed, dataVersion, franchise, assignments } = input;
  if (seed == null || !franchise || assignments.length !== 9) return null;

  const byCategory = new Map(assignments.map((a) => [a.category, a]));
  const tokens: string[] = [];
  for (const cat of CANON_CATEGORIES) {
    const a = byCategory.get(cat);
    if (!a) return null; // a category is missing — not a complete build
    const decadeIdx = DECADES.indexOf(a.source.decade);
    tokens.push(`${a.playerId}.${a.source.franchise}.${decadeIdx}`);
  }

  // Pipe-delimited fields; the picks block is comma-joined. base64url at the end keeps
  // the URL clean and lets us version/extend the format without ambiguous separators.
  const raw = [
    '1',
    DIFF_CODE[difficulty],
    seed.toString(36),
    dataVersion,
    `${franchise.franchise}.${DECADES.indexOf(franchise.decade)}`,
    tokens.join(','),
  ].join('|');
  return base64UrlEncode(raw);
}

/** Decode a share code back into a payload, or null if malformed. */
export function decodeBuild(code: string): SharePayload | null {
  let raw: string;
  try {
    raw = base64UrlDecode(code);
  } catch {
    return null;
  }
  const parts = raw.split('|');
  if (parts.length !== 6 || parts[0] !== '1') return null;
  const [, diffCode, seed36, dataVersion, franchiseField, picksField] = parts;

  const difficulty = CODE_DIFF[diffCode];
  if (!difficulty) return null;

  const seed = parseInt(seed36, 36);
  if (!Number.isFinite(seed)) return null;

  const [frId, frDecIdx] = franchiseField.split('.');
  const frDecade = DECADES[Number(frDecIdx)];
  if (!frId || !frDecade) return null;

  const pickTokens = picksField.split(',');
  if (pickTokens.length !== CANON_CATEGORIES.length) return null;
  const picks: SharePayload['picks'] = [];
  for (const tok of pickTokens) {
    const [playerId, franchise, decIdx] = tok.split('.');
    const decade = DECADES[Number(decIdx)];
    if (!playerId || !franchise || !decade) return null;
    picks.push({ playerId, franchise, decade });
  }

  return {
    v: 1,
    difficulty,
    seed,
    dataVersion,
    franchise: { franchise: frId, decade: frDecade },
    picks,
  };
}

export interface ReconstructedBuild {
  difficulty: Difficulty;
  seed: number;
  franchise: FranchiseSelection;
  assignments: AttributeAssignment[];
  dataVersionMatches: boolean;
}

/**
 * Rebuild the in-app state (assignments + franchise + seed) from a decoded payload,
 * re-deriving each category rating from the live player records. Returns null if any
 * drafted player is missing from the current dataset (an unrecoverable mismatch).
 */
export function reconstructBuild(
  payload: SharePayload,
  data: GameData,
  currentDataVersion: string,
): ReconstructedBuild | null {
  const assignments: AttributeAssignment[] = [];
  for (let i = 0; i < CANON_CATEGORIES.length; i++) {
    const category = CANON_CATEGORIES[i];
    const pick = payload.picks[i];
    const player = data.playersById.get(pick.playerId);
    if (!player) return null;
    assignments.push({
      category,
      playerId: pick.playerId,
      rating: player.ratings[category],
      source: { franchise: pick.franchise, decade: pick.decade },
    });
  }
  return {
    difficulty: payload.difficulty,
    seed: payload.seed,
    franchise: payload.franchise,
    assignments,
    dataVersionMatches: payload.dataVersion === currentDataVersion,
  };
}

/** Build a full shareable URL for a code, rooted at the current origin. */
export function shareUrl(code: string): string {
  const origin =
    typeof window !== 'undefined' && window.location ? window.location.origin : 'https://12-0.app';
  return `${origin}/r?b=${code}`;
}
