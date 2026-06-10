# 12-0 — v2 Upgrade Plan (Coordinator Spec)

> **Purpose:** the single coordination source for the "make it premium" upgrade pass. The owner runs each
> workstream below in a **separate chat**. Every workstream is scoped to **own a disjoint set of files** so the
> chats can run in parallel without stepping on each other.
>
> **Read order for any chat:** [docs/README.md](README.md) → [docs/BUILD_STATUS.md](BUILD_STATUS.md) → this file (your workstream) → the topic docs your workstream names.

---

## Locked decisions (owner, 2026-06-07)

These are settled — do **not** relitigate inside a workstream:

1. **Team identity = colors + abbreviation only.** No logos (real NBA logos are trademarked → legal risk for a viral public game). Use each franchise's official colors + 3-letter abbreviation in a styled badge. Team **colors are facts, not IP** — safe to ship. Source: a curated `src/theme/teamColors.ts` map (WS2), not the data pipeline.
2. **Fonts = the speced trio, actually loaded.** Self-host **Clash Display** (display) + **Satoshi** (body) + **JetBrains Mono** (stats). Clash Display & Satoshi are free for commercial use via Fontshare; self-host (don't hotlink). Tokens already reference them in [src/styles/tokens.css](../src/styles/tokens.css).
3. **Silhouette = full build-up centerpiece.** A hand-crafted premium SVG figure whose 8 attribute zones light up as attributes are assigned, carried through Build → Preview → Results. This is *the* signature visual.
4. **Workstreams are independent & parallel.** Each owns disjoint files. The only soft ordering: WS2 (design foundation) and WS3 (silhouette) produce shared primitives the screen workstreams consume — see *Sequencing* below.

---

## The problem (owner-reported)

1. **Ratings are imprecise / wrong-headed.** Shooting rewards raw scoring (Shaq rates as an elite shooter); height under-rates some tall players; athleticism over-rates plodding big men. Needs a real fidelity pass. *(WS1)*
2. **No motion, feels cheap.** No roll animation, no page transitions, no championship feedback. *(WS2 + WS4 + WS5)*
3. **Results screen feels cheap.** Doesn't clearly show which team you're on each season, doesn't highlight team changes, no team identity, no round-reached, weak award presentation, stats flash by too fast. *(WS5)*
4. **Flow gaps & generic UI.** No "back to home" after finishing, no onboarding, fonts/colors lack personality. *(WS2 + WS6)*

---

## Shared conventions (every workstream follows these)

- **Stay in your lane.** Only edit files in your workstream's **Owns** list. If you believe you need a file another workstream owns, stop and note it in your final summary instead of editing it. Per-screen styles go in that screen's own `*.css` module; do **not** add to `global.css`/`tokens.css` unless you are WS2.
- **Conventions are locked** (see [MEMORY.md](../../.claude/projects/C--Users-rodri-12-0/memory/MEMORY.md) / project memory): TypeScript only, React 19 + Vite, zustand, React Router, **Framer Motion**, Lucide, vanilla CSS tokens. Engine stays pure in `src/simulation/`. Determinism is sacred — never `Math.random()` in the sim.
- **Respect `prefers-reduced-motion`** for every animation.
- **Verify before you call it done:** `npm run typecheck` · `npm test` · `npm run build` must all be green. For UI work, verify in the browser preview (see [BUILD_STATUS.md](BUILD_STATUS.md) launch note: stale Vite servers squat 5173–5175; use `.claude/launch.json`'s strict port). Capture a screenshot of the result.
- **Keep docs living.** Update the topic doc(s) your workstream changes, and add a one-line dated entry to the project memory `History` section describing what landed + the commit.
- **Commit on a branch**, conventional-commit message, end with the `Co-Authored-By` trailer. Do not push unless the owner asks.

---

## File-ownership map (no two workstreams share a file)

| Area | Files | Owner |
|------|-------|-------|
| Data pipeline & ratings | `scripts/data/*`, `data-source/curated/*`, regenerated `public/data/*`, `docs/attributes.md` + `docs/data-strategy.md` rating sections | **WS1** |
| Design tokens / fonts / motion / team badge | `src/styles/*`, `public/fonts/*`, `src/lib/motion.ts`, `src/theme/teamColors.ts`, `src/components/TeamBadge.tsx`, `src/components/BackButton.tsx` | **WS2** |
| Player silhouette | `src/components/PlayerSilhouette.tsx` (+ its CSS) | **WS3** |
| Build + Preview screens | `src/screens/BuildPlayer.*`, `src/screens/Preview.*`, `src/components/RadarChart.tsx` | **WS4** |
| Simulate + Results + engine round field | `src/screens/Simulate.*`, `src/screens/Results.*`, `src/screens/Replay.tsx`, `src/simulation/{types,career,career.test}.ts` | **WS5** |
| Flow / nav / onboarding / Home | `src/screens/Home.*`, `src/router.tsx`, `src/components/Onboarding.tsx` | **WS6** |
| Franchise strength & trajectory | `data-source/curated/franchises.json` (values + new fields), `scripts/data/build.ts` (emit new fields), `src/simulation/{types,career,career.test}.ts` (drift model), `docs/simulation-engine.md` | **WS7** |

`src/store/gameStore.ts` and `src/types/index.ts` are read-only for everyone here (no changes needed). If a workstream thinks it needs to change them, flag it rather than editing.

> **WS7 file overlap — must sequence, not parallelize.** WS7 touches `scripts/data/build.ts` (owned by WS1) and `src/simulation/{types,career,career.test}.ts` (owned by WS5). It therefore runs in **Wave C, after WS1 and WS5 have merged**, inheriting their changes. (If you want the *base-value regrounding* sooner while WS1 is still open, hand that data-only sub-task to the live WS1 chat — it already owns `franchises.json` + `build.ts` — and leave the engine trajectory model to WS7.)

---

## Sequencing (recommended waves; all are independent enough to overlap)

- **Wave A — leaves, start anytime, fully parallel:** **WS1** (data, touches no UI) and **WS2** (design foundation) and **WS3** (silhouette component).
- **Wave B — screen integrators, consume Wave A primitives:** **WS4**, **WS5**, **WS6**.
- **Wave C — depends on Wave A/B files:** **WS7** (franchise model) — runs after WS1 + WS5 merge because it shares their files.

Wave B chats *can* start before Wave A merges by stubbing the documented import APIs (a local placeholder matching the named export), but it's smoother to let WS2/WS3 land their new files first since they're additive and low-conflict.

---

# Workstreams

Each section is self-contained. The owner pastes the matching launcher prompt (see end of doc) into a fresh chat.

## WS1 — Rating accuracy & data fidelity

**Goal:** make the 9 ratings credible. Shooting must measure *shooting touch*, not scoring volume. Height and athleticism must stop mis-rating obvious cases.

**Read first:** [docs/data-strategy.md](data-strategy.md) (§Rating Generation, §Curated Overrides), [docs/attributes.md](attributes.md). Then study [scripts/data/build.ts](../scripts/data/build.ts) (rating formulas live at ~lines 246–283) and [scripts/data/util.ts](../scripts/data/util.ts).

**The raw columns you can use (already cached in `data-source/raw/`):**
- Historical `nbaNew.csv` (1950–2017): `TS%`, `3PAr`, `FTr`, `eFG%`, `3P`, `3PA`, `3P%`, `2P%`, `FG%`, `FT`, `FTA`, `FT%`, `USG%`, advanced (`BPM`, `WS`, `VORP`, etc.). **3PT + FT data exist for 1980+ here and are currently unused.**
- Modern `brescou_traditional_rs.csv` (2018+): `FG3M`, `FG3A`, `FG3_PCT`, `FT_PCT`, `FG_PCT` (compute `eFG = (FGM + 0.5·FG3M)/FGA`).
- `brescou_player_index.csv`: real `HEIGHT`, `WEIGHT`, `POSITION`, `PERSON_ID`.

**Do:**
1. **Shooting** — rebuild as an efficiency/touch metric, era-aware:
   - 1980+ players: blend 3P% (efficiency) + 3PT volume (`3PAr` or `FG3A`-rank) + **FT% (the best cross-era touch proxy)** + `eFG%`/`TS%`. Demote raw PPG to a small or zero weight.
   - Pre-1980 players: fall back to FT% + TS%/eFG% + era-relative scoring rank, keep `confidence: medium` (already flagged). 
   - Sanity targets: snipers (Curry, Reggie Miller, Klay, Dirk, Allen) top the scale; high-volume non-shooters (Shaq, Wilt, prime Giannis, Ben Wallace) land mid/low. **Verify Shaq's shooting drops.**
2. **Height** — use real `HEIGHT` wherever present; fix the estimated-height path (pre-1996 bigs default to position height and under-rate). Re-tune the inches→0-99 map so legit 7-footers reliably land ~88+ and 6'0" guards ~55-60. Keep `confidence: low` when estimated. Consider pulling more real heights / a small curated heights file if coverage is thin.
3. **Athleticism** — box stats are a weak proxy (current `steals+blocks+ORB` rewards slow shot-blockers). Rebuild as a **height-adjusted explosiveness/quickness** signal, then lock the top tier with curation:
   - **Steals** (lateral quickness / hands / anticipation) — strong positive.
   - **Height-adjusted blocks** — credit blocks *above what the player's height predicts*, so a 6'6" shot-blocker reads athletic but a 7'2" stationary rim-protector does not. (Raw blocks currently over-credit tall, slow bigs — the bug you saw.)
   - **Free-throw rate** (`FTr` historical / `FTA`-rank modern) — getting to the rim / drawing contact = slashing explosiveness.
   - **Offensive-rebound rate** — second-jump motor and leaping.
   - **De-weight raw blocks and raw rebounds.** Cap the inflation that lets plodders score high.
   - **Note for the owner:** *dunk counts are NOT in either dataset* (`nbaNew.csv` / Brescou traditional have no dunk column), so dunks can only enter via curated overrides — not a formula input.
   - **Curated overrides** lock the elite tier and known non-athletes, because no box stat captures a 44" vertical: push up canonical athletes (Westbrook, prime LeBron, Vince Carter, D-Rose, Ja, Zion, MJ, Dr. J, Giannis, Wilt) and pull down slow-footed bigs/pure shooters. `>90` athleticism requires an evidence note per the data-strategy rules.
4. **Curated overrides** — add a batch in `data-source/curated/overrides.json`. Every override >5 pts needs a `reason`; every rating >95 needs an evidence note. This is also next-upgrades item #10.
5. Regenerate (`npm run data`), then **re-run the Monte Carlo difficulty bands** in `career.test.ts` — OVR distribution will shift because Shooting is 20% of OVR. Keep the ~22% / ~6.5% / ~0.3% targets (adjust the test's tolerance only if the owner-approved formula genuinely moves them, and say so).

**Don't:** touch any `src/screens/*`, `src/components/*`, or styles. Don't break determinism or the schema/invariant validators.

**Acceptance:** `npm run data` rebuilds cleanly; validators pass; spot-checks (Shaq shooting down, Curry/Reggie high, true centers height 88+, plodders athleticism down) confirmed and listed in the summary; `npm run typecheck && npm test && npm run build` green; docs + memory updated.

---

## WS2 — Design system foundation (fonts, tokens, motion, team badge)

**Goal:** the shared visual + motion vocabulary every screen consumes. Make the app stop looking like system-font default.

**Read first:** [docs/visual-design.md](visual-design.md) (palette, typography, motion table), [src/styles/tokens.css](../src/styles/tokens.css), [src/styles/global.css](../src/styles/global.css).

**Do:**
1. **Fonts:** self-host Clash Display + Satoshi (Fontshare, woff2) + JetBrains Mono into `public/fonts/`; create `src/styles/fonts.css` with `@font-face` (use `font-display: swap`); import it in `main.tsx`. Confirm the existing token references resolve.
2. **Tokens:** keep the dark-OLED-gold direction but add the personality the owner wants — refine the palette (e.g. a secondary accent, win/loss tints, surface gradients), add type-scale + motion-duration/easing tokens. Document each new token.
3. **Motion primitives:** `src/lib/motion.ts` — reusable Framer Motion variants (page transition, slot-machine roll easing, card reveal, gold-burst) + a `prefers-reduced-motion` helper. Screen workstreams import these so motion stays consistent.
4. **`src/theme/teamColors.ts`:** a map of all 30 franchise ids → `{ primary, secondary, text }` official colors. Keyed by the franchise `id` used in `public/data/franchises.json` (match exactly).
5. **`src/components/TeamBadge.tsx`:** colors-+-abbreviation badge (sizes: sm/md/lg), reads `teamColors`. This is the team-identity primitive WS4/WS5 use everywhere.
6. **`src/components/BackButton.tsx`:** a shared, accessible back/home control WS6 and others reuse.

**Don't:** edit any `src/screens/*` or the silhouette. Keep new shared CSS classes minimal and documented so screen modules can rely on them.

**Acceptance:** fonts visibly load in the preview; `TeamBadge` renders for a sample of franchises with correct colors; motion variants exported with types; typecheck/test/build green; visual-design.md updated with the final palette/type tokens; screenshot in summary.

---

## WS3 — Player silhouette centerpiece

**Goal:** the premium animated SVG figure — the game's signature design — as a reusable, self-contained component.

**Read first:** [docs/visual-design.md](visual-design.md) (§Signature Design Elements — the build-up silhouette spec), [docs/results-screen.md](results-screen.md) (avatar usage). Check `references/82-0.png` / `references/7-0.png` for the bar these games set.

**Do:**
1. Build `src/components/PlayerSilhouette.tsx` (+ CSS): a hand-crafted, premium dark basketball-player SVG (not clip-art). It must read as high-end on a true-black background.
2. **8 attribute zones** map to body regions (per visual-design.md): Shooting → shooting arm/hands, Height → overall scale, Athleticism → legs, Defense → stance/wingspan, Rebounding → torso/arms-up, Playmaking → off-hand, IQ → head/aura, Clutch → glow/heartbeat. Each zone lights up with intensity proportional to that attribute's rating.
3. **Documented prop API** so screens integrate without coupling, e.g.:
   ```ts
   interface PlayerSilhouetteProps {
     filled: Partial<Record<RatingCategory, number>>; // category -> 0-99 rating; absent = unlit
     mode: 'building' | 'complete' | 'poster';        // building animates each new fill; poster is static for screenshots
     size?: 'sm' | 'md' | 'lg';
   }
   ```
4. **Animation:** each newly-filled zone animates in (glow/draw-on) using WS2's motion primitives; `complete` shows all lit; `poster` is a static, screenshot-safe frame. Respect `prefers-reduced-motion`.

**Don't:** edit any screen. Ship it as a pure component with a small demo/Storybook-style harness or a note on how to preview it.

**Acceptance:** component renders at all three modes; zones light by rating; animation smooth + reduced-motion safe; prop API documented in the file header; typecheck/test/build green; screenshot of `building` and `poster` modes in summary.

---

## WS4 — Build + Preview screen redesign

**Goal:** make rolling and assembling feel premium — slot-machine motion, page transitions, team identity, the silhouette building up live.

**Read first:** [docs/visual-design.md](visual-design.md) (Screens 2 & 3), [docs/attributes.md](attributes.md) (difficulty-gated visibility — must be preserved), current [src/screens/BuildPlayer.tsx](../src/screens/BuildPlayer.tsx) + [src/screens/Preview.tsx](../src/screens/Preview.tsx).

**Consumes (import, don't reimplement):** WS2 `motion.ts` / `TeamBadge` / fonts / tokens; WS3 `PlayerSilhouette`. If those aren't merged yet, stub the named exports locally and reconcile on merge.

**Do:**
1. **Roll phase:** dual slot-machine animation for franchise + decade with momentum easing; team shown via `TeamBadge`; polished, tappable player pick cards with the difficulty-gated info (Easy/Normal/Hard) intact.
2. **Live silhouette:** mount `PlayerSilhouette` in `building` mode; each assignment lights its zone; show running OVR.
3. **Page transitions** between roll states and into Preview using WS2 variants.
4. **Preview:** premium layout — polish `RadarChart`, durability "fuel" bar, Built-With with headshots + `TeamBadge`, the assembled silhouette in `complete` mode, prominent OVR, Simulate CTA.

**Don't:** change the build mechanic, the store, or engine. Keep all styles in `BuildPlayer.css` / `Preview.css`.

**Acceptance:** roll feels like a slot machine; silhouette fills as you assign; difficulty modes still gate info correctly; transitions smooth + reduced-motion safe; full build flow verified in preview with a screenshot; typecheck/test/build green.

---

## WS5 — Simulate + Results redesign (the money shot)

**Goal:** the emotional payoff. The sim should *feel* like a career; the results poster should be the screenshot people share.

**Read first:** [docs/results-screen.md](results-screen.md) (full layout + record book + nicknames), [docs/visual-design.md](visual-design.md) (Screens 4 & 5), [docs/simulation-engine.md](simulation-engine.md), current [src/screens/Simulate.tsx](../src/screens/Simulate.tsx) + [src/screens/Results.tsx](../src/screens/Results.tsx) + [src/simulation/types.ts](../src/simulation/types.ts).

**Consumes:** WS2 (motion, `TeamBadge`, tokens, fonts), WS3 (`PlayerSilhouette` in `poster` mode).

**Engine change you own (additive, non-breaking):** `SeasonResult` currently exposes `madePlayoffs` / `madeFinals` / `wonChampionship` but **not the specific round reached**, even though `career.ts` simulates 4 rounds internally. Add a field, e.g. `roundReached: 'missed' | 'firstRound' | 'confSemis' | 'confFinals' | 'finals' | 'champion'`, populate it in `career.ts`, and extend the trace-integrity test in `career.test.ts`. Team-per-season and awards already exist — team changes are derivable via `seasons[i].team !== seasons[i-1].team`.

**Do:**
1. **Simulate playback:** each season card shows the `TeamBadge` (which team you are), **round reached**, awards, and stats; a **"MOVED TO …" banner** on team changes; gold-burst + (optional) haptic pulse on each ring; pacing per visual-design.md (1.5s regular / 2.5s Finals / 3s championship); skip-to-results after season 3. Stats should linger long enough to read.
2. **Results poster (the artifact):** screenshot-safe 9:16; headline Finals record; `PlayerSilhouette` poster; nickname + legacy tier; **awards as proper SVG/badge components** (not emoji); career averages + totals shown clearly; **Finals timeline**; **Career Journey with team colors + badges and highlighted team changes / championships-by-franchise**; Records Broken; Built-With DNA; Share / Link / **Play Again + Back to Home**.
3. Ensure `Replay.tsx` still renders the redesigned `Results` correctly (it re-runs the engine and lands on the poster).

**Don't:** touch the data pipeline, the store, or other screens. Keep determinism intact — the engine field is derived from existing playoff simulation, not new RNG.

**Acceptance:** sim playback clearly shows team/round/awards per season and celebrates rings; results poster is dense, premium, screenshot-safe, and shows team identity + journey + round info; replay still works; `roundReached` covered by a test; typecheck/test/build green; screenshots of a multi-team career + a 12-0 poster in summary.

---

## WS6 — Flow, navigation & onboarding

**Goal:** close the flow gaps and give Home personality.

**Read first:** [docs/visual-design.md](visual-design.md) (Screen 1 Home), [docs/next-upgrades.md](next-upgrades.md) (#3 onboarding), current [src/screens/Home.tsx](../src/screens/Home.tsx) + [src/router.tsx](../src/router.tsx).

**Consumes:** WS2 (`BackButton`, motion, fonts, tokens), WS3 (`PlayerSilhouette` gently pulsing on Home).

**Do:**
1. **Navigation:** a consistent way back to Home from anywhere, and clear end-of-game nav (Play Again + Back to Home) — coordinate with WS5 on Results (WS5 owns the Results buttons; you own the Home target + any global nav affordance via WS2's `BackButton`). Ensure replay back-button returns Home cleanly (history seeding).
2. **Onboarding:** a 3-card "how to play" overlay (Roll → Assign → Simulate) on first visit, dismissible, remembered in `localStorage`. `src/components/Onboarding.tsx`.
3. **Home polish:** floating gold particles, gently-pulsing silhouette, premium CTA, difficulty pills with tooltips, the disabled Rewriting-History v2.0 teaser — all with WS2 fonts/motion. Inject personality (the owner wants more character).
4. **Router-level page transitions:** mount WS2's transition wrapper so route changes animate.

**Don't:** edit other screens' internals (BuildPlayer/Preview/Simulate/Results bodies belong to WS4/WS5). Touch only `Home.*`, `router.tsx`, and the new `Onboarding.tsx`.

**Acceptance:** can always get home; onboarding shows once then remembers dismissal; Home feels premium with motion; route transitions animate + reduced-motion safe; full cold-start flow verified in preview with a screenshot; typecheck/test/build green.

---

## WS7 — Franchise strength & trajectory model

**Goal:** replace the hand-guessed `baseRating2026` numbers and the purely-random per-season league drift with a principled model grounded in real standing + a market/youth trajectory. This is next-upgrades **#11**, expanded per the owner.

**Sequencing:** Wave C — run **after WS1 and WS5 merge** (you share `build.ts` with WS1 and `career.ts`/`types.ts` with WS5). Pull latest first.

**Read first:** [docs/simulation-engine.md](simulation-engine.md), [docs/data-strategy.md](data-strategy.md) (§Franchise Base Ratings Methodology, §Curated Overrides auditability rules), current [src/simulation/career.ts](../src/simulation/career.ts) (the league array + drift loop ~line 100 & ~line 118, `teamStrengthOf`, `pickDestination`), [data-source/curated/franchises.json](../data-source/curated/franchises.json), [src/simulation/types.ts](../src/simulation/types.ts) (`SimFranchise`).

**How it works today (the problem):** each franchise has one curated `baseRating2026` (eyeballed). The engine seeds `league[]` from it, then every season does `t.rating += rng.range(-4, 4)` clamped 58–95 — so every team is a random walk. No team identity, no market effect, no youth trajectory. That's the "weird team ratings" the owner saw.

**Owner-provided 2025-26 inputs (authoritative — do not invent or override; record source `lastVerified: 2026-06-07`).** Names map to franchise `id` in `franchises.json` (note `id`≠abbrev: Brooklyn→`BRK`, Phoenix→`PHO`). `Market` is the owner's desirability tier: `Good`→`large`, `Mid`→`mid`, `Bad`→`small`.

```
Team,Wins,Age,Market
Oklahoma City Thunder,64,24.53,Bad
San Antonio Spurs,62,25.20,Bad
Detroit Pistons,60,25.18,Mid
Boston Celtics,56,25.11,Good
Denver Nuggets,54,26.28,Mid
Los Angeles Lakers,53,26.35,Good
New York Knicks,53,27.23,Good
Cleveland Cavaliers,52,26.20,Mid
Houston Rockets,52,27.39,Mid
Minnesota Timberwolves,49,25.72,Mid
Toronto Raptors,46,24.71,Mid
Atlanta Hawks,46,23.79,Mid
Phoenix Suns,45,25.28,Mid
Philadelphia 76ers,45,25.76,Good
Orlando Magic,45,24.40,Bad
Charlotte Hornets,44,24.60,Bad
Miami Heat,43,25.30,Good
Portland Trail Blazers,42,25.29,Mid
Los Angeles Clippers,42,28.64,Good
Golden State Warriors,37,27.53,Good
Milwaukee Bucks,32,26.50,Bad
Chicago Bulls,31,24.60,Good
New Orleans Pelicans,26,24.30,Bad
Dallas Mavericks,26,26.35,Mid
Memphis Grizzlies,25,24.95,Bad
Sacramento Kings,22,27.27,Bad
Utah Jazz,22,25.00,Bad
Brooklyn Nets,20,23.36,Good
Indiana Pacers,19,25.21,Bad
Washington Wizards,17,23.78,Mid
```

**Do — Part A (data, edits `franchises.json` + `build.ts` emit):**
1. **Reground `baseRating2026`** on the win totals above (60–99 scale): `baseRating = round(60 + (wins − 17) / 47 × 35)` → 64 W ≈ 95, 53 W ≈ 87, 42 W ≈ 79, 17 W ≈ 60. (This is the owner-approved mapping; tweak only with a noted reason.)
2. Add two curated fields per franchise: **`marketTier`** from the `Market` column (`Good→large`, `Mid→mid`, `Bad→small`) and **`youthIndex`** (0–1, higher = younger) derived from age: `youthIndex = round2(clamp((28.7 − age) / 5.3, 0, 1))` → BKN 23.36 ≈ 1.0, LAC 28.64 ≈ 0.0.
3. Emit the new fields through `build.ts` into `public/data/franchises.json` and update the franchise schema in `data/schemas/`.

**Do — Part B (engine, edits `career.ts` + `types.ts` + `career.test.ts`):**
4. Extend `SimFranchise` with `marketTier` + `youthIndex`; thread them from `franchises.json` into the league model.
5. Replace the random drift with a **biased trajectory**: each season, `drift = randomComponent + marketBias + youthBias(careerYearsElapsed)`. Large markets get a small steady upward bias (they reload via free agency); small markets get an upward bias *only while young*, decaying toward regression as the simulated years advance (their window closes). Keep it bounded and deterministic (seeded RNG only).
6. Re-run the **Monte Carlo difficulty bands** in `career.test.ts` — team-strength changes shift title odds. Hold the ~22% / ~6.5% / ~0.3% targets; adjust tolerances only with a noted reason.

**Don't:** touch UI/screens or break determinism. Coordinate timing so WS1/WS5 are merged first.

**Acceptance:** base ratings trace to real 2025-26 wins + age (sourced); market/youth trajectory visibly makes big markets trend up and small markets youth-dependent over a career (show a couple of traces, e.g. via the `?debug=1` panel if WS5 shipped it); schema + validators pass; Monte Carlo bands held; typecheck/test/build green; `simulation-engine.md` + memory updated.

---

## Launcher prompts (paste into each fresh chat)

Each is intentionally short — the detail lives in this doc.

**WS1:**
> You're upgrading the 12-0 NBA game. Read `docs/README.md`, then `docs/V2_UPGRADE_PLAN.md` and execute **WS1 — Rating accuracy & data fidelity**. Follow the Shared Conventions and File-Ownership map in that doc; stay strictly in WS1's lane.

**WS2:**
> You're upgrading the 12-0 NBA game. Read `docs/README.md`, then `docs/V2_UPGRADE_PLAN.md` and execute **WS2 — Design system foundation**. Follow the Shared Conventions and File-Ownership map; own only WS2's files.

**WS3:**
> You're upgrading the 12-0 NBA game. Read `docs/README.md`, then `docs/V2_UPGRADE_PLAN.md` and execute **WS3 — Player silhouette centerpiece**. Follow the Shared Conventions; ship a self-contained component, don't edit screens.

**WS4:**
> You're upgrading the 12-0 NBA game. Read `docs/README.md`, then `docs/V2_UPGRADE_PLAN.md` and execute **WS4 — Build + Preview screen redesign**. Consume WS2/WS3 primitives as documented; own only WS4's files.

**WS5:**
> You're upgrading the 12-0 NBA game. Read `docs/README.md`, then `docs/V2_UPGRADE_PLAN.md` and execute **WS5 — Simulate + Results redesign**. Note the additive `roundReached` engine field you own; consume WS2/WS3; stay in WS5's lane.

**WS6:**
> You're upgrading the 12-0 NBA game. Read `docs/README.md`, then `docs/V2_UPGRADE_PLAN.md` and execute **WS6 — Flow, navigation & onboarding**. Consume WS2/WS3; own only Home, router, and Onboarding.

**WS7 (Wave C — only after WS1 + WS5 are merged):**
> You're upgrading the 12-0 NBA game. Read `docs/README.md`, then `docs/V2_UPGRADE_PLAN.md` and execute **WS7 — Franchise strength & trajectory model**. Pull latest first (you share files with WS1/WS5). The owner-provided 2025-26 wins/age/market table and conversion formulas are in the WS7 section — use them as authoritative.
