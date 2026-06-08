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

const STORAGE_VERSION = 2;

interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  rollIndex: number; // 0-based, up to 10 rolls
  // Granular re-rolls: 1 to swap the team and 1 to swap the era during the 9 attribute rolls,
  // plus 1 dedicated re-roll on the final starting-franchise roll.
  rerollTeamLeft: number;
  rerollEraLeft: number;
  rerollFranchiseLeft: number;
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
  useRerollTeam: () => void;
  useRerollEra: () => void;
  useRerollFranchise: () => void;
  advanceRoll: () => void;
  setSeed: (seed: number) => void;
  setResult: (r: SimulationResult | null) => void;
  loadBuild: (b: {
    difficulty: Difficulty;
    seed: number;
    franchise: FranchiseSelection;
    assignments: AttributeAssignment[];
  }) => void;
  reset: () => void;
}

const initialState = {
  mode: 'newChapter' as GameMode,
  difficulty: 'normal' as Difficulty,
  rollIndex: 0,
  rerollTeamLeft: 1,
  rerollEraLeft: 1,
  rerollFranchiseLeft: 1,
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
      useRerollTeam: () => set((s) => ({ rerollTeamLeft: Math.max(0, s.rerollTeamLeft - 1) })),
      useRerollEra: () => set((s) => ({ rerollEraLeft: Math.max(0, s.rerollEraLeft - 1) })),
      useRerollFranchise: () => set((s) => ({ rerollFranchiseLeft: Math.max(0, s.rerollFranchiseLeft - 1) })),
      advanceRoll: () => set((s) => ({ rollIndex: s.rollIndex + 1 })),
      setSeed: (seed) => set({ seed }),
      setResult: (result) => set({ result }),
      loadBuild: (b) =>
        set({
          mode: 'newChapter',
          difficulty: b.difficulty,
          seed: b.seed,
          franchise: b.franchise,
          assignments: b.assignments,
          rollIndex: 10,
          rerollTeamLeft: 0,
          rerollEraLeft: 0,
          rerollFranchiseLeft: 0,
          usedBuckets: [],
          result: null,
        }),
      reset: () => set({ ...initialState }),
    }),
    {
      name: '12-0:build',
      version: STORAGE_VERSION,
      // Old persisted shapes (e.g. the v1 single `rerollsLeft`) are merged over the current
      // defaults; fields that no longer exist are dropped and new reroll fields take their defaults.
      migrate: (persisted) => persisted as GameState,
      // The simulation result is large and re-derivable from the build; never persist it.
      partialize: (s) => ({
        mode: s.mode,
        difficulty: s.difficulty,
        rollIndex: s.rollIndex,
        rerollTeamLeft: s.rerollTeamLeft,
        rerollEraLeft: s.rerollEraLeft,
        rerollFranchiseLeft: s.rerollFranchiseLeft,
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
