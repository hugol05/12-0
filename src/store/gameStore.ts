import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AttributeAssignment,
  Difficulty,
  FranchiseSelection,
  GameMode,
  RatingCategory,
} from '@/types';
import type { SimulationResult } from '@/simulation/types';

const STORAGE_VERSION = 1;

interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  rollIndex: number; // 0-based, up to 10 rolls
  rerollsLeft: number;
  assignments: AttributeAssignment[];
  franchise: FranchiseSelection | null;
  usedBuckets: string[]; // "GSW:2010s" strings already rolled
  seed: number | null;
  result: SimulationResult | null; // not persisted — recomputed/replayed each run

  // actions
  setMode: (mode: GameMode) => void;
  setDifficulty: (d: Difficulty) => void;
  assignPlayer: (a: AttributeAssignment) => void;
  setFranchise: (f: FranchiseSelection) => void;
  markBucketUsed: (key: string) => void;
  useReroll: () => void;
  advanceRoll: () => void;
  setSeed: (seed: number) => void;
  setResult: (r: SimulationResult | null) => void;
  reset: () => void;
}

const initialState = {
  mode: 'newChapter' as GameMode,
  difficulty: 'normal' as Difficulty,
  rollIndex: 0,
  rerollsLeft: 2,
  assignments: [] as AttributeAssignment[],
  franchise: null as FranchiseSelection | null,
  usedBuckets: [] as string[],
  seed: null as number | null,
  result: null as SimulationResult | null,
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...initialState,

      setMode: (mode) => set({ mode }),
      setDifficulty: (difficulty) => set({ difficulty }),
      assignPlayer: (a) =>
        set((s) => ({
          assignments: [...s.assignments.filter((x) => x.category !== a.category), a],
        })),
      setFranchise: (franchise) => set({ franchise }),
      markBucketUsed: (key) =>
        set((s) => (s.usedBuckets.includes(key) ? s : { usedBuckets: [...s.usedBuckets, key] })),
      useReroll: () => set((s) => ({ rerollsLeft: Math.max(0, s.rerollsLeft - 1) })),
      advanceRoll: () => set((s) => ({ rollIndex: s.rollIndex + 1 })),
      setSeed: (seed) => set({ seed }),
      setResult: (result) => set({ result }),
      reset: () => set({ ...initialState }),
    }),
    {
      name: '12-0:build',
      version: STORAGE_VERSION,
      // The simulation result is large and re-derivable from the build; never persist it.
      partialize: (s) => ({
        mode: s.mode,
        difficulty: s.difficulty,
        rollIndex: s.rollIndex,
        rerollsLeft: s.rerollsLeft,
        assignments: s.assignments,
        franchise: s.franchise,
        usedBuckets: s.usedBuckets,
        seed: s.seed,
      }),
    },
  ),
);

/** Categories still unfilled, in canonical order. */
export function unfilledCategories(filled: AttributeAssignment[]): RatingCategory[] {
  const taken = new Set(filled.map((a) => a.category));
  const order: RatingCategory[] = [
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
  return order.filter((c) => !taken.has(c));
}
