# Data Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a source-backed, versioned, validated static data pipeline for 12-0 so the app can simulate objective, reproducible careers without runtime API calls.

**Architecture:** External basketball data is fetched only by offline scripts, cached as raw snapshots, normalized into stable internal tables, rated by deterministic formulas, reviewed through curated override files, validated, and emitted as compact static JSON. The browser loads generated JSON and runs seeded career simulations in a Web Worker.

**Tech Stack:** Python for fetch/normalize/generate scripts, JSON Schema for validation, Vitest or equivalent for simulation tests once the app exists, React/Vite static asset loading, Web Worker for runtime career computation.

---

### Task 1: Create the Data Workspace

**Files:**
- Create: `data-source/sources.json`
- Create: `data-source/raw/.gitkeep`
- Create: `data-source/curated/.gitkeep`
- Create: `data-source/generated/.gitkeep`
- Create: `data/schemas/.gitkeep`

**Step 1: Add source manifest skeleton**

Create `data-source/sources.json`:

```json
{
  "dataVersion": "2026.06.06-dev",
  "sources": [
    {
      "id": "nba_stats_faq",
      "label": "NBA.com Stats FAQ",
      "url": "https://www.nba.com/stats/help/faq",
      "usage": "Documents source coverage and missing historical stat categories."
    },
    {
      "id": "nba_stats_players",
      "label": "NBA.com Stats Players",
      "url": "https://www.nba.com/stats/players",
      "usage": "Official stat baseline for modern and historical NBA players."
    },
    {
      "id": "nba_stats_alltime",
      "label": "NBA.com Stats All-Time Leaders",
      "url": "https://www.nba.com/stats/alltime",
      "usage": "Record and leaderboard verification."
    },
    {
      "id": "nba_api",
      "label": "nba_api",
      "url": "https://pypi.org/project/nba_api/",
      "usage": "Build-time client for NBA.com data. Not used at runtime."
    }
  ]
}
```

**Step 2: Commit**

```bash
git add data-source data
git commit -m "chore: add data pipeline workspace"
```

---

### Task 2: Define Generated Data Schemas

**Files:**
- Create: `data/schemas/player.schema.json`
- Create: `data/schemas/manifest.schema.json`
- Create: `data/schemas/record.schema.json`
- Create: `data/schemas/simulation-result.schema.json`

**Step 1: Write player schema**

The player schema must require:

- `id`
- `name`
- `teams`
- all 9 ratings
- `ratingMeta`
- `photo.status`

Ratings must be integers from 0 to 99.

**Step 2: Write manifest schema**

The manifest schema must require:

- `dataVersion`
- `generatedAt`
- `sourceSummary`
- `files`

**Step 3: Run schema validation command**

Run the project validation command once it exists:

```bash
npm run validate:data
```

Expected before implementation: command may not exist. Add it when the app scaffold exists.

**Step 4: Commit**

```bash
git add data/schemas
git commit -m "chore: define generated data schemas"
```

---

### Task 3: Fetch and Cache Raw Data

**Files:**
- Create: `scripts/data/fetch_nba_stats.py`
- Create: `data-source/raw/nba_stats/.gitkeep`
- Modify: `requirements-dev.txt` or equivalent dependency file once Python tooling exists

**Step 1: Add pinned fetch dependency**

Pin `nba_api` to the current reviewed version:

```text
nba_api==1.11.4
```

**Step 2: Write raw fetch script**

The script should:

- read target player IDs from a curated seed list
- call `PlayerCareerStats` build-time only
- write raw JSON responses under `data-source/raw/nba_stats/`
- include `fetchedAt`, `sourceId`, and `nbaApiVersion` metadata
- skip re-fetching when a raw snapshot already exists unless `--refresh` is passed

**Step 3: Run fetch for a tiny smoke set**

```bash
python scripts/data/fetch_nba_stats.py --players 201939,2544,893
```

Expected: raw files for Stephen Curry, LeBron James, and Michael Jordan.

**Step 4: Commit**

```bash
git add scripts/data data-source/raw requirements-dev.txt
git commit -m "chore: cache raw NBA stats snapshots"
```

---

### Task 4: Normalize Source Data

**Files:**
- Create: `scripts/data/normalize_players.py`
- Create: `data-source/generated/players.normalized.json`
- Create: `data-source/generated/playerSeasons.normalized.json`
- Create: `data-source/generated/playerTeams.normalized.json`

**Step 1: Write normalization tests**

Create tests that verify:

- raw stat keys are converted to camelCase
- every row keeps `sourceIds`
- missing historical fields produce `sourceCoverage: "partial"` instead of fake zeroes

**Step 2: Implement normalizer**

Normalize raw snapshots into stable internal tables. Do not write app-facing files yet.

**Step 3: Run tests**

```bash
pytest tests/data/test_normalize_players.py -v
```

Expected: all normalization tests pass.

**Step 4: Commit**

```bash
git add scripts/data tests/data data-source/generated
git commit -m "feat: normalize player source data"
```

---

### Task 5: Add Rating Formulas and Metadata

**Files:**
- Create: `scripts/data/rating_formulas.py`
- Create: `data-source/generated/playerRatings.computed.json`
- Create: `tests/data/test_rating_formulas.py`

**Step 1: Write rating tests**

Test that:

- every formula returns an integer from 0 to 99
- pre-1973 defense ratings get lower confidence when blocks/steals are unavailable
- pre-1980 shooting ratings do not require 3P data
- durability is computed but excluded from OVR

**Step 2: Implement formulas**

Implement first-pass deterministic formulas for all 9 categories. Include confidence and coverage metadata for every category.

**Step 3: Run tests**

```bash
pytest tests/data/test_rating_formulas.py -v
```

Expected: all formula tests pass.

**Step 4: Commit**

```bash
git add scripts/data tests/data data-source/generated
git commit -m "feat: compute player ratings with metadata"
```

---

### Task 6: Add Curated Overrides

**Files:**
- Create: `data-source/curated/player-rating-overrides.json`
- Create: `scripts/data/apply_overrides.py`
- Create: `tests/data/test_rating_overrides.py`

**Step 1: Write override schema tests**

Test that:

- overrides above 5 points require `reason`
- ratings above 95 require evidence notes
- overrides include source URLs when they rely on source gaps

**Step 2: Implement override application**

Merge computed ratings and overrides into final player ratings while preserving both `computed` and `override` values in metadata.

**Step 3: Run tests**

```bash
pytest tests/data/test_rating_overrides.py -v
```

Expected: invalid overrides fail, valid overrides pass.

**Step 4: Commit**

```bash
git add data-source/curated scripts/data tests/data
git commit -m "feat: add auditable rating overrides"
```

---

### Task 7: Generate App JSON

**Files:**
- Create: `scripts/data/generate_app_data.py`
- Create: `data/manifest.json`
- Create: `data/players.json`
- Create: `data/players.roll-index.json`
- Create: `data/franchises.json`
- Create: `data/decades.json`
- Create: `data/records.json`
- Create: `data/events.json`
- Create: `data/nicknames.json`

**Step 1: Write generation tests**

Test that:

- every generated file has `dataVersion`
- every franchise/decade bucket has at least 5 playable players or is excluded
- player photos are verified or assigned fallback
- records include source and `lastVerified`

**Step 2: Implement generator**

Emit compact app-facing JSON from normalized and curated data.

**Step 3: Run tests**

```bash
pytest tests/data/test_generate_app_data.py -v
```

Expected: generated app JSON passes all checks.

**Step 4: Commit**

```bash
git add scripts/data tests/data data
git commit -m "feat: generate static app data"
```

---

### Task 8: Add Runtime Simulation Contract

**Files:**
- Create after app scaffold: `src/simulation/seededRng.ts`
- Create after app scaffold: `src/simulation/simulateCareer.ts`
- Create after app scaffold: `src/simulation/simulation.worker.ts`
- Create after app scaffold: `src/simulation/simulateCareer.test.ts`

**Step 1: Write determinism test**

Test that the same build, seed, and data version produce the exact same career object.

**Step 2: Write trace test**

Test that a career result includes enough trace data to explain season OVR, team strength, playoff odds, Finals odds, injuries, awards, and movement decisions.

**Step 3: Implement seeded simulation shell**

Use a seeded RNG context. Never call `Math.random()` directly from simulation code.

**Step 4: Run tests**

```bash
npm test -- simulateCareer
```

Expected: deterministic and trace tests pass.

**Step 5: Commit**

```bash
git add src/simulation
git commit -m "feat: add deterministic career simulation contract"
```

---

### Task 9: Add Monte Carlo Balance Tests

**Files:**
- Create after app scaffold: `src/simulation/monteCarloBalance.test.ts`

**Step 1: Write balance tests**

Run enough seeded simulations to check target ranges:

- perfect builds: about 20% 12-0
- great builds: about 5-8% 12-0
- good builds: below 1% 12-0

**Step 2: Mark as slow test**

Make this a non-watch, pre-release, or CI-nightly test if runtime is too long.

**Step 3: Run balance test**

```bash
npm test -- monteCarloBalance
```

Expected: results fit target bands or produce a clear tuning failure.

**Step 4: Commit**

```bash
git add src/simulation
git commit -m "test: add simulation balance targets"
```

---

### Task 10: Wire App Loading Without User-Visible Work

**Files:**
- Modify after app scaffold: `src/data/loadGameData.ts`
- Modify after app scaffold: `src/game/build-flow/*`
- Modify after app scaffold: `src/game/results/*`

**Step 1: Load manifest first**

The app should load `data/manifest.json` before large player data.

**Step 2: Lazy-load roll data**

Load only roll indexes during drafting. Fetch full player records only for visible choices and final results.

**Step 3: Run career simulation in worker**

Submit build, seed, data version, and difficulty to the worker. Show animated simulation progress while the worker computes.

**Step 4: Preserve share replay**

Share links must include build selections, seed, difficulty, and data version. If data version no longer matches, show archived result payload rather than silently recomputing.

**Step 5: Commit**

```bash
git add src/data src/game
git commit -m "feat: load data and simulate careers invisibly"
```
