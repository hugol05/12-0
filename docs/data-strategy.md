# Data Strategy

> **Parent doc:** [Project Overview](README.md)
>
> **Related:** [Attributes & Rolls](attributes.md) for how ratings are used in gameplay

---

## Principle: Zero Runtime API Calls

Everything is pre-built and ships with the app as static JSON. No backend, no external API calls at runtime.

---

## Pipeline

```
nba_api (Python) → Raw Data → Categorization → Manual Curation → Static JSON → React App
```

---

## Data Files

```
data/
├── players.json          # All players with multi-category ratings
├── franchises.json       # All 30 franchises with base ratings
├── decades.json          # Which players played for which franchise/decade
├── history.json          # Real championship winners per season (for Rewriting History)
├── records.json          # All-time records and comparison thresholds
├── events.json           # Rare career event templates and labels
└── nicknames.json        # Auto-generated nickname templates
```

---

## Player Data Structure

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

---

## Player Coverage

- **~150-200 total players** across all eras (1960s–2020s)
- Each franchise: **5-15 notable players per decade**
- Players appear under each franchise/decade they played for
- Mix of legends, stars, and role players (not just all-time greats)
- Role players create interesting choices — take a 75-rated for a category you need, or re-roll?

---

## Semi-Curated Categories

| Category | Data Source |
|----------|------------|
| **Athleticism** | Editorial curation (not purely stat-derived) |
| **Clutch** | Editorial curation (not purely stat-derived) |
| **Height/Wingspan** | Physical measurements from draft data |
| **Other 6** | Computed from career stats with composite formulas |

---

## Player Photos

- **Primary:** Official NBA headshots: `https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png`
- **Historical fallback:** Silhouette with jersey number (for pre-photo era or missing headshots)

---

## Records & Legacy Data

The results screen needs static comparison data so it can say exactly which records the created player broke.

```json
{
  "careerPoints": {
    "label": "Most Career Points",
    "holder": "LeBron James",
    "value": 40474,
    "unit": "points"
  },
  "championships": {
    "label": "Most Championships",
    "holder": "Bill Russell",
    "value": 11,
    "unit": "rings"
  }
}
```

Include records for:

- Career totals: points, rebounds, assists, steals, blocks, threes, games
- Awards: MVPs, Finals MVPs, All-Star selections, All-NBA teams, DPOYs
- Playoffs and Finals: points, wins, series records, perfect Finals marks
- Single-game highs: points, rebounds, assists, steals, blocks
- Season highs: PPG, triple-doubles, wins, playoff record

These records can be manually maintained. They do not require runtime API calls.

---

## Rare Event Templates

Rare events make the final career feel dynamic instead of purely numerical.

```json
{
  "hundredPointGame": {
    "label": "100-Point Club",
    "template": "{player} scored {points} against {opponent} in {season}.",
    "minPoints": 100
  }
}
```

Examples:

- 100+ point game
- 20/20/20 game
- 5x5 game
- Game 7 buzzer-beater
- 70-win season
- 16-0 playoff run
- Major injury comeback
- Finals revenge series
