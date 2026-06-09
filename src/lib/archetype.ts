/**
 * Built-player archetype, nickname, and height display.
 *
 * Height is no longer surfaced to the player as a 0-99 rating ("94 Height"); it still feeds OVR,
 * but the UI shows the real listed height and folds size into the archetype (e.g. a 7-footer reads
 * as a "Paint Beast" / "Defensive Anchor"). Nicknames are derived from the player's identity
 * (top categories + size) using vocabulary inspired by the 2K archetype names.
 */
import type { RatingCategory } from '@/types';

export type Filled = Partial<Record<RatingCategory, number>>;

/** Skill categories that define identity (height + durability are not "skills"). */
const SKILLS: RatingCategory[] = ['shooting', 'playmaking', 'defense', 'rebounding', 'athleticism', 'basketballIq', 'clutch'];

/** Parse a stored height ("6-7") or display height (6'7") to inches. */
export function parseHeightInches(h?: string): number | undefined {
  if (!h) return undefined;
  const dash = h.match(/^(\d+)-(\d+)$/);
  if (dash) return Number(dash[1]) * 12 + Number(dash[2]);
  const feet = h.match(/(\d+)\s*['’]\s*(\d+)/);
  if (feet) return Number(feet[1]) * 12 + Number(feet[2]);
  return undefined;
}

/** "6-7" → 6'7". Falls back to the raw string if it can't be parsed. */
export function formatHeight(h?: string): string {
  const inches = parseHeightInches(h);
  if (inches == null) return h ?? '—';
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

type Size = 'Guard' | 'Wing' | 'Forward' | 'Big';
function sizeOf(inches?: number): Size {
  if (inches == null) return 'Wing';
  if (inches < 74) return 'Guard';
  if (inches < 79) return 'Wing';
  if (inches < 83) return 'Forward';
  return 'Big';
}

function ranked(filled: Filled): { c: RatingCategory; v: number }[] {
  return SKILLS.map((c) => ({ c, v: filled[c] ?? 0 })).sort((a, b) => b.v - a.v);
}

function coreName(cat: RatingCategory, size: Size): string {
  const big = size === 'Big';
  const post = size === 'Big' || size === 'Forward';
  switch (cat) {
    case 'shooting': return big ? 'Stretch Big' : 'Sharpshooter';
    case 'playmaking': return size === 'Guard' ? 'Floor General' : big ? 'Point Center' : 'Point Forward';
    case 'defense': return post ? 'Defensive Anchor' : 'Perimeter Lockdown';
    case 'rebounding': return post ? 'Paint Beast' : 'Glass Cleaner';
    case 'athleticism': return big ? 'Rim Runner' : size === 'Forward' ? 'Aerial Finisher' : 'Slasher';
    case 'clutch': return big ? 'Go-To Big' : 'Shot Creator';
    case 'basketballIq': return size === 'Guard' ? 'Maestro' : big ? 'Cerebral Big' : 'Point Forward';
    default: return 'Hooper';
  }
}

const SECOND_ADJ: Partial<Record<RatingCategory, string>> = {
  shooting: 'Sharpshooting', playmaking: 'Playmaking', defense: 'Two-Way',
  rebounding: 'Rebounding', athleticism: 'Explosive', clutch: 'Clutch', basketballIq: 'Crafty',
};

/**
 * A 2K-style archetype label for the assembled player. Folds size in (so height lives here, not as
 * a number). `heightInches` should come from the player assigned to the Height category.
 */
export function buildArchetype(filled: Filled, heightInches?: number): string {
  const size = sizeOf(heightInches);
  const r = ranked(filled);
  const top = r[0];
  const second = r[1];

  // Elite tiers borrow the dataset's top archetype names.
  const eliteCount = r.filter((x) => x.v >= 90).length;
  if (eliteCount >= 6) return 'Demigod';
  if (r.filter((x) => x.v >= 87).length >= 4) return 'All-Around Star';

  const core = coreName(top.c, size);
  // add a secondary trait when it's also strong and adds new information
  if (second && second.v >= 82 && second.c !== top.c) {
    const adj = SECOND_ADJ[second.c];
    if (adj && !core.toLowerCase().includes(adj.toLowerCase())) return `${adj} ${core}`;
  }
  return core;
}

const NICKS: Record<RatingCategory, string[]> = {
  shooting: ['The Sniper', 'The Marksman', 'Splash', 'Flamethrower', 'The Dagger'],
  playmaking: ['The Maestro', 'Floor General', 'The Magician', 'Point God', 'The Quarterback'],
  defense: ['The Glove', 'The Eraser', 'Lockdown', 'The Menace', 'No-Fly Zone'],
  rebounding: ['The Vacuum', 'Glass Cleaner', 'The Beast', 'Workhorse', 'The Enforcer'],
  athleticism: ['The Freak', 'Sky Walker', 'The Blur', 'High Riser', 'Bounce'],
  basketballIq: ['The Professor', 'The General', 'The Surgeon', 'The Oracle', 'The Genius'],
  clutch: ['The Closer', 'Mr. Big Shot', 'Ice', 'Cold-Blooded', 'The Killer'],
  height: ['The Tower', 'Skyscraper', 'The Monolith'],
  durability: ['The Ironman', 'Evergreen', 'Mr. Reliable', 'The Constant'],
};

/** A realistic moniker tied to the player's standout trait (and size for bigs). */
export function nickname(filled: Filled, seed: number, perfect: boolean, heightInches?: number): string {
  if (perfect) return '"The Immortal"';
  const r = ranked(filled);
  const top = r[0];
  // A dominant big whose calling card is size/paint play gets a tower nickname.
  const size = sizeOf(heightInches);
  const pool = size === 'Big' && (top.c === 'rebounding' || top.c === 'defense') ? NICKS.height : NICKS[top.c];
  return `"${pool[Math.abs(seed) % pool.length]}"`;
}
