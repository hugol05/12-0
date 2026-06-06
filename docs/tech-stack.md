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

### Game State Persistence

Game state is saved to `localStorage` after each roll. If the user returns, they're prompted: "Resume your build? (Roll 6/10)" or "Start fresh". Completed careers are also cached for the results screen.

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

### iOS PWA Considerations
Use `viewport-fit=cover` + `env(safe-area-inset-*)` for iOS notch/home indicator. Status bar should be `black-translucent` to match the OLED void background. Test on iOS Safari specifically.

---

## Share URL Encoding

Share URL format: `12-0.app/s/{encoded}` where `{encoded}` is a base64-compressed JSON of:
```json
{
  "attributes": ["9 player IDs + category assignments"],
  "franchise": {"id": "GSW", "decade": "2010s"},
  "difficulty": "normal",
  "seed": 12345
}
```
The seed allows exact replay of the career simulation. Total URL should stay under 200 characters.

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
├── package.json
├── vite.config.js
└── vercel.json
```
