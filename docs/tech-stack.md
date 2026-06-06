# Tech Stack & Architecture

> **Parent doc:** [Project Overview](README.md)

---

## Frontend Stack

| Tech | Purpose |
|------|---------|
| **React 19** (Vite) | Core framework |
| **Vanilla CSS** | Styling with CSS custom properties |
| **Lucide React** | Icon library |
| **Framer Motion** | Complex animations |
| **React Router** | Page routing |
| **zustand** or `useReducer` | Game state management |

---

## Data Layer

- Static JSON files (pre-built from Python scripts)
- Player headshots from NBA.com CDN
- No backend — simulation runs entirely client-side

---

## PWA

- **vite-plugin-pwa** (Workbox) for service worker
- Web App Manifest for installability
- Full offline support after first load

---

## Deployment

- **Vercel** — auto-deploy from GitHub
- **GitHub repo:** `hugol05/12-0`

---

## Repository Structure

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
├── docs/                   # Project documentation (you are here)
├── DESIGN.md               # Original monolithic design doc
├── package.json
├── vite.config.js
└── vercel.json
```
