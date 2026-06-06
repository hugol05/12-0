import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AttributeAssignment,
  Difficulty,
  FranchiseSelection,
  GameMode,
  RatingCategory,
} from '@/types';

const STORAGE_VERSION = 1;

interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  rollIndex: number; // 0-based, up to 10 rolls
  rerollsLeft: number;
  assignments: AttributeAssignment[];
  franchise: FranchiseSelection | null;
  usedBuckets: string[]; // "GSW:2010s" strings already rolled

  // actions
  setMode: (mode: GameMode) => void;
  setDifficulty: (d: Difficulty) => void;
  assignPlayer: (a: AttributeAssignment) => void;
  setFranchise: (f: FranchiseSelection) => void;
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
      reset: () => set({ ...initialState }),
    }),
    {
      name: '12-0:build',
      version: STORAGE_VERSION,
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
