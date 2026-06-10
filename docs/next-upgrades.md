# 12-0 — Next Upgrades

> **Engineering upgrade backlog** for after the v1.0 core (build → simulate → results → share) is complete and verified.
> This is the *technical* companion to [roadmap.md](roadmap.md) (which owns the *product/social* phasing). When an item ships, move it to [BUILD_STATUS.md](BUILD_STATUS.md).

Each item lists **why it matters** and a **rough effort** (S = hours, M = a day, L = multi-day). Ordered roughly by virality-per-effort.

---

## Tier 1 — Ship polish (highest leverage for a viral launch)

### 1. Share-as-image + Open Graph cards — **L**
Links replay correctly, but a pasted link in iMessage/Discord/X shows no preview. Render the legacy poster to a PNG (html-to-canvas or a serverless OG endpoint) and emit `og:image` / `twitter:card` meta per share. This is the single biggest multiplier on organic sharing — a poster image travels where a bare URL doesn't.
- Static `og:` defaults in `index.html` now; dynamic per-result image via a Vercel OG function keyed off the `?b=` code later.

### 2. Motion & "championship moment" feedback — **M**
Wire Framer Motion (already in the stack) for screen transitions, the slot-machine roll easing, and a gold-burst + haptic pulse on each ring won during Simulate. The sim is the emotional peak; right now it's functional but flat. Respect `prefers-reduced-motion`.

### 3. First-run onboarding & empty states — **S**
A 3-card "how to play" overlay on first visit (Roll → Assign → Simulate), dismissible and remembered in localStorage. New players currently land mid-mechanic with no explanation.

### 4. Result analytics — **S**
Privacy-light event counters (build started, sim completed, share clicked, replay opened, 12-0 achieved) via a thin endpoint or Vercel Analytics. We need to know the real 12-0 rate and the share→replay funnel to tune difficulty and copy.

---

## Tier 2 — Depth & retention

### 5. Daily Challenge — **M**
Same seeded rolls for everyone each UTC day; compare records with friends. The infra already supports it (seeded RNG + deterministic engine) — needs a date→seed function, a "today" route, and a daily result card. High retention-per-effort; listed in roadmap.md v1.5.

### 6. Leaderboard — **L**
"Best record / highest OVR / longest dynasty." Start with a localStorage personal-best wall, then a backend (Vercel KV or Supabase) for global boards. Pairs naturally with Daily Challenge and the share funnel.

### 7. Rewriting History mode (v1.5) — **L**
The disabled Home teaser. Drop the built player into a historical league context. Largest engine surface-area change — needs era-scoped opponents and a different framing of "the record."

### 8. Build comparison / "vs." replays — **M**
Given two share codes, run both and show a side-by-side poster. Turns the share link into a challenge primitive ("beat my 9-3").

---

## Tier 3 — Engine & data fidelity

### 9. Trace/debug inspector — **S**
The engine already stores intermediate values (season OVR, team rating, playoff odds, injury rolls). Surface them behind a `?debug=1` panel on Results for tuning and trust. Low effort, high tuning value.

### 10. Curated rating overrides, batched by era — **M (ongoing)**
`data-source/curated/overrides.json` is wired but nearly empty. Audit marquee legends where the era-aware formula under/over-rates (pre-1973 defense, pre-1980 shooting range, clutch extremes). Each >5-pt override needs a `reason`; >95 needs an evidence note. Raises perceived accuracy, which is the credibility backbone of the game.

### 11. 2026 franchise base ratings — **S**
`franchises.json` base ratings are derived, not hand-curated (MASTER_PLAN open question #2). Hand-set 65–90 per team from current standings/projections so "Started on the …" carries real weight.

### 12. Monte Carlo CI guard — **S**
Promote `_balanceProbe.test.ts` (currently on-demand, `BALANCE=1`) to a nightly/slow CI job that
fails if the named-build/play-tier 12-0 rates drift out of the calibrated bands (94-OVR ~5%,
optimal ~10%, god build ~86% — see [BALANCE_2K.md §6](BALANCE_2K.md)) after data or formula
changes. Also keep the synthetic uniform bands in `career.test.ts` monotonic as a fast guard.

---

## Tier 4 — Platform & quality

### 13. Accessibility pass — **M**
Keyboard navigation through the roll/assign flow, focus traps on the bottom sheet, ARIA labels on the radar and stat rows, color-contrast audit on the gold-on-black palette, screen-reader text for emoji tags (🏆/F/P).

### 14. Performance budget — **S**
`players.json` is 2.8 MB and lazy-fetched (good). Add a roll-index-only fast path so the build screen renders before the full player file lands, and consider splitting players by decade for incremental fetch. Track a Lighthouse/Web-Vitals budget in CI.

### 15. Offline & install hardening — **S**
PWA is configured; verify the full offline flow (DevTools offline → cold load → complete a build → simulate) and add an install prompt + iOS "add to home screen" hint. Confirm the runtime `/data/` CacheFirst rule survives a `dataVersion` bump (cache-bust on manifest change).

### 16. Error boundaries & resilient loads — **S**
Wrap lazy routes in an error boundary with a "data failed to load — retry" state. Today a failed `public/data` fetch silently strands the user. Add a dataVersion-mismatch fallback poster for stale share links (the archived-result path hinted in MASTER_PLAN).

---

## Quick wins (do anytime, < 1 hr each)
- Add `og:`/`twitter:` static meta to `index.html` (precursor to #1).
- "Copied!" toast already exists on Share — add the same on a dedicated "Copy link" button for desktop.
- Seed the share URL into `history` so back-button from a replay returns home cleanly.
- Surface `ratingMeta.confidence` as a subtle "est." badge on low-confidence historical ratings in Preview.
- Add `npm run preview` (vite preview) to package scripts for prod-bundle smoke checks.
