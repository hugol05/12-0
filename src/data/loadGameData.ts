import type { DataManifest, Franchise, Player, RollBucket } from '@/types';

// All generated data lives under /data/ (public/data at build time).
// We load the manifest first, then lazily fetch the larger files on demand.

const DATA_BASE = '/data';

let manifestPromise: Promise<DataManifest> | null = null;

export function loadManifest(): Promise<DataManifest> {
  manifestPromise ??= fetchJson<DataManifest>('manifest.json');
  return manifestPromise;
}

const cache = new Map<string, Promise<unknown>>();

function fetchJson<T>(file: string): Promise<T> {
  const existing = cache.get(file) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fetch(`${DATA_BASE}/${file}`).then((res) => {
    if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
    return res.json() as Promise<T>;
  });
  cache.set(file, p);
  return p;
}

export interface RollIndex {
  dataVersion: string;
  minBucketSize: number;
  buckets: RollBucket[];
}

export const loadFranchises = () => fetchJson<Franchise[]>('franchises.json');
export const loadRollIndex = () => fetchJson<RollIndex>('roll-index.json');
export const loadPlayers = () => fetchJson<Player[]>('players.json');
