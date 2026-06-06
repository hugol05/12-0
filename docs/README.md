# 12-0 — Project Overview

> **Build the Perfect Player. Break the Record.**
>
> A viral web game where you craft a Frankenstein NBA superstar from real player attributes, then simulate their entire career to see if they can go **12-0 in the Finals** and break Bill Russell's legendary record of 11 rings.

---

## Quick Summary

| What | Details |
|------|---------|
| **Genre** | Browser-based NBA simulation / drafting game |
| **Core Loop** | Roll → Pick → Place (10 rounds) → Simulate Career |
| **Goal** | Go 12-0 in Finals appearances (12 wins, 0 losses) |
| **Why "12-0"** | Bill Russell holds the record with 11 championships. Beat him. |
| **Inspiration** | [7-0](https://7a0.com.br/en) (football) and [82-0](https://www.82-0.com) (basketball) |
| **Key Differentiator** | You build a **single player** (not a team), choosing **where to place** each attribute. Career spans 15-20 seasons, not just one. |
| **Tech** | React 19 (Vite), Vanilla CSS, Framer Motion, PWA, static JSON data |
| **Target** | Mobile-first, Vercel deployment, full offline support |

---

## How the Game Works (For Any Agent)

### 1. Player Building Phase (10 Rolls)

You make **10 rolls**, each revealing a random **franchise + decade** combo (e.g. "1990s Bulls"). From the roster, you **pick a player** and **assign them to one of 9 attribute categories**. One roll must be used to select your **starting franchise** instead.

**The 9 attribute categories:**

| # | Category | Icon | Affects |
|---|----------|------|---------|
| 1 | Shooting | 🎯 | OVR (20% weight) |
| 2 | Height & Wingspan | 📏 | OVR (8% weight) |
| 3 | Playmaking | 🏀 | OVR (15% weight) |
| 4 | Defense | 🛡️ | OVR (15% weight) |
| 5 | Rebounding | 💪 | OVR (10% weight) |
| 6 | Athleticism | ⚡ | OVR (10% weight) |
| 7 | Basketball IQ | 🧠 | OVR (7% weight) |
| 8 | Clutch | 🔥 | OVR (15% weight) — **most impactful for 12-0** |
| 9 | Durability | 🏋️ | Career length only (NOT in OVR) |

**Re-rolls:** 2 total (can re-roll franchise or decade independently).

### 2. Career Simulation

Once built, the player's entire career is simulated season-by-season:
- **OVR** is calculated from the 8 attribute categories (weighted sum)
- **Aging curve** takes the player from development → prime → decline → retirement, with elite Durability enabling LeBron/Kareem-style longevity
- **Durability** determines career length (10-22 seasons), injury risk, and late-career decline shape
- **Each season:** calculate team strength → regular season → playoffs → Finals → awards → off-season movement
- **Clutch** is the key stat — it directly boosts Finals win probability
- **Player movement:** 2-4 team changes over a career via free agency / trade, with MVP-level players usually choosing top-5 teams

### 3. Results Screen

The "money shot" — a shareable career summary card showing:
- Finals record (e.g. "12-0" or "8-3")
- Career averages, career totals, awards, journey across teams
- Records broken, all-time rankings, signature games, and legacy badges
- "Built With" section showing which real players contributed each attribute
- Share buttons (screenshot, link, play again)

### Player Information Difficulty

The player-picking phase supports three information modes:

| Mode | What You See |
|------|--------------|
| **Easy** | All category ratings, OVR, and familiar stats |
| **Normal** | OVR and stats like PPG/RPG/APG; category ratings revealed after picking |
| **Hard** | Name, position, franchise, and era only |

### Two Game Modes

| Mode | Description | Status |
|------|-------------|--------|
| **📖 New Chapter** | Career starts in 2026-27 on current rosters. Fully simulated future. | **v1.0 (ship first)** |
| **🕰️ Rewriting History** | Career starts in the rolled decade. Real NBA history plays out around you. | v1.5 |

### Difficulty Target

- Perfect rolls (all 95+): ~20% chance of 12-0
- Great rolls (avg 90+): ~5-8% chance
- Good rolls (avg 85+): <1% chance
- Typical great build: 4-10 championships, 1-3 Finals losses

---

## Design Direction

**Aesthetic:** Dark OLED Luxury × NBA Broadcast (TNT Inside the NBA meets Apple TV+)

- True black OLED backgrounds, championship gold accents
- Fonts: Clash Display (headlines), Satoshi (body), JetBrains Mono (stats)
- Gold particle bursts on championship wins, court wood grain textures
- Animated player silhouette that builds up piece-by-piece

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 (Vite) |
| Styling | Vanilla CSS with custom properties |
| Icons | Lucide React |
| Animations | Framer Motion |
| Routing | React Router |
| State | zustand or useReducer |
| Data | Static JSON (pre-built from Python/nba_api) |
| PWA | vite-plugin-pwa (Workbox) |
| Deploy | Vercel |

**Zero runtime API calls.** All data ships as static JSON.

---

## Phasing

| Version | What's Included |
|---------|----------------|
| **v1.0 (MVP)** | New Chapter mode, full roll→pick→place→simulate→results loop, PWA, share link |
| **v1.5** | Rewriting History mode, Daily Challenge, share as image, localStorage leaderboard |
| **v2.0** | Backend leaderboard, head-to-head mode, player profile / run history |

---

## Detailed Documentation

Each area of the project has its own detailed doc. **Read the overview above first**, then dive into the relevant doc for your task:

| Document | Covers |
|----------|--------|
| [Concept & Core Mechanic](concept.md) | What the game is, the Roll→Pick→Place loop, franchise slot, two game modes |
| [Attributes & Rolls](attributes.md) | The 9 categories, multi-category ratings, roll count & re-roll rules |
| [Simulation Engine](simulation-engine.md) | OVR formula, aging curve, season pipeline, team strength, Clutch impact, stats generation, awards, difficulty tuning |
| [Results Screen](results-screen.md) | Career summary layout, key elements, share functionality |
| [Visual Design](visual-design.md) | Color palette, typography, design elements, animations, screen-by-screen UI flow |
| [Data Strategy](data-strategy.md) | Data pipeline, JSON structure, player coverage, photo sources |
| [Tech Stack & Architecture](tech-stack.md) | Frontend stack, PWA setup, repository structure, deployment |
| [Social Features & Roadmap](roadmap.md) | Daily Challenge, leaderboard, scope/phasing, implementation order |
| [Pre-Mortem](pre-mortem.md) | Product risks, balancing concerns, and upgrade ideas |
