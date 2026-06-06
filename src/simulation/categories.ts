import type { OvrCategory, RatingCategory, Ratings } from '@/types';

export interface CategoryDef {
  key: RatingCategory;
  label: string;
  icon: string; // emoji used in mockups; UI may swap for Lucide icons
  /** OVR weight; durability is 0 (career length only). */
  weight: number;
}

// Order + weights mirror docs/attributes.md. OVR weights sum to 1.0.
export const CATEGORIES: CategoryDef[] = [
  { key: 'shooting', label: 'Shooting', icon: '🎯', weight: 0.2 },
  { key: 'playmaking', label: 'Playmaking', icon: '🏀', weight: 0.15 },
  { key: 'defense', label: 'Defense', icon: '🛡️', weight: 0.15 },
  { key: 'clutch', label: 'Clutch', icon: '🔥', weight: 0.15 },
  { key: 'athleticism', label: 'Athleticism', icon: '⚡', weight: 0.1 },
  { key: 'rebounding', label: 'Rebounding', icon: '💪', weight: 0.1 },
  { key: 'height', label: 'Height & Wingspan', icon: '📏', weight: 0.08 },
  { key: 'basketballIq', label: 'Basketball IQ', icon: '🧠', weight: 0.07 },
  { key: 'durability', label: 'Durability', icon: '🏋️', weight: 0 },
];

export const OVR_WEIGHTS: Record<OvrCategory, number> = {
  shooting: 0.2,
  playmaking: 0.15,
  defense: 0.15,
  clutch: 0.15,
  athleticism: 0.1,
  rebounding: 0.1,
  height: 0.08,
  basketballIq: 0.07,
};

/** Weighted OVR from the 8 contributing categories. Durability is excluded. */
export function computeOvr(ratings: Ratings): number {
  let ovr = 0;
  for (const [cat, weight] of Object.entries(OVR_WEIGHTS) as [OvrCategory, number][]) {
    ovr += ratings[cat] * weight;
  }
  return Math.round(ovr);
}
