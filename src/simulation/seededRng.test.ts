import { describe, it, expect } from 'vitest';
import { SeededRng, hashSeed } from './seededRng';
import { computeOvr, OVR_WEIGHTS } from './categories';
import type { Ratings } from '@/types';

describe('SeededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = new SeededRng(12345);
    const b = new SeededRng(12345);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it('stays within [0, 1)', () => {
    const rng = new SeededRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() is inclusive on both ends', () => {
    const rng = new SeededRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(1, 3));
    expect(seen).toEqual(new Set([1, 2, 3]));
  });

  it('hashSeed is stable', () => {
    expect(hashSeed('GSW:2010s')).toEqual(hashSeed('GSW:2010s'));
    expect(hashSeed('a')).not.toEqual(hashSeed('b'));
  });
});

describe('computeOvr', () => {
  it('OVR weights sum to 1.0', () => {
    const sum = Object.values(OVR_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('excludes durability from OVR', () => {
    const base: Ratings = {
      shooting: 90,
      playmaking: 90,
      defense: 90,
      clutch: 90,
      athleticism: 90,
      rebounding: 90,
      height: 90,
      basketballIq: 90,
      durability: 50,
    };
    const high: Ratings = { ...base, durability: 99 };
    expect(computeOvr(base)).toEqual(computeOvr(high));
    expect(computeOvr(base)).toEqual(90);
  });
});
