# 12-0 Pre-Mortem

> **Parent doc:** [Project Overview](README.md)
>
> Purpose: identify the ways 12-0 could feel unfair, flat, confusing, or less viral than the concept deserves, then turn those risks into design decisions.

---

## Executive Summary

12-0 is strongest when it lets the player build a ridiculous basketball superhuman, then tells the story of a career that feels bigger than real NBA history. The biggest product risks are not technical first. They are tuning and presentation risks:

- If aging is too harsh, high-durability legends stop feeling like LeBron/Kareem-style outliers.
- If free agency is too random, MVP-level players make unrealistic choices that cheapen the dynasty fantasy.
- If the results screen only shows averages and rings, the payoff undersells the player's absurd career.
- If player selection exposes too much or too little information for everyone, the roll phase loses either strategy or mystery.
- If the game focuses only on 12-0, very strong but imperfect careers may feel like failures instead of shareable stories.

The design should lean into the premise: this is not a realistic create-a-player sim. It is a championship legacy generator with believable basketball logic.

---

## Main Failure Modes

### 1. Legendary Longevity Feels Wrong

**Risk:** A 99 OVR peak player with elite durability declines too fast, turning into an 80s OVR player by the late 30s.

**Why it matters:** The game invites players to create the greatest basketball player ever. LeBron being near-MVP level at 36 and still elite at 41 is the mental model for 95-99 Durability. If the curve cannot reproduce that type of career, Durability feels fake.

**Decision:** Use durability-gated aging curves. Elite durability should preserve superstar OVR deep into the 30s, while low durability still creates short, fragile careers.

### 2. Superstars Join Bad Teams Too Often

**Risk:** The player creates a multi-time MVP and the simulation sends them to a rebuilding team because the movement table overvalues randomness.

**Why it matters:** A true top-1 player usually chooses title equity, especially in a game where the objective is championships. Weird destinations can be fun, but if they happen too often they make the game feel unserious.

**Decision:** Destination selection should be tier-aware. MVP/superstar players should join top-5 teams around 90% of the time, weighted across the top group so the best team is favored but not guaranteed.

### 3. The Results Screen Is Not Viral Enough

**Risk:** The summary screen feels like a box score instead of the moment people want to screenshot.

**Why it matters:** The player is likely to outdo LeBron, Jordan, Kareem, Wilt, and Russell in at least one category. The results page should celebrate that with total points, total rings, records broken, career highs, all-time ranks, and absurd signature moments.

**Decision:** Treat results as a shareable legacy poster plus expandable career archive. The default view must fit cleanly in a mobile screenshot, while deeper sections can show full totals and season-by-season details.

### 4. Player Picking Has One Difficulty For Everyone

**Risk:** Showing every rating makes the game too solved for experienced players; hiding too much makes it frustrating for casual players.

**Why it matters:** 12-0's strategic tension lives in "Should I spend this player here?" The right amount of information changes by audience.

**Decision:** Add information difficulty modes:

| Mode | Player List Shows | Best For |
|------|-------------------|----------|
| **Easy** | All category ratings, OVR, familiar box stats, fit labels | Learning, casual play, first runs |
| **Normal** | OVR, PPG/RPG/APG, position, era/team context | Default social mode |
| **Hard** | Name, position, team/era only | Ball-knowledge challenge |

### 5. Perfect Or Bust Feels Bad

**Risk:** A 10-ring career with 6 MVPs feels like a loss because it was not 12-0.

**Why it matters:** The game needs a dream outcome, but almost-great careers should still produce shareable stories.

**Decision:** Add legacy tiers and alternate achievements: "Russell Watch", "LeBron Slayer", "Jordan Argument", "Wilt Mode", "Dynasty Architect", "Perfect Finals", "Longevity God", "One-Team Myth", and "100-Point Club".

---

## Upgrade Ideas

### Legacy Achievements

Add achievement-style badges that give every strong run a headline even when the player misses 12-0.

| Badge | Trigger |
|-------|---------|
| **12-0 Immortal** | 12 championships, 0 Finals losses |
| **Russell Breaker** | 12+ championships |
| **Jordan Argument** | 7+ Finals wins with 0 losses |
| **LeBron Slayer** | Beats LeBron in total points, MVPs, or championships |
| **Wilt Mode** | 100+ point game or 50+ PPG season |
| **Iron Crown** | 20+ seasons with elite late-career OVR |
| **Dynasty Architect** | 5+ consecutive championships |
| **Mercenary King** | Championships with 3+ franchises |
| **One-Team Myth** | 10+ championships with one franchise |

### Rival System

Generate 1-3 rival teams or rival stars during the career. Rivalries give the simulation recurring villains and make Finals losses feel like story beats instead of pure failure.

Examples:

- "Your 2032 Finals loss came against Luka's Spurs superteam."
- "You eliminated Boston in four straight playoff runs."
- "The Nuggets rivalry defined your prime."

### Legacy Debates

At the end, generate a debate framing:

- "Best peak ever, but not the longest reign."
- "The greatest Finals performer in NBA history."
- "The only player with a real argument over Russell and LeBron."
- "Statistically impossible, emotionally undeniable."

### Dynamic Career Events

Add rare, memorable events:

- 100+ point game
- 20/20/20 game
- 5x5 playoff game
- Game 7 buzzer-beater
- 70-win season
- 16-0 playoff run
- Major injury comeback
- Finals revenge series
- Mid-career team-up with another generated star

### Share Variants

Let the results screen produce multiple screenshot-friendly views:

| Share View | Purpose |
|------------|---------|
| **Legacy Poster** | One-screen summary for social sharing |
| **Record Book** | Records broken and all-time rankings |
| **Career Totals** | Total points, rebounds, assists, steals, blocks, games, seasons |
| **Built With** | Attribute sources and starting franchise |
| **Dynasty Map** | Team journey and championships by franchise |

### Daily Seed Upgrade

Daily Challenge should eventually include a "same rolls, different knowledge mode" leaderboard. Easy, Normal, and Hard results should not be mixed because they are meaningfully different games.

---

## Tuning Principles

1. A 99 peak with 95-99 Durability should still feel like a top-5 player at 36.
2. A top-1 or MVP-level player should almost always choose a contender.
3. Clutch should matter most in the Finals, but it should not erase team quality.
4. Durability should create more chances at 12 rings, not just fewer injuries.
5. The results screen should celebrate broken history, not merely report a final score.
6. "Almost 12-0" should still create a story worth sharing.
