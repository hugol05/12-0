# Career Simulation Engine

> **Parent doc:** [Project Overview](README.md)
>
> **Related:** [Attributes & Rolls](attributes.md) for OVR formula and category definitions

---

## Randomness & Seeding

All simulation randomness uses a seeded PRNG (e.g., mulberry32). The seed is derived from the player's attribute selections + franchise. This ensures:
1. The same build always produces the exact same career.
2. Share links can replay the career perfectly without storing history.
3. Daily Challenge gives everyone the exact same rolls.

---

## Overall Rating (OVR) Calculation

```
OVR = (Shooting × 0.20) + (Playmaking × 0.15) + (Defense × 0.15)
    + (Clutch × 0.15) + (Athleticism × 0.10) + (Rebounding × 0.10)
    + (Height × 0.08) + (Basketball IQ × 0.07)
```

**Durability is excluded from OVR** — it only determines career length and injury probability.

---

## Aging Curve

```
Age 19-22:  OVR at 82-92% of max (developing)
Age 23-26:  OVR at 92-98% of max (rising star)
Age 27-31:  OVR at 98-100% of max (prime)
Age 32-35:  OVR decline depends heavily on Durability
Age 36+:    OVR decline becomes legacy/longevity-driven, not a cliff
```

The game should be able to produce a LeBron-style longevity curve. A player who peaks at 99 OVR with elite Durability should still be around 97-98 at age 36 and around 94-95 at age 41. Lower Durability players can still fall off sharply, but elite longevity is part of the fantasy.

### Durability Modifiers

Career length (years in the league) is a **piecewise-linear function of the Durability rating**,
anchored to these owner-specified points (`DURABILITY_YEARS` in `career.ts`):

| Durability | 25 | 60 | 70 | 80 | 87 | 89 | 91 | 95 | 96 | 98 | 99 |
|------------|----|----|----|----|----|----|----|----|----|----|----|
| Years in league | 4 | 7 | 10 | 13 | 15 | 16 | 17 | 18 | 19 | 20 | 22 |

Values between anchors are linearly interpolated; values below 25 or above 99 clamp to the end
points. A career also gets a `±1` year roll for natural variance. `retirementAge = START_AGE
(19) + years − 1`, so e.g. durability 89 → 16 years → retires at 34 (±1).

| Durability Rating | Career Length (anchor) | Injury Risk/Season | Late-Career OVR Shape |
|-------------------|------------------------|-------------------|-----------------------|
| 99 | 22 (21+) seasons | 4-6% | Prime lasts to 32; lose ~0-1 OVR/year through 36, then ~1 OVR/year through 41 |
| 95-98 | 18-20 seasons | 4-6% | Prime lasts to 32; lose ~0-1 OVR/year through 36, then ~1 OVR/year through 41 |
| 90-94 | ~16-17 seasons | 7-9% | Prime lasts to 31; lose ~1 OVR/year through 35, then ~1-2 OVR/year |
| 80-89 | ~13-16 seasons | 10-14% | Standard star aging; lose ~1-2 OVR/year after 31 |
| 70-79 | ~10-13 seasons | 15-20% | Decline starts around 29-30; lose ~2-3 OVR/year |
| Below 70 | ~7-10 seasons | 22-30% | Decline starts around 27-28; volatile drop-offs and early retirement risk |

### Example Longevity Curves

For a player with a 99 peak OVR:

| Age | 99 Durability | 90 Durability | 80 Durability | 70 Durability |
|-----|---------------|---------------|---------------|---------------|
| 27 | 99 | 99 | 99 | 98 |
| 32 | 99 | 98 | 96 | 92 |
| 36 | 97-98 | 94-96 | 89-92 | 82-86 |
| 39 | 95-96 | retired | retired | retired |
| 41 | 94-95 | retired | retired | retired |

(90 durability now retires around age 35 (16-17 years), so the 39/41 columns for 90/80/70
durability are no longer reachable — only elite (95+) durability builds play into their 40s.)

### Retirement Trigger

Retirement is calculated after each season. A player retires if:
- `(age >= retirementAge)`, where `retirementAge` comes from the Durability → years-in-league
  table above (with its `±1` year roll)
- OR (season-ending injury within 2 years of `retirementAge`) with a 35% chance of retiring early

**Exception:** Never retire a player with exactly 11 championships — always give them one more shot
at 12-0. Reaching 12 championships always ends the career immediately (mission complete).

---

## Injury Mechanics

Injuries appear as visible narrative events and impact Games Played (GP).
- **Minor injury:** Miss 10-20 games.
- **Major injury:** Miss 30-60 games.
- **Season-ending:** Miss remaining season.

Injury severity is weighted by Durability. Major injuries can cause a temporary OVR penalty (-2 to -5) for the following season. Injuries are relatively rare and usually small, adding flavor without ruining too many seasons.

---

## Season Simulation Pipeline (Per Year)

Each season runs through this pipeline:

1. **Calculate Player OVR** (age-adjusted, injury check)
2. **Calculate Team Strength** = Player OVR + franchise base rating (heavily weighted towards player)
3. **Regular Season** = Win total on a smooth, saturating curve of team strength (no hard cap, and no
   floor of 70 for champions):
   `wins = 50 + 14·tanh((strength − 82)/14) + U(−7, 7)`, plus a "career year" bonus whose chance
   AND ceiling both ramp up with strength: `hotChance = clamp((strength − 86)/7, 0, 1)`,
   `hotCeiling = clamp((strength − 87)·1.2, 0, 12)`, bonus `= U(0, hotCeiling)` when triggered.
   Real-pool measurements: champion seasons average **~56-65 wins** (50s-low 60s, like real NBA
   title teams) regardless of build quality. A strong-but-not-elite build (94 OVR, ~93 strength)
   posts a **70-win season ~3% of the time** (about 1 in 3 careers of 20 seasons). A true god build
   (98 OVR/99 clutch, ~97 strength) posts 70+ win seasons **~15% of the time** (a few per career)
   and 74+ ("breaking the 73-9 record") **~4% of the time** (≈50% chance of doing it at least once
   across a career).
4. **Playoff qualification** = Based on win total vs conference threshold
5. **Playoff rounds** = Series-by-series, based on team strength differentials
6. **Finals** = If reached, win/loss based on team strength + **Clutch bonus**
7. **Awards** = Calculated based on season performance
8. **Off-season** = Check for trade/FA/retirement

### League & Conference Structure

The league consists of 30 teams divided into 2 conferences of 15.
- Other star players are abstracted as team ratings.
- League-average thresholds for scoring/assist/rebound titles are static constants (e.g., 28 PPG for scoring title) with small year-to-year variance (±1-2).
- Playoffs use a simplified 8-team bracket per conference. Seeding is based on win total within the conference.

### Playoff Round Probabilities (two-axis difficulty model)

The engine separates **how many rings** (driven by OVR) from **whether you go 12-0** (driven by
clutch). See `docs/BALANCE_2K.md` §6 for the full rationale + measured rates.

```javascript
seriesWinProb = clamp(0.5 + (ourStrength - oppStrength) * 0.045 + clutchBonus, 0.03, 0.99)
```

- **Round opponents** `ROUND_OPP = [82, 85, 88, 86]` (R1, R2, ConfFinals, Finals) are set high on
  purpose: **reaching** the Finals (3 wins vs strong fields) is the OVR-gated grind that limits how
  many rings a career can pile up. A ~92-OVR build reaches the Finals about half its prime years
  (~7 rings); a god build nearly every year.
- **Rubber-band (Finals only):** `ROUND_RUBBER_GAP = [∞, ∞, ∞, 3]` — the Finals opponent floats up to
  within 3 of the player's own strength, so the Finals is decided almost entirely by **clutch**, not a
  strength edge. This is robust to future rating inflation.
- **`clutchBonus`** applies in the Finals (and half in the Conference Finals) — see the table below.

---

## Team Strength

### New Chapter Mode

- Each NBA franchise has a **base rating** (`baseRating2026`, 60–99) plus two trajectory
  inputs — **`marketTier`** (`large`/`mid`/`small`) and **`youthIndex`** (0–1, higher = younger).
  All three are curated in `data-source/curated/franchises.json` and emitted to
  `public/data/franchises.json` by the pipeline.
- **Formula:** Our player is a heavy decider, like LeBron in the 2010s East.
  ```javascript
  teamStrength = (franchiseBase * 0.40) + (playerOVR * 0.60)
  ```
- **Example 1:** A 95 OVR player on an 80-rated team: `(80 * 0.4) + (95 * 0.6) = 32 + 57 = 89`.
- **Example 2:** A 99 OVR player on a 70-rated team: `(70 * 0.4) + (99 * 0.6) = 28 + 59.4 = 87.4`.
- This ensures an MVP-level player can single-handedly drag a mediocre franchise to the Finals.

#### Franchise Strength & Trajectory (WS7)

The franchise base ratings are **grounded in real 2025-26 results**, not eyeballed.
`baseRating2026 = round(60 + (wins − 17) / 47 × 35)` maps the owner's 2025-26 win
snapshot onto a 60–99 scale (64 W ≈ 95, 53 W ≈ 87, 42 W ≈ 79, 17 W = 60). `marketTier`
comes from the owner's desirability tier (Good→`large`, Mid→`mid`, Bad→`small`) and
`youthIndex = round2(clamp((28.7 − meanAge) / 5.3, 0, 1))` from each roster's mean age
(source snapshot `lastVerified: 2026-06-07`, recorded in `franchises.json` → `$franchiseModel`).

Instead of a pure random walk, each franchise's rating drifts every season along a
**biased trajectory** (deterministic — one seeded draw per team per season):

```
drift = noise(±3) + marketBias + youthBias(yearsElapsed)
  marketBias  = { large: +0.8, mid: 0, small: −0.6 }[marketTier]   // big markets reload via FA
  youthBias   = youthIndex × clamp(1 − yearsElapsed/8, 0, 1) × 1.6 // upside that decays as the window closes
rating        = clamp(rating + drift, 58, 95)
```

So **large markets trend steadily up** (reload through free agency regardless of age),
**small markets rise only while their young core's window is open** and then regress as it
closes, and **mid markets** ride a youth tailwind early that flattens out. Averaged traces
(400 seeds, 15 seasons) bear this out: BOS 89→94 (large, ceiling-bound up), LAC 79→90 (large,
old roster still reloads), OKC 95→87 (small + young: peaks, then the window closes), SAC
64→61 (small + old: regresses), ATL 82→88 (mid + young: rises then plateaus). The model lives
in `seasonDrift()` in `src/simulation/career.ts`; `projectLeagueTrajectory()` exposes the
per-franchise rating path for inspection (used by `career.test.ts`).

### Rewriting History Mode (v1.5)

- Real team ratings per season from historical data
- Your player replaces the weakest starter, boosting team strength
- Real playoff brackets and opponents used as baseline

---

## Finals Probability & Clutch

The **Clutch** attribute is the key differentiator for 12-0 runs. Because the Finals is rubber-banded
to a near-peer opponent, clutch is *the* thing that wins it — and the curve is steep at the top:

| Clutch | Finals win-prob bonus | Effect over a 12-ring career |
|--------|----:|------|
| 99 | +0.50 | near loss-free → ~90% 12-0 (god build) |
| 97 | +0.40 | rarely drops a Finals |
| 95 | +0.27 | drops ~1-2 Finals (12-0 ~1-in-7) |
| 93 | +0.20 | drops ~2 Finals |
| 90 | +0.15 | drops ~2-3 Finals |
| 87 | +0.08 | — |
| 83 | 0 | baseline |
| 78 / 72 / lower | −0.08 / −0.16 / −0.24 | choke factor |

**This makes Clutch the gate on 12-0** — a 90-95 clutch build can absolutely win 12 rings, but almost
always with 1-3 Finals losses along the way. Only **97+ clutch** (on a build elite enough to reach the
Finals a dozen times) goes truly perfect. You need to win EVERY Finals you reach.

---

## Player Movement (Simplified, Non-Deterministic)

1. **Initial contract:** Stay on starting franchise for **3-6 seasons** (randomized)
2. **Free agency trigger:** After initial contract, 60% chance of movement per off-season
3. **Destination selection:** Weighted by player status and team tier.

### Destination Selection

A superstar should usually act like a superstar. An MVP-level player should chase rings and almost always land on a top team, while lower-tier players can make more chaotic moves.

| Player Status | Top 5 Teams | Teams 6-10 | Up-and-Coming | Wildcard/Rebuild |
|---------------|-------------|------------|---------------|------------------|
| MVP / 96+ OVR | 90% | 7% | 2% | 1% |
| Superstar / 92-95 OVR | 80% | 12% | 6% | 2% |
| All-NBA / 88-91 OVR | 65% | 20% | 10% | 5% |
| Star / 84-87 OVR | 45% | 30% | 15% | 10% |

Inside the top-5 bucket, selection should still be random but weighted:

| Team Rank | Share of Top-5 Bucket |
|-----------|-----------------------|
| #1 | 30% |
| #2 | 25% |
| #3 | 20% |
| #4 | 15% |
| #5 | 10% |

This avoids the player always joining the #1 team, while still making top-3 to top-5 destinations feel normal. A rebuild destination for an MVP should be a rare story event, not a common outcome.

### Movement Narrative Examples
- *"After 5 seasons with the Warriors, [Player] signed with the Boston Celtics in free agency."*
- *"[Player] requested a trade from the Pacers and was dealt to the Miami Heat."*
- *"In a surprising move, [Player] joined the Sacramento Kings, betting on their young core."*
- *"[Player] shocked the league by taking less money to join the defending champions."*
- *"After a Finals loss, [Player] moved to the West's #2 seed to build a superteam."*

Total career team changes: **2-4 times** depending on career length.

---

## Stats Generation

Each season generates a plausible stat line:

| Stat | Primary Source | Secondary Source |
|------|---------------|-----------------|
| PPG | Shooting (60%) | Athleticism (25%) + Clutch (15%) |
| RPG | Rebounding (50%) | Height (35%) + Athleticism (15%) |
| APG | Playmaking (60%) | Basketball IQ (30%) + Shooting (10%) |
| SPG | Defense (50%) | Athleticism (30%) + Basketball IQ (20%) |
| BPG | Defense (40%) | Height (45%) + Athleticism (15%) |
| FG% | Shooting (50%) | Basketball IQ (30%) + Height (20%) |
| GP | Durability (90%) | Athleticism (10%) |

### Career Totals & Highs

The engine should track both season stats and full career totals, because the results screen needs to compare the created player against all-time history.

Track at minimum:

- Total points, rebounds, assists, steals, blocks, games, seasons, playoff games, Finals games
- Career highs for points, rebounds, assists, steals, blocks, threes, and minutes
- Playoff and Finals highs separately
- Rare stat events: 100+ points, 20/20/20, 5x5, 70-win season, 16-0 playoff run, Game 7 buzzer-beater
- Record flags for all-time ranks and records broken

---

## Awards Logic

| Award | Criteria |
|-------|----------|
| **MVP** | Top 1-2 OVR in the league that season + team wins > 50 |
| **Finals MVP** | Win championship + Clutch > 80 |
| **All-Star** | OVR > 83 |
| **All-NBA 1st Team** | OVR > 90 |
| **All-NBA** | OVR > 85 |
| **DPOY** | Defense rating > 93 |
| **Scoring Title** | PPG > league avg threshold that season |
| **Assist Leader** | APG > league avg threshold |
| **Rebound Leader** | RPG > league avg threshold |

---

## Difficulty Tuning

**Two-axis target (calibrated 2026-06-10 against the real pool — see `BALANCE_2K.md` §6):**

- **Rings ← OVR.** Optimal play (~92 OVR) averages **~7 rings** and reaches 12 about **20-24%** of the
  time. A realistic 94-OVR build averages **~9 rings**.
- **12-0 ← clutch.** A 94-OVR build with 95 clutch goes 12-0 only **~1-in-7** (it usually drops 1-2
  Finals). A **god build** — elite at everything *and* ~99 clutch — goes 12-0 **~90%** of the time.
- Average / poor play → **0-2 rings**; it stays a real failure floor.
- **12 is the hard cap.** Max 12 championships.
- 12-0 requires: elite attributes **and** 97+ Clutch **and** enough OVR to reach the Finals a dozen
  times — i.e. a genuine god build, not just a good one.

### Legacy Tiers

Even when the player misses 12-0, the game should produce a satisfying headline.

| Tier | Trigger |
|------|---------|
| **12-0 Immortal** | 12 championships, 0 Finals losses |
| **Russell Breaker** | 12+ championships |
| **Jordan Argument** | 7+ Finals wins with 0 Finals losses |
| **One-Team Myth** | 10+ championships with one franchise |
| **Mercenary King** | Championships with 3+ different franchises |
| **Iron Crown** | 20+ seasons with elite late-career OVR |
| **All-Time Inner Circle** | 6+ championships or 5+ MVPs |
| **Almost Mythic** | 10+ Finals wins but at least one Finals loss |
| **Cult Legend** | Broken major record without reaching 8 championships |
