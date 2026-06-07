import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Franchise } from '@/types';
import { TEAM_COLORS, getTeamColors, missingTeamColors } from './teamColors';

const franchises: Franchise[] = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../public/data/franchises.json', import.meta.url)), 'utf8'),
);

describe('teamColors', () => {
  it('covers every franchise in the shipped dataset', () => {
    expect(missingTeamColors(franchises)).toEqual([]);
  });

  it('has exactly the 30 v1.0 franchises, no orphan keys', () => {
    const ids = new Set(franchises.map((f) => f.id));
    expect(Object.keys(TEAM_COLORS).length).toBe(ids.size);
    for (const key of Object.keys(TEAM_COLORS)) {
      expect(ids.has(key)).toBe(true);
    }
  });

  it('every entry has valid 6-digit hex for primary/secondary/text', () => {
    const hex = /^#[0-9A-Fa-f]{6}$/;
    for (const [id, c] of Object.entries(TEAM_COLORS)) {
      expect(hex.test(c.primary), `${id}.primary`).toBe(true);
      expect(hex.test(c.secondary), `${id}.secondary`).toBe(true);
      expect(hex.test(c.text), `${id}.text`).toBe(true);
    }
  });

  it('falls back gracefully for an unknown franchise id', () => {
    const c = getTeamColors('ZZZ');
    expect(c.primary).toBeTruthy();
    expect(c.text).toBe('#FFFFFF');
  });
});
