/// <reference lib="webworker" />
// Web Worker wrapper around the pure simulateCareer engine. Keeps the (cheap but
// non-trivial) season loop off the main thread so the UI stays responsive and the
// season-by-season playback can be animated. The engine itself is deterministic —
// same SimContext in, same SimulationResult out — so the worker is a thin shim.
import { simulateCareer } from './career';
import type { SimContext, SimulationResult } from './types';

export interface SimRequest {
  id: number;
  ctx: SimContext;
}
export interface SimResponse {
  id: number;
  result?: SimulationResult;
  error?: string;
}

self.addEventListener('message', (e: MessageEvent<SimRequest>) => {
  const { id, ctx } = e.data;
  try {
    const result = simulateCareer(ctx);
    const res: SimResponse = { id, result };
    (self as DedicatedWorkerGlobalScope).postMessage(res);
  } catch (err) {
    const res: SimResponse = { id, error: err instanceof Error ? err.message : String(err) };
    (self as DedicatedWorkerGlobalScope).postMessage(res);
  }
});
