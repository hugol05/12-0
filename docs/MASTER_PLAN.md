# 12-0 — Master Build Plan

> **Single source of truth for *how* we build 12-0.** Read this after the [skills], the root [README](../README.md), and [docs/README.md](README.md). The topic docs in `docs/` are living specs (what the game is); this plan is the ordered, phased task list (how to build it). Keep both in sync — if a build decision changes, update the relevant spec **and** this plan.

---

## Locked Decisions & Conventions

These are settled. Do not relitigate them mid-build; if one must change, update this section first.

| Area | Decision |
|------|----------|
| **Language** | TypeScript everywhere (app + engine). `.tsx`/`.ts`, never `.jsx`/`.js` for source. |
| **Framework** | React 19 + Vite. zustand for state. React Router. Framer Motion. Lucide React. Vanilla CSS with custom properties. |
| **Engine location** | `src/simulation/` (NOT `src/engine/`). Pure TS, no DOM/React imports, so it runs identically in the Web Worker and in Vitest. |
| **Data output path** | Pipeline emits app JSON to `public/data/`. The app lazy-fetches it. JSON Schemas live in `data/schemas/` (offline-only, not shipped). Pipeline workspace is `data-source/`. |
| **Build order** | **Data-pipeline-first.** Real dataset → engine → UI. No hardcoded mock data; the UI is built against production-shaped data. |
| **Data acquisition** | `stats.nba.com`/`nba_api` is IP-blocked in CI/sandbox, so shipped stats are ingested from **openly-licensed bulk datasets** (FiveThirtyEight CC BY 4.0 + a 1950→present per-game set), cached + attributed. `nba_api` is an optional local-only refresh. The 9 ratings are formula-derived + sourced curated overrides. See [Data Strategy → Acquisition Strategy](data-strategy.md#acquisition-strategy-how-we-get-comprehensive-rosters). |
| **Bucket rule** | A franchise/decade combo is in the roll table only if it has **≥10 qualifying players** (2+ seasons for that franchise in that decade). One threshold — 10 — for inclusion, weighting, and validation. |
| **v1.0 scope** | New Chapter mode only. Rewriting History is a disabled "Coming Soon" teaser, enabled in v2.0. See [Roadmap](roadmap.md). |
| **Determinism** | Same build + `dataVersion` + `seed` ⇒ identical career. Simulation never calls `Math.random()` directly; it uses a seeded RNG passed through context. |
| **Difficulty** | Easy / Normal / Hard control *information visible during the roll phase only* — never the simulation. Stored in share links. |
| **Repo / deploy** | GitHub `hugol05/12-0`, auto-deploy to Vercel. |

**Spec map** (read the relevant spec before building each phase):
[Concept](concept.md) · [Attributes & Rolls](attributes.md) · [Simulation Engine](simulation-engine.md) · [Results Screen](results-screen.md) · [Visual Design](visual-design.md) · [Data Strategy](data-strategy.md) · [Tech Stack](tech-stack.md) · [Roadmap](roadmap.md) · [Pre-Mortem](pre-mortem.md).

---

## Open Questions (resolve before or during Phase 1)

1. **Curated seed scope** — The bulk roster is fetched programmatically, but the ~100-150 legends needing curated rating overrides (pre-1973 defense, pre-1980 shooting, clutch extremes) should be listed explicitly. Build this override list as data lands, batched by era + position.
2. **2026 franchise base ratings** — `franchises.json` needs hand-curated 65-90 base ratings for all 30 teams. Approximate from current standings/projections unless the owner supplies them.

---

## Phase 1 — Project Initialization & Infrastructure

Goal: one repo where TS app code and Python data scripts coexist; skeleton deploys to Vercel.

- **Vite + React 19 + TypeScript scaffold** — `package.json`, `tsconfig.json`, `vite.config.ts`, directory structure (`src/`, `src/simulation/`, `src/components/`, `src/screens/`, `src/store/`, `src/types/`, `src/data/`). Set up Vitest.
- **Python env** — `requirements-dev.txt` pinning `nba_api==1.11.4` and `pytest`.
- **Source manifest** — `data-source/sources.json` (NBA.com FAQ, players, all-time, `nba_api`). Workspace folders `data-source/{raw,curated,generated}/`.
- **JSON Schemas** — `data/schemas/{player,manifest,record,simulation-result}.schema.json`. Ratings are integers 0-99; player requires id/name/teams/9 ratings/ratingMeta/photo.status; manifest requires dataVersion/generatedAt/sourceSummary/files.
- **Vercel + PWA skeleton** — deploy an empty-but-live app; wire `vite-plugin-pwa`.

**Verify:** `npm run dev` boots; `npm run build` passes; skeleton deploys to Vercel.

---

## Phase 2 — The Source-Backed Data Pipeline

Goal: real, validated `public/data/*.json`. External data fetched only by offline scripts, cached as raw snapshots, normalized, rated, curated, validated, emitted. See [Data Strategy](data-strategy.md) for the full contract.

1. **Fetch & cache** (`scripts/data/fetch_nba_stats.py`) — Iterate seasons via `LeagueDashPlayerStats` to build franchise/decade buckets; `PlayerCareerStats`/`PlayerProfileV2` for per-team career stats; `CommonTeamRoster` for bio/position/height. Write raw JSON to `data-source/raw/nba_stats/` with `fetchedAt`, `sourceId`, `nbaApiVersion`. Skip existing snapshots unless `--refresh`.
2. **Normalize** (`scripts/data/normalize_players.py`) — Raw → stable internal tables (`players`, `playerSeasons`, `playerTeams`, `awards`, `records`, `measurements`). camelCase keys; every row keeps `sourceIds`; missing historical fields → `sourceCoverage: "partial"`, never fake zeroes. Tests in `tests/data/`.
3. **Rating formulas** (`scripts/data/rating_formulas.py`) — Deterministic era-aware first pass for all 9 categories from normalized stats. Integers 0-99. Lower confidence pre-1973 (defense), pre-1980 (shooting range), pre-1996 (advanced). Durability computed but excluded from OVR.
4. **Curated overrides** (`data-source/curated/player-rating-overrides.json` + `apply_overrides.py`) — Auditable: overrides >5 pts need a `reason`; ratings >95 need an evidence note; gap-driven overrides cite a source URL. Merge keeps both `computed` and `override`.
5. **Generate app JSON** (`scripts/data/generate_app_data.py`) — Emit compact `public/data/{manifest,players,players.roll-index,franchises,decades,records,events,nicknames}.json`. Hand-author `franchises.json` 2026 base ratings (65-90).
6. **Validate** — Build fails if: any player lacks all 9 ratings; any rating outside 0-99; any roll-table bucket has <10 players; any roll can empty out after removals; any photo lacks verified/fallback; any record lacks holder/value/unit/source/lastVerified; any file lacks `dataVersion`; any schema fails.
7. **Monte Carlo tuning checkpoint** (after Phase 3 engine exists) — Run batches against fixed build profiles to confirm difficulty bands (perfect ~20%, great ~5-8%, good <1%). This is a **tuning checkpoint**, not a hard CI gate; record results and tune formulas/franchise ratings.

**Verify:** `pytest tests/data/ -v` green; `npm run validate:data` passes; spot-check that marquee franchise/decade buckets (e.g. LAL 2010s, CHI 1990s, BOS 1960s) have 10+ sane players.

---

## Phase 3 — The Simulation Engine (TypeScript)

Goal: deterministic, traceable career simulator that consumes Phase 2 JSON. See [Simulation Engine](simulation-engine.md).

- **`src/simulation/seededRng.ts`** — mulberry32-style seeded PRNG, passed through a simulation context. No direct `Math.random()`.
- **`src/simulation/simulateCareer.ts`** — Season pipeline: age-adjusted OVR → team strength (`franchiseBase*0.4 + playerOVR*0.6`) → regular season → playoffs → Finals (Clutch bonus) → awards → off-season movement. Durability-gated aging (elite longevity to age 41), retirement rules, injuries.
- **`src/simulation/{aging,stats,awards,movement}.ts`** — Aging curves, stat-line generation, awards logic, contender-weighted free agency.
- **Trace output** — Career object stores intermediate values (season OVR, team rating, playoff/Finals odds, injury rolls, award triggers, movement) for a dev/debug trace.
- **`src/simulation/simulation.worker.ts`** — Web Worker wrapper; takes build + seed + dataVersion + difficulty, returns one immutable career.
- **Tests** — `simulateCareer.test.ts` (determinism + trace) and a Monte Carlo balance test (slow/CI-nightly) for the difficulty bands.

**Verify:** `npm test -- simulateCareer` green (determinism + trace); Monte Carlo bands within target.

---

## Phase 4 — Design System & Data Loading

Goal: the OLED Luxury × NBA Broadcast look in code, plus invisible data loading. See [Visual Design](visual-design.md).

- **CSS tokens** — true-black/gold palette, Clash Display / Satoshi / JetBrains Mono, iOS safe-area handling.
- **Base components** — buttons, modal/sheet frames, typography, stat rows.
- **`src/data/loadGameData.ts`** — load `manifest.json` first, then lazy-load `decades.json` + `players.roll-index.json`; fetch full player records only for visible choices and final results.

**Verify:** tokens render; a smoke screen lazy-loads manifest then roll index without blocking.

---

## Phase 5 — The Game Loop (UI)

Goal: the Roll → Pick → Place build flow against real data. See [Concept](concept.md), [Attributes](attributes.md), [Visual Design](visual-design.md).

- **Landing** (`screens/Home.tsx`) — logo, how-to-play, difficulty pills, New Chapter only (Rewriting History disabled teaser).
- **Roll mechanic** (`components/Roll/`) — dual slot-machine franchise + decade; 2 re-rolls; roll uniqueness.
- **Player list** (`components/PlayerCard/`) — full roster with filter pills (All/G/F/C), search, sort; Easy/Normal/Hard visibility.
- **Category assignment** (`components/AttributeSlot/`) — assign picked player to one of 9 categories or use the roll for franchise; fit labels per difficulty.
- **Player preview** (`screens/Preview.tsx`) — assembled silhouette, radar chart of 8 OVR attributes, Durability fuel bar, Built-With list, Simulate CTA.

**Verify:** complete a full build in-browser against real data; resume-from-localStorage works.

---

## Phase 6 — Results, Polish & PWA

Goal: the shareable payoff and ship-readiness. See [Results Screen](results-screen.md).

- **Simulation screen** (`screens/Simulate.tsx`) — animated season-by-season reveal driven by the worker; running Finals counter; auto-play + skip-to-results.
- **Results screen** (`components/Summary/`) — screenshot-safe Legacy Poster (390×844, `aspect-ratio: 9/16`) + expandable career archive; legacy tiers, records broken, Built-With; Share / Link / Play Again.
- **Share link** — encode build + franchise + difficulty + seed + dataVersion under ~200 chars; archived-result fallback on dataVersion mismatch.
- **PWA** — offline support, install prompt, icons; iOS Safari layout (`viewport-fit=cover`, safe-area insets, black-translucent status bar).
- **Polish** — Framer Motion transitions, gold-burst championship moments, edge cases.

**Verify:** poster screenshots cleanly on mobile; share link reconstructs the exact career; offline works via DevTools; final Vercel deploy.

---

## Verification Summary

| Layer | Command / Check |
|-------|-----------------|
| Data pipeline | `pytest tests/data/ -v`, `npm run validate:data` |
| Engine | `npm test -- simulateCareer`, Monte Carlo bands |
| Build flow | Manual: full Roll→Pick→Place against real data |
| Share replay | Manual: link reconstructs identical career via seed + dataVersion |
| Offline | Manual: Chrome DevTools offline mode |
