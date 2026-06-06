import { simulateCareer } from './career';
import type { SimContext, SimulationResult } from './types';
import type { SimRequest, SimResponse } from './simulation.worker';

// Runs a career on a dedicated Web Worker, falling back to a synchronous run when
// Workers are unavailable (SSR, old browsers, test envs). Returns the immutable
// SimulationResult. The engine is deterministic, so the worker vs. sync path makes
// no difference to the output.
export function runCareerInWorker(ctx: SimContext): Promise<SimulationResult> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(simulateCareer(ctx));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
    const id = Date.now();
    worker.onmessage = (e: MessageEvent<SimResponse>) => {
      if (e.data.id !== id) return;
      worker.terminate();
      if (e.data.error) reject(new Error(e.data.error));
      else if (e.data.result) resolve(e.data.result);
      else reject(new Error('worker returned no result'));
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message || 'simulation worker error'));
    };
    const req: SimRequest = { id, ctx };
    worker.postMessage(req);
  });
}
