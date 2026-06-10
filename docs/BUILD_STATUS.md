# 12-0 — Build Status Report

> **Snapshot of what is implemented and verified**, as of 2026-06-10 on branch `main`.
> Companion to [MASTER_PLAN.md](MASTER_PLAN.md) (the ordered task list). When a phase lands, update this report.

---

## At a glance

| Phase | Scope | Status |
|------|-------|--------|
| 1 | Project init & infrastructure | ✅ Done & committed (`78c01bb`) |
| 2 | Source-backed data pipeline | ✅ Done & committed (`f17bdc6`); 2K-style ratings + balance/durability rework `2026-06-10` |
| 3 | Deterministic simulation engine | ✅ Done & committed (`2131016`); win-curve + durability recalibration `2026-06-10` |
| 4–6 | Game loop UI (build → preview → simulate → results) | ✅ Done & committed (`c0e692a`) |
| 6 | Share / replay links | ✅ Done & committed (`3820fb8`) |
| 6 | PWA install + offline | ✅ Configured (Workbox `sw.js`, runtime CacheFirst `/data/`) |
| — | v2 "premium" pass (WS1-7: ratings, design system, silhouette, redesigns) | ✅ Merged to `main` |
| 6 | Framer Motion polish | 🔜 Deferred (see [next-upgrades.md](next-upgrades.md)) |

**Verification (all green):** `npm run typecheck` · `npm test` (40 tests, 6 files — 37 pass, 3 skipped on-demand) · `npm run build` (tsc -b + Vite + PWA `sw.js`) · `npm run data` (rebuild `public/data/*.json`). On-demand real-pool calibration: `BALANCE=1 npx vitest run src/simulation/_balanceProbe.test.ts`. Deployed to Vercel: `https://12-0-delta.vercel.app`.

---

## What's built

### Data (Phase 2) — `public/data/`
- **2,545 players**, **179 franchise+decade buckets** spanning the **1950s–2020s**, all **30 franchises**, **91% headshots verified**.
- Reproducible pipeline (`npm run data` → `scripts/data/{util,twok,build,validate}.ts`, run via `tsx`): fetch+cache raw CSVs → normalize → 2K-style ratings (source of truth for ~570 marquee players) + era-aware percentile fallback formulas (OVR-capped at 80) → curated overrides → emit `players.json`, `franchises.json`, `roll-index.json`, `manifest.json` → schema + invariant validation.
- Sources: `peasant98/TheNBACSV` (1950–2017, BR-derived) + `Brescou/NBA-dataset-stats-player-team` (MIT, 2018–2023; real heights + NBA `PERSON_ID` for headshots) + a hand-curated 2K-style attribute set (`data-source/2k/`, ~570 players, source of truth for shooting/playmaking/defense/rebounding/athleticism/IQ + clutch/height/archetype). `nba_api` is an **optional local-only refresh** (stats.nba.com is IP-blocked in CI → returns `000`).
- **Durability** is computed the same way for every player — `durabilityFromYears(seasonsPlayed)` (the inverse of the engine's career-length curve, shared via `src/simulation/durability.ts`), with `years_in_the_nba` from the 2K card filling the gap for still-active players whose box-score history caps at 2022-23. So a real player's durability round-trips: build with LeBron's durability ⇒ ~LeBron-length career.
- 2020s rosters are **re-anchored to real 2025-26 teams** from the current 2K roster file.

### Engine (Phase 3) — `src/simulation/`
- `simulateCareer(ctx)` is **fully deterministic**: same build + `dataVersion` + `seed` ⇒ identical career. Seeded `mulberry32` RNG, never `Math.random()`.
- Aging curve (peak ~29), durability→retirement age (`durability.ts` `DURABILITY_YEARS`, anchored 87→15yr … 99→22yr), injury risk, 4-round playoffs with a Clutch-driven, rubber-banded Finals bonus, `TITLE_CAP = 12` (retire on the 12th ring), awards, contender-weighted player movement, legacy tiers.
- **Two-axis difficulty** (see [BALANCE_2K.md §6](BALANCE_2K.md)): total rings scale with OVR, 12-0-vs-12-X scales with Clutch. Real-pool calibration (`_balanceProbe.test.ts`): a 94-OVR/95-clutch build → ~5% 12-0; optimal play (~92 OVR) → ~10% 12-0; god build (98/99) → ~86% 12-0. Synthetic uniform bands in `career.test.ts` remain monotonic.
- Runs on a **Web Worker** (`simulation.worker.ts` + `runCareer.ts`), with a synchronous fallback for test/SSR.

### Game loop (Phases 4–6) — `src/screens/`
- **Home** — logo, difficulty pills (Easy/Normal/Hard), "Build Your Legend" CTA, disabled "Rewriting History" v2.0 teaser.
- **BuildPlayer** — Roll → Pick → Place loop on real data: 10 placements (9 categories + 1 franchise), 2 re-rolls, roster filter/search, difficulty-gated info visibility, auto-rolls unused buckets.
- **Preview** — hand-rolled SVG 8-axis radar (`components/RadarChart.tsx`), durability fuel bar, Built-With list, OVR readout, Simulate CTA.
- **Simulate** — worker-driven season-by-season playback with a live rings/Finals counter and skip-to-results.
- **Results** — screenshot-safe 9:16 legacy poster (record, tier, stat grid, totals) + collapsible season archive + Share / Play Again.

### Share / replay (Phase 6) — `src/share/`
- `encodeBuild` packs a full build (9 picks in canonical category order + franchise + difficulty + seed + dataVersion) into a **~160-char URL-safe code** (`/r?b=CODE`).
- Ratings are **re-derived from the live dataset** at decode time (not stored) → links stay compact and always match the shipped data.
- The `/r` route (`screens/Replay.tsx`) decodes, reconstructs the build, re-runs the engine, and lands the recipient on the **exact** Results poster. Verified deterministic across reloads.
- `dataVersion` mismatch is detected (`dataVersionMatches` flag) and still reconstructs while the drafted players exist; bails gracefully if any are gone.

---

## State & persistence
- `zustand` + `persist` (`12-0:build`). The build (assignments, franchise, seed, difficulty, roll progress) is persisted; the large **simulation result is intentionally not persisted** (re-derivable from the build via `partialize`).
- `loadBuild()` rehydrates a complete build from a share link in one shot.

## Test coverage
- `seededRng.test.ts` (7) — PRNG determinism & distribution.
- `career.test.ts` (14) — determinism, trace integrity, Monte Carlo difficulty bands (synthetic uniform builds).
- `_balanceProbe.test.ts` (3, skipped unless `BALANCE=1`) — real-pool + real-engine calibration: named builds, fixed OVR bands, play tiers.
- `shareLink.test.ts` (8) — encode/decode round-trip, canonical category order, malformed-code rejection, dataVersion mismatch, missing-player fallback.
- `teamColors.test.ts` (4), `PlayerSilhouette.test.tsx` (4).

## Known gaps / not yet built
- **Framer Motion transitions** and championship "gold-burst" moments (cosmetic).
- **Share-as-image** (canvas/OG) — `src/share/shareImage.ts` exists; verify full coverage.
- **Daily Challenge / leaderboard / Rewriting History** — explicitly v1.5+ ([roadmap.md](roadmap.md)).
- **Vercel git integration** — pushing to `main` does not auto-deploy; the connected Vercel
  account can't see the `hugol05/12-0` repo (`vercel git connect` fails). Deploy manually with
  `npx vercel deploy --prod`, or grant the Vercel GitHub App access to `hugol05/12-0`.

---

## Repro / commands
```
npm run dev         # Vite dev server
npm run typecheck   # tsc -b --noEmit
npm test            # vitest (40 tests, 3 skipped)
npm run build       # tsc -b + vite build → dist/ + PWA sw.js
npm run data        # rebuild public/data/* from cached raw sources
BALANCE=1 npx vitest run src/simulation/_balanceProbe.test.ts   # real-pool calibration
npx vercel deploy --prod   # manual production deploy (see Known gaps)
```
Local note: stale Vite servers from prior sessions can squat ports 5173–5175; the project's `.claude/launch.json` pins a fresh strict port.
