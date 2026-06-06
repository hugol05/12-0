import { useEffect, useState } from 'react';
import type { Franchise, Player } from '@/types';
import { loadFranchises, loadPlayers, loadRollIndex, type RollIndex } from './loadGameData';

export interface GameData {
  rollIndex: RollIndex;
  playersById: Map<string, Player>;
  franchisesById: Map<string, Franchise>;
  franchises: Franchise[];
}

interface State {
  data: GameData | null;
  loading: boolean;
  error: string | null;
}

// Loads the three core data files once (each is cached in loadGameData) and shapes
// them into lookup maps for the build + preview screens.
export function useGameData(): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRollIndex(), loadPlayers(), loadFranchises()])
      .then(([rollIndex, players, franchises]) => {
        if (cancelled) return;
        const playersById = new Map(players.map((p) => [p.id, p]));
        const franchisesById = new Map(franchises.map((f) => [f.id, f]));
        setState({ data: { rollIndex, playersById, franchisesById, franchises }, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : String(e) });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}
