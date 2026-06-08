# Concept & Core Mechanic

> **Parent doc:** [Project Overview](README.md)

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
3. You see the **full roster** of notable players from that team in that decade. The amount of visible information depends on difficulty:
   - **Easy:** all category ratings, OVR, and stats
   - **Normal:** OVR and familiar stats
   - **Hard:** name, position, franchise, and decade only
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

The starting franchise is a **dedicated final roll**, taken *after* all 9 attribute categories are filled — it is no longer something you can claim on an arbitrary roll. It rolls a **team only** and shows that team's masked profile (strength / age / market) so you can read a win-now vs. build-for-later landing spot before committing. It has its own single re-roll.
- In **"New Chapter"** mode (v1.0): Your player joins that team in 2026-27 (the franchise roll carries no decade).
- In **"Rewriting History"** mode (v1.5): the starting decade returns, so the franchise roll will also carry an era and your player joins that team in that decade.

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
