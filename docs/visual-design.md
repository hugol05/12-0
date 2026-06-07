# Visual Design & Screen Flow

> **Parent doc:** [Project Overview](README.md)
>
> **Related:** [Results Screen](results-screen.md) for the career summary layout

---

## Aesthetic: Dark OLED Luxury × NBA Broadcast

Think: the premium feel of an NBA Finals broadcast overlay, combined with the sleek darkness of high-end sports apps. Not the playful 82-0 purple — something that feels like **TNT Inside the NBA** meets **Apple TV+ sports production**.

---

## Color Palette

> Defined in [src/styles/tokens.css](../src/styles/tokens.css) (WS2 owns it). Compose these tokens
> rather than hard-coding hex so the whole app restyles from one place.

**Surfaces & borders**

| Token | Color | Usage |
|-------|-------|-------|
| `--bg-void` | `#000000` | True black background (OLED-friendly) |
| `--bg-surface` | `#0A0A0F` | Card/panel backgrounds |
| `--bg-elevated` | `#14141F` | Elevated surfaces, modals |
| `--bg-raised` | `#1D1D2B` | Highest layer — popovers, active cards |
| `--border-subtle` | `rgba(255,255,255,.07)` | Hairline borders on the void |
| `--border-strong` | `rgba(255,255,255,.14)` | Stronger separators / badge outline |

**Accents**

| Token | Color | Usage |
|-------|-------|-------|
| `--gold-primary` | `#D4A853` | Championship gold — primary accent / fills |
| `--gold-glow` | `#FFD700` | Glow effects, active states, halo |
| `--gold-deep` | `#9A7635` | Gradient shadow side of the gold ramp |
| `--gold-soft` | `rgba(212,168,83,.16)` | Translucent gold borders / tints |
| `--accent-electric` | `#4F9CF9` | Secondary "arena blue" — info, non-championship emphasis |
| `--accent-electric-soft` | `rgba(79,156,249,.16)` | Translucent blue fills |
| `--silver` | `#C0C0C8` | Secondary text, borders |
| `--court-wood` | `#C4883A` | Court floor texture accents |

**Text & state**

| Token | Color | Usage |
|-------|-------|-------|
| `--text-primary` | `#FFFFFF` | Headlines |
| `--text-secondary` | `#8A8A9A` | Body text, labels |
| `--text-tertiary` | `#5A5A68` | Faint captions, disabled labels |
| `--success` | `#4ADE80` | Win indicators, positive stats |
| `--danger` | `#EF4444` | Loss indicators, negative events |
| `--win-tint` / `--loss-tint` | `rgba(74,222,128,.12)` / `rgba(239,68,68,.10)` | Win/loss card fills |
| `--win-border` / `--loss-border` | `rgba(74,222,128,.45)` / `rgba(239,68,68,.40)` | Win/loss card outlines |

**Gradients** — `--gradient-surface` (card depth), `--gradient-gold` (championship fills/text),
`--gradient-court` (subtle floor wash), `--gradient-spotlight` (top-down gold spotlight).

**Team identity** — official franchise colors live in [src/theme/teamColors.ts](../src/theme/teamColors.ts)
(30 franchises → `{ primary, secondary, text }`, keyed by franchise `id`). Rendered via the
[`TeamBadge`](../src/components/TeamBadge.tsx) primitive (colors + abbreviation only — **no logos**, trademark-safe).

---

## Typography

Self-hosted in [src/styles/fonts.css](../src/styles/fonts.css) (`@font-face`, `font-display: swap`),
imported once from `main.tsx`. Clash Display + Satoshi ship as **variable** fonts (one file each, full
weight range); JetBrains Mono ships as three static weights (400/500/700). Files in `public/fonts/`.

| Role | Font | Style |
|------|------|-------|
| Display / Headlines | **Clash Display** (var, 200–700) | Bold, uppercase — dramatic, sports-broadcast feel |
| Body / UI | **Satoshi** (var, 300–900) | Clean, modern, excellent readability on mobile |
| Monospace / Stats | **JetBrains Mono** (400/500/700) | For stats, ratings, numerical data |

**Type scale** (tokens): `--text-xs` 12 · `--text-sm` 14 · `--text-base` 16 · `--text-lg` 18 ·
`--text-xl` 22 · `--text-2xl` 28 · `--text-3xl` 36 · `--text-4xl` 48 · `--text-hero` `clamp(3.5rem,18vw,7rem)`.
**Weights:** `--weight-regular/medium/semibold/bold` (400/500/600/700).
**Tracking:** `--tracking-display` (-.01em), `--tracking-tight` (-.02em), `--tracking-wide` (.05em),
`--tracking-eyebrow` (.18em, uppercase kickers).

---

## Signature Design Elements

- **Gold particle burst** on championship wins during simulation
- **Court wood grain texture** as subtle background pattern on panels
- **Jersey number** in giant watermark behind player card
- **Animated silhouette** that builds up piece-by-piece as you select attributes. (A generic dark basketball player shape. As each attribute is assigned, the corresponding body part glows: Shooting → arms, Height → full silhouette scales, Athleticism → legs, etc. Final player has all 8 segments glowing).
- **Glowing gold border** on the final card when 12-0 is achieved
- **Trophy stack** animation — trophies physically stack during career simulation
- **Category icons** use consistent visual language (Lucide React icons)

---

## Motion & Animation

| Interaction | Animation |
|-------------|-----------|
| **Roll** | Dual slot-machine for franchise + decade, momentum physics |
| **Player selection** | Card highlights on tap, stats expand |
| **Category assignment** | Slot fills with glow effect |
| **Season simulation** | Scrolling scoreboard ticker (like live NBA scores) |
| **Championship moment** | Gold confetti burst, trophy animation |
| **Finals loss** | Subtle screen shake, muted colors |
| **Career decline** | Slight desaturation of player card as seasons progress |
| **Share card** | Premium card-flip reveal animation |

### Motion tokens & primitives

Durations/easings are tokens in [tokens.css](../src/styles/tokens.css); the matching Framer Motion
variants live in [src/lib/motion.ts](../src/lib/motion.ts) (mirrored JS `DURATION` / `EASE` constants).
Screen workstreams import these so motion stays consistent.

- **Durations:** `--dur-instant` .12s · `--dur-fast` .2s · `--dur-base` .35s · `--dur-slow` .6s · `--dur-roll` 1.6s (slot spin).
- **Easings:** `--ease-out` (standard decel) · `--ease-in-out` · `--ease-spring` (overshoot/pop) · `--ease-slot` (hard slot-stop decel).
- **Variants exported:** `pageVariants` + `pageTransition` (route transitions), `cardReveal` + `staggerContainer` (list reveals), `slotTransition` (roll), `goldBurst` (championship), `fadeIn`.
- **Reduced motion is mandatory.** Each factory takes a `reduced` flag (collapses to a plain fade); pass Framer's `useReducedMotion()` or `prefersReducedMotion()`. CSS animations gate on `@media (prefers-reduced-motion: reduce)`.

Shared interactive primitives also include [`BackButton`](../src/components/BackButton.tsx) (accessible
back/home control, ≥44px tap target, gold hover, visible focus ring).

---

## Screen-by-Screen Flow

### Screen 1: Landing / Home

- Full-screen true black with centered **12-0** logo (gold text)
- Subtle floating gold particle animation
- Player silhouette placeholder, gently pulsing
- **"BUILD YOUR LEGEND"** CTA button (gold, rounded, glowing)
- Tagline: *"Can you break Bill Russell's record?"*
- Difficulty selector: Pill buttons for **Easy** | **Normal** (default/highlighted) | **Hard**. (Brief tooltips on each. Once the game starts, difficulty is locked.)
- Collapsible "How to Play" explainer below
- **v1.0 ships New Chapter mode only.** Do not show a mode selector in v1.0 — the game goes straight into New Chapter. A disabled **[🕰️ Rewriting History — Coming Soon]** teaser may sit below the CTA, but it is not selectable until v1.5.
- *(v1.5: enable the Rewriting History mode selector. v2: Daily Challenge banner, Leaderboard link.)*

### Screen 2: The Roll Phase (10 Rounds)

**Mobile layout (vertical):**

```
┌───────────────────────────────────┐
│  12-0        Roll 3/10   2 re-rolls │
├───────────────────────────────────┤
│                                   │
│  ┌─────────┐  ┌─────────┐        │
│  │  GSW     │  │  2010s  │        │
│  │ WARRIORS │  │         │        │
│  └─────────┘  └─────────┘        │
│  [↻ Team]  [↻ Era]               │
│                                   │
├───────────────────────────────────┤
│  PICK A PLAYER                    │
│  ┌───────────────────────────┐    │
│  │ Stephen Curry    PG   99  │    │
│  │ 30.1 PPG · 5.1 RPG · 6.7 │    │
│  └───────────────────────────┘    │
│  ┌───────────────────────────┐    │
│  │ Klay Thompson    SG   88  │    │
│  │ 22.3 PPG · 3.5 RPG · 2.5 │    │
│  └───────────────────────────┘    │
│  ...more players...               │
│                                   │
│  ── OR ──                         │
│  [🏠 Start your career here]     │
│                                   │
├───────────────────────────────────┤
│  YOUR PLAYER                      │
│  ┌─────────────────────────┐      │
│  │   [SILHOUETTE]          │      │
│  │   OVR: 94 (so far)     │      │
│  │                         │      │
│  │  🎯 97  Curry           │      │
│  │  📏 --  (empty)         │      │
│  │  🏀 92  Magic           │      │
│  │  🛡️ --  (empty)         │      │
│  │  💪 99  Rodman          │      │
│  │  ⚡ --  (empty)         │      │
│  │  🧠 --  (empty)         │      │
│  │  🔥 --  (empty)         │      │
│  │  🏋️ --  (empty)         │      │
│  │  🏠 GSW (set)           │      │
│  └─────────────────────────┘      │
│                                   │
└───────────────────────────────────┘
```

### Player Information Difficulty

The roll phase should support three information modes. This changes how much the player list reveals before selection; it does not change the underlying simulation.

| Mode | Player Card Shows | Category Assignment Shows | Intended Feel |
|------|-------------------|---------------------------|---------------|
| **Easy** | Name, position, OVR, PPG/RPG/APG, and all category ratings | Exact rating for every open category plus fit labels | Strategic and transparent |
| **Normal** | Name, position, OVR, PPG/RPG/APG, team/era context | Exact ratings only after choosing the player | Default social mode |
| **Hard** | Name, position, team/era only | Exact rating only after assignment is locked | Ball-knowledge challenge |

**Default:** Normal.

Easy mode should feel like a builder tool. Hard mode should feel like a trivia flex. Results and share links should include the difficulty mode so Hard runs get bragging rights and Easy runs remain honest.

#### Easy Player Card

```
Stephen Curry    PG    OVR 99
30.1 PPG · 5.1 RPG · 6.7 APG
🎯 99 · 📏 65 · 🏀 88 · 🛡️ 60 · 💪 55 · ⚡ 78 · 🧠 90 · 🔥 94 · 🏋️ 85
```

#### Normal Player Card

```
Stephen Curry    PG    OVR 99
30.1 PPG · 5.1 RPG · 6.7 APG
```

#### Hard Player Card

```
Stephen Curry    PG
Golden State Warriors · 2010s
```

### Screen 3: Player Preview Card

```
┌───────────────────────────────────┐
│        PLAYER ASSEMBLED           │
├───────────────────────────────────┤
│                                   │
│            [OVR 94]               │
│                                   │
│           [RADAR CHART]           │
│        (All 8 attributes)         │
│                                   │
│  [======== Durability 85 ========]│
│                                   │
│  BUILT WITH:                      │
│  🎯 97 Curry      💪 99 Rodman    │
│  📏 65 Wemby      ⚡ 82 LeBron    │
│  🏀 92 Magic      🧠 90 Bird      │
│  🛡️ 88 Hakeem     🔥 94 Jordan    │
│                                   │
│  🏠 GSW · Normal Mode             │
│                                   │
│  [  SIMULATE CAREER ▶️  ]         │
│                                   │
└───────────────────────────────────┘
```

- Full radar/spider chart of all 8 OVR attributes
- Durability shown as a separate "career fuel" bar
- Each attribute shows source player name + headshot
- Overall OVR rating prominently displayed
- Franchise logo + mode indicator
- **"SIMULATE CAREER"** button

### Screen 4: Career Simulation

- Season-by-season vertical timeline
- Each season is a compact card:
  - Year, team, age
  - Win-loss record
  - Key stats (PPG, RPG, APG)
  - Playoff result (1st round exit, Conf Finals, Finals W/L)
  - Awards earned
- **Running Finals counter** at top: "Finals Record: 4-0 🏆🏆🏆🏆"
- Two playback modes:
  - **Manual:** Tap to reveal next season
  - **Auto-play:** Default speeds are 1.5s per regular season, 2.5s for Finals years, 3s for championship wins. Total playback for a 20-season career is ~35-45 seconds. Option to 'Skip to Results' available after season 3.
- Championship wins: gold highlight + trophy
- Finals losses: red border + muted
- Team changes: "MOVED TO [TEAM]" banner

### Screen 5: Career Summary

See [Results Screen](results-screen.md) for full details.
