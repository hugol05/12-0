> **📂 This document has been split into structured docs.**
> See [`docs/README.md`](docs/README.md) for the overview and links to each detailed section.
> This file is preserved as the original monolithic reference.

# 12-0 — Build the Perfect Player. Break the Record.

> A viral web game where you craft a Frankenstein NBA superstar from real player attributes, then simulate their entire career to see if they can go **12-0 in the Finals** and break Bill Russell's legendary record of 11 rings.

---

## 1. The Concept

### What Is 12-0?
You **build** a custom NBA player by rolling for randomized **franchise + decade** combos — like "1990s Bulls" — then picking a real player from that roster and **assigning them to whichever attribute category you want**. Rodman to Rebounding? Or Rodman to Defense? Your call. Once your player is assembled, you **simulate** their entire career and watch whether your creation can dominate the league and go 12-0 in the Finals.

### Why "12-0"?
Bill Russell won **11 NBA championships** with the Boston Celtics (1957–1969) — the most by any player in history. Your goal is to go **12-0 in Finals appearances**: win every Finals you reach, and reach 12 of them. The "0" means zero Finals losses. If you make the playoffs but lose before the Finals, it doesn't count for or against your record — it just means a wasted year. This mirrors the real debate: is Jordan's 6-0 in Finals better than LeBron's 4-6?

### Inspiration
| Game | Sport | Mechanic | Goal |
|------|-------|----------|------|
| [7-0](https://7a0.com.br/en) | Football | Roll country + edition → pick player → fill lineup position → simulate World Cup | Win all 7 matches |
| [82-0](https://www.82-0.com) | Basketball | Roll franchise + decade → pick player → fill starting 5 position → simulate season | Go 82-0 |
| **12-0** (ours) | Basketball | Roll franchise + decade → pick player → assign to attribute category → simulate career | Go 12-0 in Finals |

### What Makes 12-0 Different
- You're not building a **team** — you're building a single **player**
- You **choose where to place** each player (strategy layer 82-0 doesn't have)
- It's not one season — it's an entire **career** (15-20 seasons)
- Two modes: rewrite real NBA history or start fresh in 2026
- The results screen is a full **career retrospective**

---

## 2. Core Mechanic: The Roll → Pick → Place Loop

This is the heart of the game and what differentiates it from 82-0.

### How Each Roll Works

```
┌──────────────────────────────────────────────────────────┐
│  ROLL 🎲                                                 │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐                        │
│  │    CHI       │  │   1990s     │                        │
│  │   BULLS      │  │             │                        │
│  └─────────────┘  └─────────────┘                        │
│                                                          │
│  You rolled: Chicago Bulls · 1990s                       │
│  NOT FEELING IT? RE-ROLL · 2 LEFT                        │
│  [↻ Another Team]  [↻ Another Era]                       │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PICK A PLAYER — then assign to a category               │
│                                                          │
│  Michael Jordan    SG    30.1 PPG  6.2 RPG  5.3 APG  98 │
│  Scottie Pippen    SF    21.0 PPG  7.7 RPG  6.2 APG  93 │
│  Dennis Rodman     PF     5.8 PPG 15.3 RPG  2.5 APG  89 │
│  Horace Grant      PF    13.4 PPG  9.7 RPG  2.6 APG  82 │
│  B.J. Armstrong    PG    14.8 PPG  2.7 RPG  4.3 APG  78 │
│  Toni Kukoč        SF    14.1 PPG  4.8 RPG  4.0 APG  80 │
│  ...                                                     │
│                                                          │
│  — OR —                                                  │
│                                                          │
│  [🏠 Place your player on this franchise instead]        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Step-by-step:
1. Press **ROLL 🎲**
2. Slot-machine reveals a **franchise + decade** (e.g., "1990s Bulls")
3. You see the **full roster** of notable players from that team in that decade, with their best season stats
4. You have two choices:
   - **Pick a player** → then choose which attribute category to assign them to
   - **Use this roll for franchise** → your created player will start their career on this team (in this decade for "Rewriting History" mode, or in 2026 for "New Chapter" mode)
5. Repeat until all 9 attribute categories are filled AND a franchise is selected

### Assigning a Player to a Category

After picking a player, you see the unfilled categories and choose where to place them:

```
┌──────────────────────────────────────────────────────────┐
│  You selected: Michael Jordan · CHI 1990s                │
│                                                          │
│  ASSIGN TO CATEGORY:                                     │
│                                                          │
│  [🎯 Shooting      ]  ← Great fit (rating: 97)          │
│  [⚡ Athleticism    ]  ← Great fit (rating: 96)          │
│  [🛡️ Defense       ]  ← Good fit (rating: 90)           │
│  [🔥 Clutch        ]  ← Great fit (rating: 99)          │
│  [🧠 Basketball IQ ]  ← Good fit (rating: 93)           │
│  [📏 Height        ]  ← filled ✓                        │
│  [🏀 Playmaking    ]  ← filled ✓                        │
│  [💪 Rebounding    ]  ← filled ✓                        │
│  [🏋️ Durability    ]  ← filled ✓                        │
│                                                          │
│  Each player has different ratings per category.         │
│  Jordan: Shooting 97 | Athleticism 96 | Clutch 99       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Key insight:** The same player has **different ratings for different categories**. Jordan is a 97 in Shooting but maybe an 85 in Playmaking. This creates meaningful choices — do you "waste" Jordan on Defense where he's a 90, or save that slot for a specialist?

### The Franchise Slot

One of your 10 rolls MUST be used for franchise selection. You can use it on any roll — early (to lock in your team) or late (to see what's left). When you choose franchise:
- In **"Rewriting History"** mode: Your player joins that team in that decade
- In **"New Chapter"** mode: Your player joins that team in 2026 (decade is ignored for placement)

---

## 3. Two Game Modes

### Mode 1: 🕰️ Rewriting History
*"What if the greatest player ever was drafted by the 1980s Lakers?"*

- You roll franchise + decade for all rolls
- When you use a roll for franchise, your career starts on **that team, in that decade**
- **Real NBA history plays out around you.** If you join the 1990s Bulls, Jordan, Pippen, and Rodman are your teammates. The Jazz, Rockets, and Blazers are your rivals. The real championship outcomes are the baseline.
- Your player's presence **alters history** — a mediocre team might become a contender because of you
- When your player changes teams (via free agency/trade), the rest of the league continues following real history
- After 2025, future seasons are simulated

**Data requirement:** We need historical team strengths / championship winners per season to anchor the simulation.

### Mode 2: 📖 New Chapter
*"Start fresh. Write your own legacy."*

- Attribute rolls still use franchise + decade (to determine which players you can pick from)
- But your career **always starts in 2026-27** regardless of which decade you rolled
- Franchise selection roll determines which 2026 team you join (decade is irrelevant)
- All future seasons are simulated from current 2026 rosters
- Team ratings evolve with randomness year over year
- No real history to track — fully generated future

### Why Two Modes?
- **Rewriting History** is the nostalgia play — fans love "what if" scenarios. It's more shareable: *"I went 12-0 starting on the 2003 Cavs with LeBron as my teammate"*
- **New Chapter** is simpler to implement and more forward-looking
- **Ship "New Chapter" first** (v1), add "Rewriting History" (v1.5)

---

## 4. The 9 Attribute Categories

### 8 Categories That Affect Overall Rating (OVR)

| # | Category | Icon | What It Represents | Key Stats | Example Top Players |
|---|----------|------|--------------------|-----------|---------------------|
| 1 | **Shooting** | 🎯 | Scoring ability & efficiency | PPG + TS% | Curry, Jordan, Durant, Harden |
| 2 | **Height & Wingspan** | 📏 | Physical frame & reach | Height + wingspan data | Yao Ming, Wembanyama, Giannis, Bol Bol |
| 3 | **Playmaking** | 🏀 | Court vision & passing | APG + AST% | Magic, Stockton, CP3, Nash |
| 4 | **Defense** | 🛡️ | Rim protection & perimeter D | BPG + SPG + DBPM | Russell, Hakeem, Kawhi, Pippen |
| 5 | **Rebounding** | 💪 | Board control & positioning | RPG + TRB% | Rodman, Wilt, Moses Malone, Barkley |
| 6 | **Athleticism** | ⚡ | Speed, vertical, explosiveness | Curated / combine data | Westbrook, LeBron, Vince Carter, D-Rose |
| 7 | **Basketball IQ** | 🧠 | Decision-making & BBIQ | Win Shares + BPM + VORP | LeBron, Bird, Duncan, Jokić |
| 8 | **Clutch** | 🔥 | Finals performance under pressure | Playoff PPG boost + Finals record + game-winners | Jordan, Kobe, Hakeem, Dirk, Duncan |

### 1 Category That Affects Career Length Only

| # | Category | Icon | What It Represents | Key Stats | Example Top Players |
|---|----------|------|--------------------|-----------|---------------------|
| 9 | **Durability** | 🏋️ | Longevity & availability | GP% + seasons at peak level | Kareem, Stockton, LeBron, Karl Malone |

**Durability does NOT affect OVR.** A player with 99 Durability and 70 Durability score the same when healthy — but the 99 plays for 20 seasons while the 70 retires after 12, giving fewer chances to reach 12 championships.

### Multi-Category Ratings

Each player in our database has ratings across ALL categories they could reasonably be placed in. This creates real strategic tension:

| Player | 🎯 | 📏 | 🏀 | 🛡️ | 💪 | ⚡ | 🧠 | 🔥 | 🏋️ |
|--------|-----|-----|-----|------|-----|-----|-----|------|------|
| Jordan | 97 | 72 | 85 | 90 | 70 | 96 | 93 | 99 | 82 |
| LeBron | 88 | 78 | 92 | 85 | 80 | 95 | 98 | 90 | 99 |
| Curry | 99 | 65 | 88 | 60 | 55 | 78 | 90 | 94 | 85 |
| Wilt | 90 | 95 | 55 | 88 | 99 | 92 | 75 | 80 | 85 |
| Rodman | 30 | 75 | 40 | 93 | 99 | 85 | 82 | 75 | 80 |

So if you roll 1990s Bulls and pick Jordan, you're spending a 97 on Shooting OR a 96 on Athleticism OR a 99 on Clutch — but you can't use him for multiple categories.

---

## 5. Roll Count & Re-Rolls

### Total Rolls: 10
- **9 rolls** for the 9 attribute categories
- **1 roll** must be used for franchise selection
- Since franchise uses one of your 10 rolls, you make 10 total rolls but only 9 produce player attributes

### Re-Rolls: 2 Total
- Can re-roll the **franchise** (get a different team)
- Can re-roll the **decade** (same team, different era)
- 2 re-rolls total across the whole game (use them wisely)

### Roll Uniqueness
You cannot get the same franchise+decade combo twice. If you roll "1990s Bulls" and pick Jordan, you won't roll "1990s Bulls" again. You could roll "2000s Bulls" or "1990s Lakers" though.

---

## 6. Career Simulation Engine

### Overall Rating (OVR) Calculation

```
OVR = (Shooting × 0.20) + (Playmaking × 0.15) + (Defense × 0.15)
    + (Clutch × 0.15) + (Athleticism × 0.10) + (Rebounding × 0.10)
    + (Height × 0.08) + (Basketball IQ × 0.07)
```

**Durability is excluded from OVR** — it only determines career length and injury probability.

Note: Clutch has 15% weight because it directly impacts Finals performance, which is the whole goal.

### Aging Curve

```
Age 19-22:  OVR at 80-90% of max (developing)
Age 23-26:  OVR at 90-97% of max (rising star)
Age 27-29:  OVR at 100% (prime)
Age 30-32:  OVR drops 2-3 pts/year
Age 33-35:  OVR drops 3-5 pts/year
Age 36+:    OVR drops 5-8 pts/year → retirement when OVR < threshold
```

**Durability modifiers:**
| Durability Rating | Career Length | Injury Risk/Season | Peak Extension |
|-------------------|--------------|-------------------|----------------|
| 95-99 | 18-20 seasons | 5% | Prime lasts to age 31 |
| 85-94 | 16-18 seasons | 10% | Standard aging |
| 75-84 | 14-16 seasons | 15% | Decline starts at 29 |
| 65-74 | 12-14 seasons | 20% | Decline starts at 28 |
| Below 65 | 10-12 seasons | 30% | Decline starts at 27 |

### Season Simulation (Per Year)

Each season runs through this pipeline:

1. **Calculate Player OVR** (age-adjusted, injury check)
2. **Calculate Team Strength** = Player OVR + franchise base rating
3. **Regular Season** = Win total based on team strength + random variance (±5-10 games)
4. **Playoff qualification** = Based on win total vs conference threshold
5. **Playoff rounds** = Series-by-series, each with upset probability
6. **Finals** = If reached, win/loss based on team strength + **Clutch bonus**
7. **Awards** = Calculated based on season performance
8. **Off-season** = Check for trade/FA/retirement

### Team Strength

**New Chapter mode:**
- Each NBA franchise has a **base rating** (derived from 2026 rosters)
- Your player adds to the team's strength proportional to their OVR
- Team ratings fluctuate ±3-5 points per season (random rebuilds, drafts, etc.)
- A 95+ OVR player on a 75-rated team can make them contenders (~85 combined)
- A 95+ OVR player on an 85-rated team makes a dynasty (~92 combined)

**Rewriting History mode (v1.5):**
- Real team ratings per season from historical data
- Your player replaces the weakest starter, boosting team strength
- Real playoff brackets and opponents used as baseline

### Finals Probability & Clutch

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

### Player Movement (Simplified, Non-Deterministic)

1. **Initial contract:** Stay on starting franchise for **3-6 seasons** (randomized)
2. **Free agency trigger:** After initial contract, 60% chance of movement per off-season
3. **Destination selection:** Weighted random from eligible teams:
   - **40% weight:** Top contenders (best 5-6 teams)
   - **30% weight:** Mid-tier teams with cap space
   - **20% weight:** Up-and-coming teams (young core + your player)
   - **10% weight:** Random wildcard (any team)

**Crucially NOT deterministic.** If your player leaves the 1980s Celtics, they don't always go to the 1990s Bulls. They might end up on the Pistons, Rockets, or even the Knicks. The randomness creates different stories each playthrough.

Movement narrative examples:
- *"After 5 seasons with the Warriors, [Player] signed with the Boston Celtics in free agency."*
- *"[Player] requested a trade from the Pacers and was dealt to the Miami Heat."*
- *"In a surprising move, [Player] joined the Sacramento Kings, believing in their young core."*

Total career team changes: **2-4 times** depending on career length.

### Stats Generation

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

### Awards Logic

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

### Difficulty Tuning

**Target: 12-0 achievable ~1 in 5 games with near-perfect attributes.**

- With perfect rolls (every attribute 95+), 12-0 should happen ~20% of the time
- With great rolls (average 90+), 12-0 should happen ~5-8% of the time
- With good rolls (average 85+), 12-0 should be nearly impossible (<1%)
- Typical outcomes for great builds: 4-10 championships, 1-3 Finals losses
- **12 is the hard cap.** Max 12 championships. (Maybe 13 as ultra-rare easter egg)
- 12-0 requires: great attributes + good franchise + high Clutch + some luck

---

## 7. Results & Career Summary Screen

This is the **money shot** — the screen people screenshot and share on Twitter/X.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                  ╔═══════════════════╗                    │
│                  ║     1 2 — 0       ║                    │
│                  ╚═══════════════════╝                    │
│               FINALS CHAMPIONSHIP RECORD                 │
│                                                          │
│         [PLAYER SILHOUETTE / ASSEMBLED AVATAR]           │
│              "The Prototype"  (nickname)                  │
│                    OVR 97                                 │
│                                                          │
│  ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐           │
│  │ 8x MVP │ │12x FMVP│ │ 17x A-S │ │ 3x DPOY│           │
│  └────────┘ └────────┘ └─────────┘ └────────┘           │
│                                                          │
│  CAREER AVERAGES                                         │
│  32.4 PPG · 9.2 RPG · 8.1 APG · 2.1 SPG · 2.8 BPG      │
│                                                          │
│  FINALS RECORD                                           │
│  🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆                          │
│  '27 '28 '29 '30 '31 '32 '33 '34 '35 '36 '37 '38       │
│                                                          │
│  CAREER JOURNEY                                          │
│  2027-2031  Golden State Warriors     (drafted)          │
│  2032-2035  Boston Celtics            (free agency)      │
│  2036-2038  Denver Nuggets            (trade)            │
│  2039-2042  Miami Heat                (free agency)      │
│                                                          │
│  RECORDS BROKEN                                          │
│  ✓ Most Championships (12 > Russell's 11)                │
│  ✓ Most Finals MVPs (12 > Jordan's 6)                    │
│  ✓ Perfect Finals Record (12-0 > Jordan's 6-0)           │
│                                                          │
│  CAREER HIGHS                                            │
│  67 pts vs LAL (2029) · 24 reb vs NYK (2031)             │
│  22 ast vs PHX (2033) · 8 blk vs MIL (2035)             │
│                                                          │
│  ALL-TIME RANKINGS                                       │
│  #1 PPG (32.4) · #2 RPG (9.2) · #3 APG (8.1)            │
│                                                          │
│  BUILT WITH                                              │
│  Curry's 🎯 · Wemby's 📏 · Magic's 🏀 · Hakeem's 🛡️    │
│  Rodman's 💪 · LeBron's ⚡ · Bird's 🧠 · Jordan's 🔥    │
│  Kareem's 🏋️ · Started at: GSW                           │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐           │
│  │ Share 📸  │  │ Link 🔗  │  │ Play Again 🔄│           │
│  └──────────┘  └──────────┘  └──────────────┘           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Key Elements
- **Finals Record** — "12-0" or "8-3" etc., prominently displayed as the headline
- **Player Avatar** — silhouette assembled during building phase
- **Auto-generated Nickname** — based on attribute combination and career outcome
- **Awards Summary** — MVPs, Finals MVPs, All-Stars, DPOYs as badges
- **Career Averages** — PPG, RPG, APG, SPG, BPG
- **Finals Timeline** — 🏆 per win, ❌ per loss, — for years without Finals
- **Career Journey** — franchises played for with years and context
- **Records Broken** — which all-time records your player surpassed
- **Career Highs** — peak single-game performances
- **All-Time Rankings** — where your player ranks in key career stats
- **"Built With"** — attribute sources, the DNA of your player
- **Share buttons** — screenshot image, shareable link, play again

---

## 8. Visual Design Direction

### Aesthetic: **Dark OLED Luxury × NBA Broadcast**

Think: the premium feel of an NBA Finals broadcast overlay, combined with the sleek darkness of high-end sports apps. Not the playful 82-0 purple — something that feels like **TNT Inside the NBA** meets **Apple TV+ sports production**.

### Color Palette
| Token | Color | Usage |
|-------|-------|-------|
| `--bg-void` | `#000000` | True black background (OLED-friendly) |
| `--bg-surface` | `#0A0A0F` | Card/panel backgrounds |
| `--bg-elevated` | `#14141F` | Elevated surfaces, modals |
| `--gold-primary` | `#D4A853` | Championship gold — primary accent |
| `--gold-glow` | `#FFD700` | Glow effects, active states |
| `--silver` | `#C0C0C8` | Secondary text, borders |
| `--court-wood` | `#C4883A` | Court floor texture accents |
| `--text-primary` | `#FFFFFF` | Headlines |
| `--text-secondary` | `#8A8A9A` | Body text, labels |
| `--success` | `#4ADE80` | Win indicators, positive stats |
| `--danger` | `#EF4444` | Loss indicators, negative events |

### Typography
- **Display/Headlines:** `Clash Display` (Bold, uppercase) — dramatic, sports-broadcast feel
- **Body/UI:** `Satoshi` — clean, modern, excellent readability on mobile
- **Monospace/Stats:** `JetBrains Mono` — for stats, ratings, numerical data

### Signature Design Elements
- **Gold particle burst** on championship wins during simulation
- **Court wood grain texture** as subtle background pattern on panels
- **Jersey number** in giant watermark behind player card
- **Animated silhouette** that builds up piece-by-piece as you select attributes
- **Glowing gold border** on the final card when 12-0 is achieved
- **Trophy stack** animation — trophies physically stack during career simulation
- **Category icons** use consistent visual language (Lucide React icons)

### Motion & Animation
- **Roll animation** — dual slot-machine for franchise + decade, momentum physics
- **Player selection** — card highlights on tap, stats expand
- **Category assignment** — slot fills with glow effect
- **Season simulation** — scrolling scoreboard ticker (like live NBA scores)
- **Championship moment** — gold confetti burst, trophy animation
- **Finals loss** — subtle screen shake, muted colors
- **Career decline** — slight desaturation of player card as seasons progress
- **Share card** — premium card-flip reveal animation

---

## 9. Screen-by-Screen Flow

### Screen 1: Landing / Home
- Full-screen true black with centered **12-0** logo (gold text)
- Subtle floating gold particle animation
- Player silhouette placeholder, gently pulsing
- **"BUILD YOUR LEGEND"** CTA button (gold, rounded, glowing)
- Tagline: *"Can you break Bill Russell's record?"*
- Mode selector: **[🕰️ Rewriting History]** | **[📖 New Chapter]**
- Collapsible "How to Play" explainer below
- *(v2: Daily Challenge banner, Leaderboard link)*

### Screen 2: The Roll Phase (10 Rounds)
**Mobile layout (vertical):**

```
┌───────────────────────────────────┐
│  12-0        Roll 3/10   2 re-rolls │
├───────────────────────────────────┤
│                                   │
│  ┌─────────┐  ┌─────────┐        │
│  │  GSW     │  │  2010s  │        │
│  │ WARRIORS │  │         │        │
│  └─────────┘  └─────────┘        │
│  [↻ Team]  [↻ Era]               │
│                                   │
├───────────────────────────────────┤
│  PICK A PLAYER                    │
│  ┌───────────────────────────┐    │
│  │ Stephen Curry    PG   99  │    │
│  │ 30.1 PPG · 5.1 RPG · 6.7 │    │
│  └───────────────────────────┘    │
│  ┌───────────────────────────┐    │
│  │ Klay Thompson    SG   88  │    │
│  │ 22.3 PPG · 3.5 RPG · 2.5 │    │
│  └───────────────────────────┘    │
│  ...more players...               │
│                                   │
│  ── OR ──                         │
│  [🏠 Start your career here]     │
│                                   │
├───────────────────────────────────┤
│  YOUR PLAYER                      │
│  ┌─────────────────────────┐      │
│  │   [SILHOUETTE]          │      │
│  │   OVR: 94 (so far)     │      │
│  │                         │      │
│  │  🎯 97  Curry           │      │
│  │  📏 --  (empty)         │      │
│  │  🏀 92  Magic           │      │
│  │  🛡️ --  (empty)         │      │
│  │  💪 99  Rodman          │      │
│  │  ⚡ --  (empty)         │      │
│  │  🧠 --  (empty)         │      │
│  │  🔥 --  (empty)         │      │
│  │  🏋️ --  (empty)         │      │
│  │  🏠 GSW (set)           │      │
│  └─────────────────────────┘      │
│                                   │
└───────────────────────────────────┘
```

### Screen 3: Player Preview Card
- Full radar/spider chart of all 8 OVR attributes
- Durability shown as a separate "career fuel" bar
- Each attribute shows source player name + headshot
- Overall OVR rating prominently displayed
- Franchise logo + mode indicator
- **"SIMULATE CAREER"** button

### Screen 4: Career Simulation
- Season-by-season vertical timeline
- Each season is a compact card:
  - Year, team, age
  - Win-loss record
  - Key stats (PPG, RPG, APG)
  - Playoff result (1st round exit, Conf Finals, Finals W/L)
  - Awards earned
- **Running Finals counter** at top: "Finals Record: 4-0 🏆🏆🏆🏆"
- Two playback modes:
  - **Manual:** Tap to reveal next season
  - **Auto-play:** 1-2 second delay per season
- Championship wins: gold highlight + trophy
- Finals losses: red border + muted
- Team changes: "MOVED TO [TEAM]" banner

### Screen 5: Career Summary
(See Section 7)

---

## 10. Data Strategy

### Source: `nba_api` → Pre-built Static JSON

**Zero runtime API calls.** Everything is pre-built and ships with the app.

### Pipeline

```
nba_api (Python) → Raw Data → Categorization → Manual Curation → Static JSON → React App
```

### Data Files

```
data/
├── players.json          # All players with multi-category ratings
├── franchises.json       # All 30 franchises with base ratings
├── decades.json          # Which players played for which franchise/decade
├── history.json          # Real championship winners per season (for Rewriting History)
└── nicknames.json        # Auto-generated nickname templates
```

### Player Data Structure

```json
{
  "id": "201939",
  "name": "Stephen Curry",
  "teams": [
    { "franchise": "GSW", "decades": ["2000s", "2010s", "2020s"] }
  ],
  "peakSeason": "2015-16",
  "stats": {
    "ppg": 30.1, "rpg": 5.1, "apg": 6.7,
    "spg": 2.1, "bpg": 0.2, "ts_pct": 0.669
  },
  "ratings": {
    "shooting": 99, "height": 65, "playmaking": 88,
    "defense": 60, "rebounding": 55, "athleticism": 78,
    "basketballIq": 90, "clutch": 94, "durability": 85
  },
  "height": "6-2",
  "photoUrl": "https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png"
}
```

### Player Coverage
- **~150-200 total players** across all eras (1960s–2020s)
- Each franchise: **5-15 notable players per decade**
- Players appear under each franchise/decade they played for
- Mix of legends, stars, and role players (not just all-time greats)
- Role players create interesting choices — take a 75-rated for a category you need, or re-roll?

### Semi-Curated Categories
- **Athleticism** and **Clutch**: editorial curation (not purely stat-derived)
- **Height/Wingspan**: physical measurements from draft data
- Other 6: computed from career stats with composite formulas

### Player Photos
- Official NBA headshots: `https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png`
- Historical fallback: silhouette with jersey number

---

## 11. Tech Stack & Architecture

### Frontend
| Tech | Purpose |
|------|---------|
| **React 19** (Vite) | Core framework |
| **Vanilla CSS** | Styling with CSS custom properties |
| **Lucide React** | Icon library |
| **Framer Motion** | Complex animations |
| **React Router** | Page routing |
| **zustand** or `useReducer` | Game state |

### Data
- Static JSON files (pre-built from Python scripts)
- Player headshots from NBA.com CDN
- No backend — simulation runs client-side

### PWA
- **vite-plugin-pwa** (Workbox) for service worker
- Web App Manifest for installability
- Full offline support after first load

### Deployment
- **Vercel** — auto-deploy from GitHub
- **GitHub:** `hugol05/12-0`

### Repository Structure

```
12-0/
├── public/
│   ├── icons/              # PWA icons
│   └── manifest.json
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Roll/           # Roll mechanic
│   │   ├── PlayerCard/     # Player selection cards
│   │   ├── AttributeSlot/  # Category assignment
│   │   ├── Simulation/     # Career simulation display
│   │   └── Summary/        # Results & share
│   ├── screens/            # Full page screens
│   │   ├── Home.jsx
│   │   ├── BuildPlayer.jsx
│   │   ├── Preview.jsx
│   │   ├── Simulate.jsx
│   │   └── Results.jsx
│   ├── engine/             # Simulation logic (pure JS)
│   │   ├── simulation.js
│   │   ├── stats.js
│   │   ├── awards.js
│   │   └── movement.js
│   ├── data/               # Static JSON files
│   ├── styles/             # CSS files
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── scripts/                # Python data pipeline
│   ├── fetch_players.py
│   ├── compute_ratings.py
│   └── export_json.py
├── DESIGN.md
├── package.json
├── vite.config.js
└── vercel.json
```

---

## 12. Social Features (v1.5+)

### Daily Challenge
- Same rolls for everyone that day (seeded RNG)
- Compare results with friends
- Shareable daily result card
- New challenge at midnight UTC

### Leaderboard
- **Best career record** — most championships, fewest Finals losses
- **Highest OVR built** — best attribute combination
- **Longest dynasty** — most consecutive championships
- localStorage initially, backend for v2

---

## 13. Scope & Phasing

### v1.0 — MVP
| Include ✅ | Defer 🔜 |
|-----------|----------|
| "New Chapter" mode (2026 start) | "Rewriting History" mode |
| 9 attribute categories + Clutch | Daily Challenge |
| Franchise + decade roll mechanic | Leaderboard (backend) |
| Player-to-category assignment | Multiple languages |
| 10 rolls with 2 re-rolls | Sound effects |
| Career simulation engine | Complex trade engine |
| Career summary / share card | Custom player appearance |
| PWA (installable, offline) | Share as image (canvas) |
| Mobile-first responsive | |
| Vercel deployment | |
| Static NBA data (JSON) | |
| Share link | |

### v1.5 — Viral Features
- "Rewriting History" mode
- Daily Challenge
- Share as image (canvas-rendered card)
- Leaderboard (localStorage)

### v2.0 — Social
- Backend leaderboard
- Head-to-head mode
- Player profile / run history

---

## 14. Implementation Order

1. **Initialize repo** — Vite + React + PWA setup, deploy skeleton to Vercel
2. **Data pipeline** — Python scripts to generate player JSON from nba_api
3. **Design system** — CSS tokens, fonts, base components
4. **Landing screen** — Logo, mode selection, how-to-play
5. **Roll mechanic** — Franchise + decade roll + player list
6. **Category assignment** — Player-to-category placement UI
7. **Player preview** — Radar chart + assembled player card
8. **Simulation engine** — Career simulation logic (JS)
9. **Simulation screen** — Season-by-season display
10. **Results screen** — Career summary + share card
11. **Polish** — Animations, micro-interactions, edge cases
12. **PWA** — Offline support, install prompt, icons
13. **Deploy** — Final Vercel deployment
