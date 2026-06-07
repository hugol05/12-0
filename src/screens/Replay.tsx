import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PlayerBuild } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { loadManifest } from '@/data/loadGameData';
import { assignmentsToRatings } from '@/simulation/career';
import { runCareerInWorker } from '@/simulation/runCareer';
import type { SimContext } from '@/simulation/types';
import { decodeBuild, reconstructBuild } from '@/share/shareLink';
import './Replay.css';

// Landing screen for a shared career link (/r?b=CODE). Reconstructs the exact build
// from the code, re-runs the deterministic engine against the live dataset, and drops
// the recipient straight onto the Results poster.
export default function Replay() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data } = useGameData();
  const loadBuild = useGameStore((s) => s.loadBuild);
  const setResult = useGameStore((s) => s.setResult);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !data) return;
    const code = params.get('b');
    if (!code) { setError('This link is missing its build code.'); return; }
    const payload = decodeBuild(code);
    if (!payload) { setError('This link is invalid or corrupted.'); return; }
    startedRef.current = true;

    loadManifest()
      .then((manifest) => {
        const rebuilt = reconstructBuild(payload, data, manifest.dataVersion);
        if (!rebuilt) throw new Error('Some players in this link are no longer in the dataset.');
        loadBuild({
          difficulty: rebuilt.difficulty,
          seed: rebuilt.seed,
          franchise: rebuilt.franchise,
          assignments: rebuilt.assignments,
        });
        const build: PlayerBuild = {
          assignments: rebuilt.assignments,
          franchise: rebuilt.franchise,
          difficulty: rebuilt.difficulty,
          mode: 'newChapter',
          seed: rebuilt.seed,
          dataVersion: manifest.dataVersion,
        };
        const ctx: SimContext = {
          build,
          ratings: assignmentsToRatings(rebuilt.assignments),
          franchises: data.franchises.map((f) => ({
            id: f.id,
            name: f.name,
            baseRating2026: f.baseRating2026,
            marketTier: f.marketTier,
            youthIndex: f.youthIndex,
          })),
        };
        return runCareerInWorker(ctx);
      })
      .then((r) => {
        setResult(r);
        navigate('/results', { replace: true });
      })
      .catch((e: unknown) => {
        startedRef.current = false;
        setError(e instanceof Error ? e.message : 'Could not replay this career.');
      });
  }, [data, params, loadBuild, setResult, navigate]);

  return (
    <main className="replay">
      {error ? (
        <div className="replay__box">
          <p className="replay__msg">{error}</p>
          <button className="cta" onClick={() => navigate('/')}>Build your own →</button>
        </div>
      ) : (
        <p className="muted replay__loading">Replaying career…</p>
      )}
    </main>
  );
}
