# 12-0 — Build Status Report

> **Snapshot of what is implemented and verified**, as of 2026-06-07 on branch `feat/foundation`.
> Companion to [MASTER_PLAN.md](MASTER_PLAN.md) (the ordered task list). When a phase lands, update this report.

---

## At a glance

| Phase | Scope | Status |
|------|-------|--------|
| 1 | Project init & infrastructure | ✅ Done & committed (`78c01bb`) |
| 2 | Source-backed data pipeline | ✅ Done & committed (`f17bdc6`) |
| 3 | Deterministic simulation engine | ✅ Done & committed (`2131016`) |
| 4–6 | Game loop UI (build → preview → simulate → results) | ✅ Done & committed (`c0e692a`) |
| 6 | Share / replay links | ✅ Done & committed (`3820fb8`) |
| 6 | PWA install + offline | ✅ Configured (Workbox `sw.js`, runtime CacheFirst `/data/`) |
| 6 | Framer Motion polish | 🔜 Deferred (see [next-upgrades.md](next-upgrades.md)) |

**Verification (all green):** `npm run typecheck` · `npm test` (23 tests, 3 files) · `npm run build` (tsc -b + Vite + PWA `sw.js`). Full flow verified in-browser via the preview harness with zero console errors.

---

## What's built

### Data (Phase 2) — `public/data/`
- **2,365 players**, **174 franchise+decade buckets** spanning the **1950s–2020s**, all **30 franchises**, **96% headshots verified**.
- Reproducible pipeline (`npm run data` → `scripts/data/{util,build,validate}.ts`): fetch+cache raw CSVs → normalize → era-aware percentile ratings → curated overrides → emit `players.json`, `franchises.json`, `roll-index.json`, `manifest.json` → schema + invariant validation.
- Sources: `peasant98/TheNBACSV` (1950–2017, BR-derived, owner-accepted) + `Brescou/NBA-dataset-stats-player-team` (MIT, 2018–2023; real heights + NBA `PERSON_ID` for headshots). `nba_api` is an **optional local-only refresh** (stats.nba.com is IP-blocked in CI → returns `000`).
- Ratings use **only metrics common to both datasets** (box + rate stats), percentile-ranked **within each player's peak decade**, so historical and modern players share one scale. Era caveats flagged in `ratingMeta` (steals/blocks 1973-74+, 3PT 1979-80+, advanced 1996-97+).

### Engine (Phase 3) — `src/simulation/`
- `simulateCareer(ctx)` is **fully deterministic**: same build + `dataVersion` + `seed` ⇒ identical career. Seeded `mulberry32` RNG, never `Math.random()`.
- Aging curve (peak ~29), durability→retirement age, injury risk, 4-round playoffs with a Clutch-driven Finals bonus, `TITLE_CAP = 12` (retire on the 12th ring), awards, contender-weighted player movement, legacy tiers.
- Calibrated difficulty bands (Monte Carlo, in `career.test.ts`): **~22% 12-0 for all-95 builds, ~6.5% for all-90, ~0.3% for all-85** — monotonic and on-target.
- Runs on a **Web Worker** (`simulation.worker.ts` + `runCareer.ts`), with a synchronous fallback for test/SSR.

### Game loop (Phases 4–6) — `src/screens/`
- **Home** — logo, difficulty pills (Easy/Normal/Hard), "Build Your Legend" CTA, disabled "Rewriting History" v1.5 teaser.
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
- `career.test.ts` (8) — determinism, trace integrity, Monte Carlo difficulty bands.
- `shareLink.test.ts` (8) — encode/decode round-trip, canonical category order, malformed-code rejection, dataVersion mismatch, missing-player fallback.

## Known gaps / not yet built
- **Framer Motion transitions** and championship "gold-burst" moments (cosmetic).
- **Share-as-image** (canvas/OG) — links work; rendered preview cards do not yet exist.
- **Daily Challenge / leaderboard / Rewriting History** — explicitly v1.5+ ([roadmap.md](roadmap.md)).
- **2026 franchise base ratings** are derived, not hand-curated (open question #2 in MASTER_PLAN).

---

## Repro / commands
```
npm run dev         # Vite dev server
npm run typecheck   # tsc -b --noEmit
npm test            # vitest (23 tests)
npm run build       # tsc -b + vite build → dist/ + PWA sw.js
npm run data        # rebuild public/data/* from cached raw sources
```
Local note: stale Vite servers from prior sessions can squat ports 5173–5175; the project's `.claude/launch.json` pins a fresh strict port.
