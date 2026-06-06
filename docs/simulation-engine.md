# Career Simulation Engine

> **Parent doc:** [Project Overview](README.md)
>
> **Related:** [Attributes & Rolls](attributes.md) for OVR formula and category definitions

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

| Durability Rating | Career Length | Injury Risk/Season | Late-Career OVR Shape |
|-------------------|--------------|-------------------|-----------------------|
| 95-99 | 19-22 seasons | 4-6% | Prime lasts to 32; lose ~0-1 OVR/year through 36, then ~1 OVR/year through 41 |
| 90-94 | 17-20 seasons | 7-9% | Prime lasts to 31; lose ~1 OVR/year through 35, then ~1-2 OVR/year |
| 80-89 | 15-18 seasons | 10-14% | Standard star aging; lose ~1-2 OVR/year after 31 |
| 70-79 | 13-16 seasons | 15-20% | Decline starts around 29-30; lose ~2-3 OVR/year |
| Below 70 | 10-13 seasons | 22-30% | Decline starts around 27-28; volatile drop-offs and early retirement risk |

### Example Longevity Curves

For a player with a 99 peak OVR:

| Age | 99 Durability | 90 Durability | 80 Durability | 70 Durability |
|-----|---------------|---------------|---------------|---------------|
| 27 | 99 | 99 | 99 | 98 |
| 32 | 99 | 98 | 96 | 92 |
| 36 | 97-98 | 94-96 | 89-92 | 82-86 |
| 39 | 95-96 | 90-93 | 84-88 | Retired/bench |
| 41 | 94-95 | 87-90 | Retired/bench | Retired |

Retirement should consider age, OVR, injury history, and rings. A 40-year-old 94 OVR legend should not retire just because the age table says so.

---

## Season Simulation Pipeline (Per Year)

Each season runs through this pipeline:

1. **Calculate Player OVR** (age-adjusted, injury check)
2. **Calculate Team Strength** = Player OVR + franchise base rating
3. **Regular Season** = Win total based on team strength + random variance (±5-10 games)
4. **Playoff qualification** = Based on win total vs conference threshold
5. **Playoff rounds** = Series-by-series, each with upset probability
6. **Finals** = If reached, win/loss based on team strength + **Clutch bonus**
7. **Awards** = Calculated based on season performance
8. **Off-season** = Check for trade/FA/retirement

---

## Team Strength

### New Chapter Mode

- Each NBA franchise has a **base rating** (derived from 2026 rosters)
- Your player adds to the team's strength proportional to their OVR
- Team ratings fluctuate ±3-5 points per season (random rebuilds, drafts, etc.)
- A 95+ OVR player on a 75-rated team can make them contenders (~85 combined)
- A 95+ OVR player on an 85-rated team makes a dynasty (~92 combined)

### Rewriting History Mode (v1.5)

- Real team ratings per season from historical data
- Your player replaces the weakest starter, boosting team strength
- Real playoff brackets and opponents used as baseline

---

## Finals Probability & Clutch

The **Clutch** attribute is the key differentiator for 12-0 runs:

| Clutch Rating | Finals Win Probability Boost |
|---------------|------------------------------|
| 95-99 | +15% (Jordan mode) |
| 85-94 | +10% |
| 75-84 | +5% |
| 65-74 | +0% (baseline) |
| Below 65 | -5% (choke factor) |

A player with 99 Clutch on a heavily favored team might have 85% chance to win a Finals series. Same team with 65 Clutch might only have 65%.

**This makes Clutch the most impactful category for achieving 12-0** — you need to win EVERY Finals you reach.

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

**Target: 12-0 achievable ~1 in 5 games with near-perfect attributes.**

- With perfect rolls (every attribute 95+), 12-0 should happen ~20% of the time
- With great rolls (average 90+), 12-0 should happen ~5-8% of the time
- With good rolls (average 85+), 12-0 should be nearly impossible (<1%)
- Typical outcomes for great builds: 4-10 championships, 1-3 Finals losses
- **12 is the hard cap.** Max 12 championships. (Maybe 13 as ultra-rare easter egg)
- 12-0 requires: great attributes + good franchise + high Clutch + some luck

### Legacy Tiers

Even when the player misses 12-0, the game should produce a satisfying headline.

| Tier | Trigger |
|------|---------|
| **12-0 Immortal** | 12 championships, 0 Finals losses |
| **Russell Breaker** | 12+ championships |
| **Jordan Argument** | 7+ Finals wins with 0 Finals losses |
| **All-Time Inner Circle** | 6+ championships or 5+ MVPs |
| **Almost Mythic** | 10+ Finals wins but at least one Finals loss |
| **Cult Legend** | Broken major record without reaching 8 championships |
