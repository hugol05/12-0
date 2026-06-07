# Data Strategy

> **Parent doc:** [Project Overview](README.md)
>
> **Related:** [Attributes & Rolls](attributes.md) for how ratings are used in gameplay, and [Simulation Engine](simulation-engine.md) for how ratings become careers.

---

## Principle: Zero Runtime API Calls

Everything is pre-built and ships with the app as static JSON. No backend, no external API calls at runtime.

This is not just a product preference. It is the safest architecture because several important data sources are fragile, incomplete, or unsuitable for direct browser use:

- NBA.com Stats is the primary source for official stats, but its FAQ says stats are for viewing on NBA.com/Stats and are not available for download as CSV for academic or personal use: <https://www.nba.com/stats/help/faq>
- `nba_api` is useful as a build-time client, but the package itself notes that NBA.com does not provide information about newly added, changed, or removed endpoints: <https://pypi.org/project/nba_api/>
- Some official NBA stat categories did not exist for earlier eras, so any all-era rating system needs explicit confidence flags and curated overrides rather than pretending every player has the same source coverage.

The React app should only read versioned generated files. Any network fetching, normalization, source reconciliation, manual review, validation, and Monte Carlo tuning happens before deploy.

---

## Acquisition Strategy (How We Get Comprehensive Rosters)

The game needs **82-0-style coverage**: every valid franchise+decade bucket should list 10+ real players, across all eras. That is thousands of player-seasons, so rosters and box stats come from **bulk datasets**, never hand-typed. Only the subjective parts (the 9 ratings) are formula-derived and curated.

### Source reality check (2026-06)

`stats.nba.com` (and therefore a live `nba_api`) is **IP-restricted to residential clients** — it returns nothing to datacenter/CI egress (verified: it returns `000` from the sandbox, while GitHub raw and the NBA headshot CDN respond `200`). So the build pipeline **cannot depend on a live `nba_api` fetch in CI or a sandbox.**

### Resolved sources (used by the pipeline)

To hit **82-0-style all-era coverage**, the owner accepted Basketball-Reference-derived bulk data for history (the only comprehensive pre-1996 source). Shipped stats are ingested from these GitHub-raw datasets, cached under `data-source/raw/`, and registered with attribution in `data-source/sources.json`:

| Dataset | License | Coverage | Provides |
|---------|---------|----------|----------|
| [`peasant98/TheNBACSV` → `nbaNew.csv`](https://github.com/peasant98/TheNBACSV) (Basketball-Reference–derived) | unlicensed source data; **owner-accepted** for a non-commercial fan game | **1950–2017**, 24.6k player-seasons, all historical team codes | per-season `Tm`, age, position, full box totals (PTS/TRB/AST/STL/BLK/TOV), advanced (PER, TS%, USG%, AST%, TRB%, STL%, BLK%, BPM, WS, VORP) |
| [`Brescou/NBA-dataset-stats-player-team`](https://github.com/Brescou/NBA-dataset-stats-player-team) | **MIT** | **1996–2023** | NBA `PLAYER_ID` (= headshot CDN id), `TEAM_ABBREVIATION`, traditional + advanced + defense + usage, regular season **and playoffs**; `player_index` adds real **height**, position, draft, from/to year |
| [FiveThirtyEight RAPTOR](https://github.com/fivethirtyeight/data/tree/master/nba-raptor) | **CC BY 4.0** | 1976–present | optional advanced signal (RAPTOR, WAR) for cross-checking modern ratings |

> **Provenance note:** Basketball-Reference data is ultimately Sportradar-licensed. This is accepted as low-risk for a free, non-commercial fan project. Attribution is surfaced in the in-app credits/about section. If the project ever commercialises, the historical source must be re-licensed or replaced.

### Headshots

Modern players (1996+) carry the real NBA `PLAYER_ID` from the Brescou set → `https://cdn.nba.com/headshots/nba/latest/1040x760/{id}.png` (reachable, `200`), marked `status: "verified"`. Pre-1996-only players that never appear in the modern index get `status: "fallback"` (local silhouette). URLs only — binaries are never redistributed.

### Optional local refresh: `nba_api`

`nba_api==1.11.4` (`requirements-dev.txt`) stays as an **optional** path for refreshing the latest seasons directly from NBA.com — it only runs on a residential IP (the owner's machine), never in CI. The shipped dataset never requires it.

### Division of labour

- **Factual (ingested):** name, position, height (real for modern, position-estimated + flagged for old eras), franchise/decade tags, PPG/RPG/APG/SPG/BPG, career totals, advanced metrics, headshot URL.
- **Subjective (formula + curated):** the 9 ratings (Shooting … Durability). Era-aware formulas turn real stats into a 0-99 first pass (percentile-normalised within the player's primary era so a 1960s player isn't punished for the absent 3PT/STL/BLK columns); **sourced** curated overrides in `data-source/curated/overrides.json` fix legends and pre-1973/pre-1980 gaps. Formulas scale; overrides target the ~100-150 players that matter most.

**Era caveats** (drive era-aware formulas): steals/blocks only from 1973-74; 3-pointers only from 1979-80; advanced stats only from 1996-97. Players before those cutoffs get era-relative formulas plus curated defense/clutch notes, flagged `confidence: "medium"`.

---

## Source Reality

These are source-backed facts that shape the pipeline.

| Fact | Source | Product impact |
|------|--------|----------------|
| NBA.com base stats go back to 1946-47, but advanced stats only go back to 1996-97. | NBA Stats FAQ: <https://www.nba.com/stats/help/faq> | Historical players cannot use the same advanced-stat formulas as modern players. |
| Some base stats were added later: rebounds in 1950-51, minutes in 1951-52, games started in 1970-71, steals/blocks/offensive rebounds/defensive rebounds in 1973-74, turnovers in 1977-78, and 3-pointers in 1979-80. | NBA Stats FAQ: <https://www.nba.com/stats/help/faq> | Early-era defense, rebounding detail, turnovers, and shooting range need era-aware formulas and lower confidence where data is missing. |
| NBA.com Stats says ABA stats are not included. | NBA Stats FAQ: <https://www.nba.com/stats/help/faq> | ABA seasons cannot silently count as NBA source data. They must be excluded for v1.0 or imported under an explicit `sourceLeague: "ABA"` flag later. |
| NBA.com has official player stats, all-time leaders, traditional stats, clutch, tracking, shooting, defensive dashboard, draft combine, and other stats pages. | NBA.com Stats navigation and player pages: <https://www.nba.com/stats/players>, <https://www.nba.com/stats/alltime> | NBA.com can support the official baseline, but not every table is available as a stable bulk export. |
| NBA.com player tracking uses Second Spectrum camera data and updates modern advanced stats after games. | NBA Stats FAQ: <https://www.nba.com/stats/help/faq> | Tracking-derived athletic/defensive inputs are modern-only and cannot be applied uniformly to older eras. |
| `nba_api` is active and exposes NBA.com career stats endpoints, including `PlayerCareerStats`, but it is a third-party client over undocumented NBA.com endpoints. | PyPI: <https://pypi.org/project/nba_api/> | Use `nba_api` in the offline build pipeline only. Pin the package version and cache raw responses. |
| The NBA introduced the 3-point shot in the 1979-80 season. | Jr. NBA: <https://jr.nba.com/3-point-shot/> | Pre-1980 shooting ratings cannot rely on 3PA/3P% and need era-adjusted scoring/efficiency formulas. |

---

## Confirmed Source Gaps

These are real source/data gaps, not open-ended worries. The build plan must document and handle each one.

| Gap | Why it is real | Required handling |
|-----|----------------|-------------------|
| No uniform all-era stat schema | NBA.com confirms key stats began in different seasons. | Every raw stat and computed rating gets `sourceCoverage` and `confidence`. Missing stat categories use era-aware fallbacks. |
| No official bulk CSV workflow from NBA.com Stats | NBA.com FAQ says stats are not available for download as CSV. | Fetch only in offline scripts, cache raw payloads, and respect source terms. The shipped app never scrapes or calls NBA.com. |
| `nba_api` endpoint fragility | `nba_api` says NBA.com endpoints can change without notice. | Pin `nba_api`, cache raw JSON, record fetch date/package version, and validate generated files in CI. |
| ABA data is outside NBA.com Stats coverage | NBA.com FAQ says ABA stats are not included. | v1.0 excludes ABA-only seasons. Later support must label ABA rows separately and avoid mixing records without disclosure. |
| Pre-1973 defense data is incomplete | Steals and blocks were not officially recorded until 1973-74. | Bill Russell, Wilt Chamberlain, Jerry West, and similar players need curated defense/clutch notes with lower source confidence. |
| Pre-1980 shooting range data is incomplete | The NBA introduced 3-pointers in 1979-80. | Shooting formulas before 1979-80 use scoring volume, efficiency, free throws, era-relative scoring rank, and curated range notes instead of 3P data. |
| Tracking and advanced sources do not cover all eras | NBA.com says advanced stats go back to 1996-97 and describes modern player tracking as camera-based data. | Athleticism, Basketball IQ, and modern defensive inputs need optional fields and curated historical alternatives. |
| Clutch is not objectively measurable from one stat | NBA.com has clutch pages, but historical clutch reputation spans playoffs, Finals context, game winners, and role. | Compute a baseline from playoff/Finals performance where available, then require curated `clutchEvidence` entries for overrides. |
| Real records change over time | Current active players can move all-time totals after every season. | Version `records.json`, store `lastVerified`, and refresh records as part of every data release. |

---

## Pipeline

```
source inventory
-> raw fetch/cache
-> normalization
-> formula ratings
-> curated overrides
-> validation
-> static app JSON
-> Monte Carlo tuning
-> release manifest
```

### 1. Source Inventory

Create a source manifest before fetching data. Each source entry records:

```json
{
  "id": "nba_stats_player_career",
  "label": "NBA.com Stats Player Career",
  "url": "https://www.nba.com/stats/players",
  "client": "nba_api",
  "clientVersion": "1.11.4",
  "fetchedAt": "2026-06-06",
  "licenseNote": "Build-time source only; no runtime calls."
}
```

### 2. Raw Fetch and Cache

All external data is fetched into raw snapshots and never edited by hand. If a fetch fails later because an endpoint changed, we can still rebuild from the last known snapshot.

Expected raw folders:

```
data-source/
├── sources.json
├── raw/
│   ├── nba_stats/
│   └── manual/
├── curated/
└── generated/
```

### 3. Normalization

Normalize raw source data into stable internal tables:

- `players.normalized.json`
- `playerSeasons.normalized.json`
- `playerPlayoffs.normalized.json`
- `playerTeams.normalized.json`
- `awards.normalized.json`
- `records.normalized.json`
- `measurements.normalized.json`

Every normalized row must include:

```json
{
  "sourceIds": ["nba_stats_player_career"],
  "sourceConfidence": "high",
  "sourceCoverage": "complete",
  "notes": []
}
```

### 4. Rating Generation

Generate a first-pass rating for all 9 categories using deterministic formulas. Ratings must be reproducible from normalized inputs and a versioned formula file.

Each metric is percentile-ranked **within the player's peak decade** (so a 1960s player isn't punished for absent 3PT/STL/BLK columns), then mapped to 0-99 via `rate(p) = clamp(round(38 + p·57), 25, 99)`. Curated overrides are layered last and may exceed that band for documented apex cases.

| Rating | Formula source (as implemented in `scripts/data/build.ts`) | Override allowed? | Confidence rule |
|--------|----------------|-------------------|-----------------|
| Shooting | **Shooting touch/efficiency, not scoring volume.** 1980+: `0.30·FT%-rank + 0.25·3P%-rank + 0.18·3PAr-rank + 0.17·eFG%-rank + 0.10·TS%-rank` (PPG demoted to **zero**). Pre-1980 (no 3PT columns): `0.45·FT%-rank + 0.35·TS%-rank + 0.20·PPG-rank`. FT% is the best cross-era touch proxy. | Yes | Lower (`medium`) before 1979-80 where range evidence is missing. |
| Height/Wingspan | Real listed height (inches) where known; else position-estimated. Map: `clamp(round((inches−72)/12·32 + 57), 25, 99)` → 6'0"≈57, 7'0"≈89. | Yes | High for real height; `low` when estimated (no measured wingspan). |
| Playmaking | `0.65·APG-rank + 0.35·AST%-rank` | Yes | Lower before turnover data starts in 1977-78. |
| Defense | 1974+: `0.7·(STL+BLK)-rank + 0.3·TRB%-rank`. Pre-1974: `0.55·TRB%-rank + neutral` (no steals/blocks). | Yes | Lower before steals/blocks start in 1973-74. |
| Rebounding | `0.6·RPG-rank + 0.4·TRB%-rank` | Yes | Lower before rebound data starts in 1950-51 and before split rebounds in 1973-74. |
| Athleticism | **Box stats are a weak proxy.** 1974+: `0.45·STL-rank + 0.35·ORB%-rank + 0.20·BLK-rank` (blocks demoted so plodding rim-protectors stop topping the scale). Pre-1974: `0.5·RPG + 0.5·PPG`. Famous reputations are finalised via curated overrides (boost flyers, de-rate plodders). | Required for many players | Must include evidence notes for ratings above 90. |
| Basketball IQ | `0.5·(AST/TOV)-rank + 0.3·TS%-rank + 0.2·FT%-rank` | Yes | Lower before advanced stats coverage. |
| Clutch | `0.5·PPG-rank + 0.3·TS%-rank + 0.2·USG%-rank` (baseline; curated `clutch` overrides for legends/extremes) | Required for extremes | Ratings below 65 or above 94 require evidence notes. |
| Durability | `35 + (0.6·min(seasons/18,1) + 0.4·min(avgG/75,1))·60` | Yes | High when games/seasons are complete. |

### 5. Curated Overrides

Curated overrides are allowed, but they must be auditable. No invisible hand-tuning.

```json
{
  "playerId": "78049",
  "playerName": "Bill Russell",
  "category": "defense",
  "computed": 91,
  "override": 99,
  "confidence": "medium",
  "reason": "Pre-1973 blocks/steals are missing; defensive reputation, awards, team results, and historical consensus support an elite rating.",
  "sources": [
    "https://www.nba.com/stats/help/faq"
  ],
  "reviewedBy": "data-curation",
  "reviewedAt": "2026-06-06"
}
```

Rules:

- Any override by more than 5 points requires a `reason`.
- Any rating above 95 requires at least one evidence note.
- Any historical player affected by missing stat categories gets `confidence: "medium"` unless independent source evidence is strong.
- Curated categories should be reviewed in batches by era and position to prevent favorite-player inflation.

### 6. Validation

The generated dataset must fail the build if any of these checks fail:

- Every player has all 9 ratings.
- Every rating is an integer from 0 to 99.
- Every player has at least one franchise/decade entry.
- Every franchise/decade roll bucket in the roll table has **at least 10 qualifying players**; combos below 10 are excluded from the roll table.
- No roll can produce an empty choice list after already-selected players are removed.
- Every player photo is either verified or assigned a local fallback.
- Every record has `holder`, `value`, `unit`, `source`, and `lastVerified`.
- Every generated JSON file passes schema validation.
- Every generated JSON file includes `dataVersion`.
- Every source-backed gap above has an explicit handling rule in generated metadata or curated notes.

### 7. Monte Carlo Tuning

Before release, run simulation batches against fixed build profiles:

| Build profile | Target 12-0 rate |
|---------------|------------------|
| Perfect, all major attributes 95+ | About 20% |
| Great, average 90+ | About 5-8% |
| Good, average 85+ | Below 1% |
| Typical strong run | Usually 4-10 championships, 1-3 Finals losses |

These tests do not prove the fantasy career is "true." They prove the game is balanced, reproducible, and aligned with the intended difficulty.

---

## Runtime Data Flow

The user should not notice any data work happening.

1. App boot loads a tiny manifest first: `dataVersion`, available modes, and file hashes.
2. The draft screen lazily loads `decades.json`, `players.roll-index.json`, and only the player details needed for visible choices.
3. The simulation runs in a Web Worker after the build is submitted.
4. The UI shows a polished simulation sequence while the worker computes the full career.
5. Results are returned as one immutable career object.
6. Share links store the build, data version, simulation seed, and difficulty mode.
7. Replays use the same data version and seed so the result is reproducible.

If the current app data no longer has the exact historical `dataVersion` from a share link, the app should still show the saved result payload and label it as an archived run rather than silently recomputing with new data.

---

## Objective Career Computation

"Objective" means the engine is deterministic, auditable, and consistent. It does not mean the simulated career is a factual prediction.

Required rules:

- The same build plus the same `dataVersion` plus the same seed always returns the same career.
- The simulation cannot read from `Math.random()` directly. It must use a seeded RNG passed through the simulation context.
- Rating formulas live in versioned code or generated metadata, not scattered UI logic.
- Curated overrides are visible in source files with reasons.
- Career outputs store enough intermediate values to explain results: age curve, season OVR, team rating, playoff odds, Finals odds, injury rolls, award triggers, and movement decisions.
- The result screen can simplify the story, but debug/dev mode must expose the calculation trace.

---

## Data Files

The pipeline emits app-facing JSON into `public/data/` so the React app can lazy-fetch it at runtime (Vite serves `public/` as-is, and the PWA service worker precaches it). JSON Schemas live under `data/schemas/` and are used only by the offline build/validation, never shipped.

```
public/data/
├── manifest.json              # dataVersion, generatedAt, file hashes, source summary
├── players.json               # player cards and multi-category ratings
├── players.roll-index.json    # small roll-time lookup by franchise/decade
├── franchises.json            # all 30 franchises with v1.0 base ratings
├── decades.json               # roll buckets and eligible player IDs
├── history.json               # real championship winners per season, v1.5
├── records.json               # all-time records and comparison thresholds
├── events.json                # rare career event templates and labels
└── nicknames.json             # generated nickname templates

data/schemas/                  # offline-only, not shipped
├── player.schema.json
├── franchise.schema.json
├── manifest.schema.json
├── record.schema.json
└── simulation-result.schema.json
```

### Franchise Base Ratings Methodology
`franchises.json` carries three curated trajectory inputs per team, all grounded in a real
**2025-26 snapshot** (`$franchiseModel.lastVerified: 2026-06-07`):

- **`baseRating2026`** (60–99) — derived from real win totals: `round(60 + (wins − 17) / 47 × 35)` (64 W ≈ 95, 53 W ≈ 87, 42 W ≈ 79, 17 W = 60). No longer eyeballed.
- **`marketTier`** (`large`/`mid`/`small`) — the owner's free-agent desirability tier.
- **`youthIndex`** (0–1) — roster-youth runway from mean age: `round2(clamp((28.7 − meanAge) / 5.3, 0, 1))`.

The engine seeds the league from `baseRating2026` and drifts each team along a market/youth
trajectory rather than a random walk — see [simulation-engine.md](simulation-engine.md)
§Franchise Strength & Trajectory for the model and example traces.

---

## Player Data Structure

```json
{
  "id": "201939",
  "name": "Stephen Curry",
  "position": "PG",
  "teams": [
    { "franchise": "GSW", "decades": ["2000s", "2010s", "2020s"] }
  ],
  "peakSeason": "2015-16",
  "stats": {
    "ppg": 30.1,
    "rpg": 5.1,
    "apg": 6.7,
    "spg": 2.1,
    "bpg": 0.2,
    "tsPct": 0.669
  },
  "ratings": {
    "shooting": 99,
    "height": 65,
    "playmaking": 88,
    "defense": 60,
    "rebounding": 55,
    "athleticism": 78,
    "basketballIq": 90,
    "clutch": 94,
    "durability": 85
  },
  "ratingMeta": {
    "shooting": { "confidence": "high", "sourceCoverage": "complete" },
    "clutch": { "confidence": "medium", "sourceCoverage": "partial" }
  },
  "height": "6-2",
  "photo": {
    "url": "https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png",
    "status": "verified",
    "fallback": "/assets/player-silhouette.webp"
  }
}
```

---

## Player Coverage & Roll Weights

- **Coverage goal:** every valid franchise+decade combo (one where the franchise actually existed and played that decade) lists **10+ real players**, across all eras — 82-0-style depth. This means thousands of player-seasons fetched programmatically, not a fixed small pool.
- **Decade boundary:** Decades equal NBA seasons starting in that decade. '1990s' = 1990-91 through 1999-00 seasons. A player is listed under a franchise/decade if they played **2+ seasons** for that franchise during that decade.
- **Bucket size:** Show all qualifying players for that franchise/decade combo. No pagination — the roster scrolls on mobile (82-0 shows 79 players for "LAL · 2010s"). The card supports filter pills (All / G / F / C), search, and sort (PPG/RPG/APG…) to keep long rosters usable.
- Players appear under every franchise/decade where they are eligible.
- The pool must include legends, stars, high-value specialists, and role players.
- **The single bucket rule:** a franchise/decade combo is included in the roll table **only if it has ≥10 qualifying players**. Combos below 10 (e.g. a franchise's first partial decade) are excluded from the roll table entirely. There is no separate 3/5/10 tiering — 10 is the one threshold used for inclusion, weighting, and validation.
- **Roll Weighting:** all included combos (≥10 players) are equally weighted in the RNG. This creates natural variance — sometimes you get the 1960s Celtics, sometimes the 2000s Bobcats.

Bucket quality beats raw player count: a dataset with validated 10+ buckets and sane ratings is better than a huge pool full of missing ratings and misleading choices.

---

## Records & Legacy Data

The results screen needs static comparison data so it can say exactly which records the created player broke.

```json
{
  "careerPointsRegularSeason": {
    "label": "Most Career Regular Season Points",
    "holder": "LeBron James",
    "value": 43440,
    "unit": "points",
    "source": "https://www.nba.com/stats/alltime-leaders?SeasonType=Regular+Season",
    "lastVerified": "2026-06-06"
  },
  "championships": {
    "label": "Most Championships",
    "holder": "Bill Russell",
    "value": 11,
    "unit": "rings",
    "source": "manual historical record",
    "lastVerified": "2026-06-06"
  }
}
```

Include records for:

- Career totals: points, rebounds, assists, steals, blocks, threes, games.
- Awards: MVPs, Finals MVPs, All-Star selections, All-NBA teams, DPOYs.
- Playoffs and Finals: points, wins, series records, perfect Finals marks.
- Single-game highs: points, rebounds, assists, steals, blocks.
- Season highs: PPG, triple-doubles, wins, playoff record.

Records can be manually maintained, but manual does not mean unsourced. Every record needs a source and verification date.

---

## Nickname Generation

Nicknames are generated dynamically using templates. The template is selected based on:
1. **Finals record tier**
2. **Dominant attribute category**
3. **Career length**

**Examples:**
- *The Machine* (99 Shooting + 12-0)
- *The Timeless One* (99 Durability + 18+ seasons)
- *The Prototype* (all attributes 90+)
- *The Wall* (99 Defense)

---

## Rare Event Templates

Rare events make the final career feel dynamic instead of purely numerical.

```json
{
  "hundredPointGame": {
    "label": "100-Point Club",
    "template": "{player} scored {points} against {opponent} in {season}.",
    "minPoints": 100
  }
}
```

Examples:

- 100+ point game.
- 20/20/20 game.
- 5x5 game.
- Game 7 buzzer-beater.
- 70-win season.
- 16-0 playoff run.
- Major injury comeback.
- Finals revenge series.

Rare events should be generated from simulation facts when possible. Narrative-only events must be flagged as flavor so the results screen does not imply a record was actually computed.
