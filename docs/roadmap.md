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
- "Rewriting History" mode
- Daily Challenge
- Share as image (canvas-rendered card)
- Leaderboard (localStorage)
- Alternate share views: Record Book, Career Totals, Dynasty Map, Built With
- Rivalry callouts and rare career event highlights

### v2.0 — Social
- Backend leaderboard
- Head-to-head mode
- Player profile / run history

---

## Implementation Order

1. **Initialize repo** — Vite + React + PWA setup, deploy skeleton to Vercel
2. **Data pipeline** — Python scripts to generate player JSON from nba_api
3. **Design system** — CSS tokens, fonts, base components
4. **Landing screen** — Logo, mode selection, how-to-play
5. **Roll mechanic** — Franchise + decade roll + player list
6. **Information difficulty** — Easy / Normal / Hard player card visibility
7. **Category assignment** — Player-to-category placement UI
8. **Player preview** — Radar chart + assembled player card
9. **Simulation engine** — Career simulation logic (JS), including elite longevity and contender-weighted movement
10. **Simulation screen** — Season-by-season display
11. **Results screen** — Career summary, career totals, record book, screenshot-safe share poster
12. **Polish** — Animations, micro-interactions, edge cases
13. **PWA** — Offline support, install prompt, icons
14. **Deploy** — Final Vercel deployment
