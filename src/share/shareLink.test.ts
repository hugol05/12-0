import { describe, it, expect } from 'vitest';
import {
  encodeBuild,
  decodeBuild,
  reconstructBuild,
  shareUrl,
  CANON_CATEGORIES,
} from './shareLink';
import type { AttributeAssignment, Decade, Player } from '@/types';
import type { GameData } from '@/data/useGameData';

function makeAssignments(): AttributeAssignment[] {
  const decade: Decade = '2010s';
  return CANON_CATEGORIES.map((category, i) => ({
    category,
    playerId: `${1000 + i}`,
    rating: 70 + i,
    source: { franchise: 'GSW', decade },
  }));
}

const FRANCHISE = { franchise: 'LAL', decade: '1980s' as Decade };

describe('share link', () => {
  it('round-trips a complete build through encode/decode', () => {
    const assignments = makeAssignments();
    const code = encodeBuild({
      difficulty: 'hard',
      seed: 123456789,
      dataVersion: '2026.06.07',
      franchise: FRANCHISE,
      assignments,
    });
    expect(code).toBeTruthy();

    const payload = decodeBuild(code!);
    expect(payload).not.toBeNull();
    expect(payload!.difficulty).toBe('hard');
    expect(payload!.seed).toBe(123456789);
    expect(payload!.dataVersion).toBe('2026.06.07');
    expect(payload!.franchise).toEqual(FRANCHISE);
    expect(payload!.picks).toHaveLength(9);
    expect(payload!.picks[0].playerId).toBe('1000');
    expect(payload!.picks[0].decade).toBe('2010s');
  });

  it('preserves category order regardless of assignment order', () => {
    const shuffled = [...makeAssignments()].reverse();
    const code = encodeBuild({
      difficulty: 'normal',
      seed: 42,
      dataVersion: 'v1',
      franchise: FRANCHISE,
      assignments: shuffled,
    })!;
    const payload = decodeBuild(code)!;
    // picks[i] must correspond to CANON_CATEGORIES[i], not the shuffled input order
    payload.picks.forEach((pick, i) => {
      expect(pick.playerId).toBe(`${1000 + i}`);
    });
  });

  it('returns null for an incomplete build', () => {
    expect(
      encodeBuild({
        difficulty: 'easy',
        seed: 1,
        dataVersion: 'v1',
        franchise: FRANCHISE,
        assignments: makeAssignments().slice(0, 8),
      }),
    ).toBeNull();
    expect(
      encodeBuild({
        difficulty: 'easy',
        seed: null,
        dataVersion: 'v1',
        franchise: FRANCHISE,
        assignments: makeAssignments(),
      }),
    ).toBeNull();
  });

  it('rejects malformed codes', () => {
    expect(decodeBuild('')).toBeNull();
    expect(decodeBuild('not-base64-$$$')).toBeNull();
    expect(decodeBuild(btoa('garbage|payload'))).toBeNull();
  });

  it('reconstructs assignments and re-derives ratings from player records', () => {
    const assignments = makeAssignments();
    const code = encodeBuild({
      difficulty: 'normal',
      seed: 99,
      dataVersion: 'v1',
      franchise: FRANCHISE,
      assignments,
    })!;
    const payload = decodeBuild(code)!;

    // build a minimal GameData whose players carry distinct per-category ratings
    const playersById = new Map<string, Player>();
    assignments.forEach((a, i) => {
      const ratings = Object.fromEntries(
        CANON_CATEGORIES.map((c) => [c, 50]),
      ) as Player['ratings'];
      ratings[a.category] = 88 + i; // the rating we expect to be re-derived
      playersById.set(a.playerId, {
        id: a.playerId,
        name: `Player ${i}`,
        positions: ['SF'],
        teams: [],
        stats: { ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0 },
        ratings,
        photo: { url: '', status: 'fallback', fallback: '' },
      });
    });
    const data = { playersById } as unknown as GameData;

    const rebuilt = reconstructBuild(payload, data, 'v1');
    expect(rebuilt).not.toBeNull();
    expect(rebuilt!.dataVersionMatches).toBe(true);
    expect(rebuilt!.assignments).toHaveLength(9);
    rebuilt!.assignments.forEach((a, i) => {
      expect(a.category).toBe(CANON_CATEGORIES[i]);
      expect(a.rating).toBe(88 + i); // re-derived from the player record, not the link
    });
  });

  it('flags a dataVersion mismatch but still reconstructs when players exist', () => {
    const assignments = makeAssignments();
    const code = encodeBuild({
      difficulty: 'normal',
      seed: 7,
      dataVersion: 'old-version',
      franchise: FRANCHISE,
      assignments,
    })!;
    const payload = decodeBuild(code)!;
    const playersById = new Map<string, Player>();
    assignments.forEach((a, i) => {
      playersById.set(a.playerId, {
        id: a.playerId,
        name: `P${i}`,
        positions: ['SF'],
        teams: [],
        stats: { ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0 },
        ratings: Object.fromEntries(CANON_CATEGORIES.map((c) => [c, 60])) as Player['ratings'],
        photo: { url: '', status: 'fallback', fallback: '' },
      });
    });
    const data = { playersById } as unknown as GameData;
    const rebuilt = reconstructBuild(payload, data, 'new-version');
    expect(rebuilt).not.toBeNull();
    expect(rebuilt!.dataVersionMatches).toBe(false);
  });

  it('returns null when a drafted player is missing from the dataset', () => {
    const code = encodeBuild({
      difficulty: 'normal',
      seed: 7,
      dataVersion: 'v1',
      franchise: FRANCHISE,
      assignments: makeAssignments(),
    })!;
    const payload = decodeBuild(code)!;
    const data = { playersById: new Map() } as unknown as GameData;
    expect(reconstructBuild(payload, data, 'v1')).toBeNull();
  });

  it('builds an absolute share URL', () => {
    const url = shareUrl('ABC123');
    expect(url).toMatch(/\/r\?b=ABC123$/);
  });
});
