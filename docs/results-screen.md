# Results & Career Summary Screen

> **Parent doc:** [Project Overview](README.md)
>
> **Related:** [Simulation Engine](simulation-engine.md) for what data feeds into this screen

---

## Purpose

This is the **money shot** — the screen people screenshot and share on Twitter/X. It should feel like a premium career retrospective card.

The created player will often become statistically better than LeBron, Jordan, Kareem, Wilt, and Russell. The results screen should not be shy about that. It should show total production, broken records, absurd peaks, and legacy debates in a layout that still fits cleanly into a mobile screenshot.

---

## Layout: Share Poster

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
│          [LEGACY TIER: 12-0 Immortal]                     │
│                                                          │
│  ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐           │
│  │ 8x MVP │ │12x FMVP│ │ 17x A-S │ │ 3x DPOY│           │
│  └────────┘ └────────┘ └─────────┘ └────────┘           │
│                                                          │
│  CAREER AVERAGES                                         │
│  32.4 PPG · 9.2 RPG · 8.1 APG · 2.1 SPG · 2.8 BPG      │
│                                                          │
│  CAREER TOTALS                                           │
│  52,840 PTS · 14,901 REB · 13,244 AST · 2,941 STL       │
│  3,812 BLK · 1,704 GP · 244 PLAYOFF GAMES               │
│                                                          │
│  FINALS RECORD                                           │
│  🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆                          │
│  '27 '28 '29 '30 '31 '32 '33 '34 '35 '36 '37 '38       │
│                                                          │
│  SIGNATURE MOMENTS                                       │
│  104 pts vs LAL · 23/22/21 triple-double · 16-0 run     │
│                                                          │
│  CAREER JOURNEY                                          │
│  2027-2031  Golden State Warriors     (drafted)          │
│  2032-2035  Boston Celtics            (free agency)      │
│  2036-2038  Denver Nuggets            (trade)            │
│  2039-2042  Miami Heat                (free agency)      │
│                                                          │
│  RECORDS BROKEN                                          │
│  ✓ Most Championships (12 > Russell's 11)                │
│  ✓ Most Career Points (52,840 > LeBron's record)         │
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

---

## Results Views

The first view must be a polished poster that fits in a screenshot. Additional views can sit below it or behind tabs for players who want the full record book.

| View | Purpose | Content |
|------|---------|---------|
| **Legacy Poster** | Default share screenshot | Finals record, OVR, awards, averages, key totals, top records, built-with DNA |
| **Career Totals** | Prove the supergod career | Points, rebounds, assists, steals, blocks, games, seasons, playoff totals, Finals totals |
| **Record Book** | Make broken history feel huge | Records broken, all-time rank comparisons, active record chase notes |
| **Signature Games** | Add dynamism and absurdity | 100+ point games, 20/20/20, 5x5, Game 7 winners, 70-win seasons, 16-0 playoff runs |
| **Journey** | Tell the career story | Team timeline, movement reasons, championships by franchise |
| **Built With** | Reinforce the build mechanic | Attribute source players, category ratings, starting franchise, difficulty mode |

*(Note: Legacy Debates and Rivalries systems are deferred to v1.5/v2 and are not required for v1.0)*

## Key Elements

| Element | Description |
|---------|-------------|
| **Finals Record** | "12-0" or "8-3" etc., prominently displayed as the headline |
| **Player Avatar** | Silhouette assembled during building phase |
| **Auto-generated Nickname** | Based on attribute combination and career outcome |
| **Awards Summary** | MVPs, Finals MVPs, All-Stars, DPOYs as badges |
| **Career Averages** | PPG, RPG, APG, SPG, BPG |
| **Career Totals** | Total points, rebounds, assists, steals, blocks, games, seasons, playoff games |
| **Finals Timeline** | 🏆 per win, ❌ per loss, — for years without Finals |
| **Career Journey** | Franchises played for with years and context |
| **Records Broken** | Which all-time records your player surpassed, with comparison values |
| **Career Highs** | Peak single-game performances, including impossible-feeling outliers |
| **All-Time Rankings** | Where your player ranks in key career stats and awards |
| **Signature Moments** | Rare events that make the run memorable |
| **"Built With"** | Attribute sources, the DNA of your player |
| **Share buttons** | Screenshot image, shareable link, play again |

---

## Record Book

The results screen should compare the player against real all-time landmarks. Exact records can be stored as static constants and updated manually when needed.

| Record Area | Examples |
|-------------|----------|
| Championships | Bill Russell's 11 rings, most consecutive championships |
| Finals | Finals MVPs, perfect Finals record, Finals points, Finals triple-doubles |
| Regular Season | Career points, rebounds, assists, steals, blocks, threes, games played |
| Awards | MVPs, All-NBA teams, All-Star selections, DPOYs, scoring titles |
| Single Game | 100+ points, 55+ rebounds, 30+ assists, 17+ blocks, 11+ steals |
| Season | PPG, triple-doubles, win shares-style dominance, 70-win team seasons |

Use record labels that feel fun and legible:

- **Russell Breaker:** 12+ championships
- **LeBron Slayer:** passes LeBron's major longevity records
- **Jordan Argument:** perfect Finals record with 7+ rings
- **Wilt Mode:** 100+ point game or absurd single-season scoring
- **Iron Crown:** elite OVR after age 38
- **Dynasty Architect:** 5+ straight championships

---

## Screenshot Layout Rules

- **Dimensions:** Legacy Poster target is 390×844px (iPhone 14/15 viewport). Use CSS `aspect-ratio: 9/16` on the poster container.
- On wider screens, the poster is centered with `max-width: 430px`.
- Content should be dense enough to fill the frame without scrolling. Use dense stat rows, not giant empty cards.
- Keep the headline record, awards, totals, records broken, and built-with DNA visible together.
- Secondary views can scroll, but the first screen must be the shareable artifact.
- Generate a clean image share in v1.5, but v1.0 must still be screenshot-safe.

## Share Functionality

Three share actions:
1. **Share 📸** — Generates a shareable image (v1.5: canvas-rendered card; v1.0 screenshot-safe poster)
2. **Link 🔗** — Copies a shareable URL with the build encoded
3. **Play Again 🔄** — Restarts the game
