# Attributes & Rolls

> **Parent doc:** [Project Overview](README.md)

---

## The 9 Attribute Categories

### 8 Categories That Affect Overall Rating (OVR)

| # | Category | Icon | What It Represents | Key Stats | Example Top Players |
|---|----------|------|--------------------|-----------|---------------------|
| 1 | **Shooting** | 🎯 | Pure jump shot (not inside finishing) | 3PT + mid-range + FT + shot IQ | Curry, Reggie Miller, Klay, Dirk, Ray Allen |
| 2 | **Height & Wingspan** | 📏 | Physical frame & reach | Height + wingspan blend | Yao Ming, Wembanyama, Giannis, Bol Bol |
| 3 | **Playmaking** | 🏀 | Court vision & passing | 2K playmaking group | Magic, Stockton, CP3, Nash |
| 4 | **Defense** | 🛡️ | Rim protection & perimeter D | 2K defense group | Russell, Hakeem, Kawhi, Pippen |
| 5 | **Rebounding** | 💪 | Board control & positioning | 2K rebounding group | Rodman, Wilt, Moses Malone, Barkley |
| 6 | **Athleticism** | ⚡ | Speed, vertical, explosiveness + inside finishing | 2K athleticism + dunk | Westbrook, LeBron, Vince Carter, Giannis |
| 7 | **Basketball IQ** | 🧠 | Decision-making & BBIQ | pass + shot + help-defense IQ | LeBron, Bird, Duncan, Jokić |
| 8 | **Clutch** | 🔥 | Performance under pressure (winners rate higher) | star tier + rings + big-shot legends | Jordan, Kobe, Reggie, Lillard, Duncan |

> **Height is not shown as a number.** Unlike the other categories, Height & Wingspan is never surfaced as a "94" rating to the player — the UI shows the real listed height (e.g. 7'1") and folds size into the player's **archetype** (e.g. "Defensive Anchor"). It still feeds OVR at 8%. Ratings come from a hand-rated 2K-style dataset where available; see [data-strategy.md §4](data-strategy.md).

### 1 Category That Affects Career Length Only

| # | Category | Icon | What It Represents | Key Stats | Example Top Players |
|---|----------|------|--------------------|-----------|---------------------|
| 9 | **Durability** | 🏋️ | Longevity & availability | GP% + seasons at peak level | Kareem, Stockton, LeBron, Karl Malone |

**Durability does NOT affect OVR.** A player with 99 Durability and 70 Durability score the same when healthy — but the 99 plays for 20 seasons while the 70 retires after 12, giving fewer chances to reach 12 championships.

---

## Multi-Category Ratings

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

## OVR Calculation

```
OVR = (Shooting × 0.20) + (Playmaking × 0.15) + (Defense × 0.15)
    + (Clutch × 0.15) + (Athleticism × 0.10) + (Rebounding × 0.10)
    + (Height × 0.08) + (Basketball IQ × 0.07)
```

**Durability is excluded from OVR** — it only determines career length and injury probability.

Note: Clutch has 15% weight because it directly impacts Finals performance, which is the whole goal.

---

## Roll Count & Re-Rolls

### Total Rolls: 10 (9 attribute + 1 franchise)
- **9 attribute rolls** — each a random franchise+decade combo. You pick a player from the roster, then click one of the unfilled category rings to assign that player to it.
- **1 franchise roll** — a separate, dedicated final roll **after** the 9 categories are filled. It rolls a **team only** (no era — New Chapter always starts 2026-27) and shows the team's masked profile.

### Re-Rolls
- During the 9 attribute rolls: **1 re-roll to swap the team** (keeps the current era) and **1 to swap the era** (keeps the current team). Each is usable once for the whole build.
- The franchise roll has its own dedicated **1 re-roll**.

### Franchise profile (masked)
The franchise roll surfaces the team's outlook so you can read good-future vs. immediate-impact, without exposing raw numbers:
- **Strength** (from `baseRating2026`) → Title contender / Playoff team / Play-in hopeful / Rebuilding.
- **Age** (from `youthIndex`) → Young core / Balanced roster / Veteran team.
- **Market** (from `marketTier`) → Big / Mid / Small market.
- A one-line verdict combines strength + age (e.g. "On the rise — a young playoff core").

### Roll Uniqueness
You cannot get the same franchise+decade combo twice (re-rolls also avoid used combos). If you roll "1990s Bulls" and pick Jordan, you won't roll "1990s Bulls" again. You could roll "2000s Bulls" or "1990s Lakers" though.

---

## Player Information Difficulty

Difficulty controls how much information is visible when choosing players. It does not change the roll pool, ratings, aging, or simulation.

| Mode | Before Picking | After Picking | Notes |
|------|----------------|---------------|-------|
| **Easy** | Shows OVR, PPG/RPG/APG, and all category ratings | Choose any open category with exact ratings visible | Best for first-time players and strategy-heavy runs |
| **Normal** | Shows OVR and familiar stats like PPG/RPG/APG | Reveals exact category ratings when assigning | Default mode |
| **Hard** | Shows only name, position, franchise, and decade | Reveals exact rating only after the category is locked | Best for NBA knowledge challenges |

Share links and results should store the selected information mode. Hard-mode 12-0 runs should be clearly labeled because the player made decisions with much less information.
