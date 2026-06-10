# Social Features & Roadmap

> **Parent doc:** [Project Overview](README.md)

---

## Social Features (v1.5+)

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

## Scope & Phasing

### v1.0 — MVP

| Include ✅ | Defer 🔜 |
|-----------|----------|
| "New Chapter" mode (2026 start) | "Rewriting History" mode |
| 9 attribute categories + Clutch | Daily Challenge |
| Franchise + decade roll mechanic | Leaderboard (backend) |
| Player-to-category assignment | Multiple languages |
| 10 rolls with 2 re-rolls | Sound effects |
| Career simulation engine | Complex trade engine |
| Career summary / screenshot-safe share poster | Custom player appearance |
| PWA (installable, offline) | Share as image (canvas) |
| Mobile-first responsive | |
| Vercel deployment | |
| Static NBA data (JSON) | |
| Share link | |
| Easy / Normal / Hard player information modes | |

### v1.5 — Viral Features
- Daily Challenge
- Share as image (canvas-rendered card)
- Leaderboard (localStorage)
- Alternate share views: Record Book, Career Totals, Dynasty Map, Built With
- Rivalry callouts and rare career event highlights

### v2.0 — Social
- "Rewriting History" mode
- Backend leaderboard
- Head-to-head mode
- Player profile / run history

---

## Implementation Order

> The authoritative, phase-by-phase build sequence lives in **[MASTER_PLAN.md](MASTER_PLAN.md)**. This is the high-level summary. We build **data-pipeline-first**: the real dataset and the simulation engine are built and validated before the UI, so the app is built entirely against production-shaped data (no mock data).

1. **Initialize repo** — Vite + React 19 + TypeScript + PWA scaffold, deploy skeleton to Vercel
2. **Data pipeline** — Python scripts fetch/normalize/rate/validate real NBA data → `public/data/*.json`
3. **Simulation engine** — Deterministic TypeScript career simulator (`src/simulation/`) + Vitest Monte Carlo balance tests
4. **Design system** — CSS tokens, fonts, base components
5. **Landing screen** — Logo, how-to-play, difficulty selector (New Chapter only in v1.0)
6. **Roll mechanic** — Franchise + decade roll + player list (filters/search/sort)
7. **Information difficulty** — Easy / Normal / Hard player card visibility
8. **Category assignment** — Player-to-category placement UI
9. **Player preview** — Radar chart + assembled player card
10. **Simulation screen** — Season-by-season display (driven by the Web Worker)
11. **Results screen** — Career summary, totals, record book, screenshot-safe share poster
12. **Polish** — Animations, micro-interactions, edge cases
13. **PWA** — Offline support, install prompt, icons
14. **Deploy** — Final Vercel deployment
