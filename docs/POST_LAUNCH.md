# 12-0 — Post-Launch Roadmap

> **What to build after the v1.0 launch**, in priority order. This is the *current*
> living priority list and supersedes the older [next-upgrades.md](next-upgrades.md)
> (kept as the deeper engineering backlog). Product/social phasing lives in
> [roadmap.md](roadmap.md); the launch go-to-market plan is [LAUNCH.md](LAUNCH.md).
>
> Effort key: **S** = hours · **M** = a day · **L** = multi-day.

---

## ✅ Shipped in the launch-prep pass (2026-06-10)

So the backlog below isn't muddied by done work:

- **Share-as-image** — canvas-rendered 4:5 career card (`src/share/shareImage.ts`),
  replacing the flaky `html-to-image` snapshot that rendered half-black on mobile.
- **Open Graph / Twitter cards** — static `og:*`/`twitter:*` meta + `public/og.png`
  (1200×630) in `index.html`, so a pasted `12-0.me` link shows a real preview.
- **One-tap "Tweet result"** button on Results (`twitter.com/intent/tweet`, pre-filled
  with the record + replay link).
- **Vercel Web Analytics** (`@vercel/analytics`).
- **Branded loading screen** (was a black flash on Home→Build).
- **Home-button confirmation** so a stray tap can't nuke an in-progress build.
- **Reload/deep-link hardening** — `useStoreHydrated()` gate so /preview & /simulate
  don't bounce to /build before persist rehydrates.
- **Build screen compacting** + higher-contrast swap buttons.

---

## Tier 1 — First-wave retention & sharing (do next)

### 1. Daily Challenge — **M**
*The single best "come back tomorrow" hook, and the infra already exists* (seeded RNG +
deterministic engine). Everyone gets the **same rolls each UTC day**; you build, sim, and
compare records with friends.
- Needs: a `date → seed` function, a `/daily` route that locks the day's roll sequence, a
  "today's result" card, and a one-attempt-per-day guard in localStorage.
- Pairs with the share loop: "Here's my daily — beat it" is a cleaner challenge than a random build.
- Listed in [roadmap.md](roadmap.md) under v1.5.

### 2. A demo GIF / short video of one full loop — **S** (asset, not code)
Not a feature, but the **highest-leverage launch asset** — motion posts massively outperform
static ones on X/Reddit. Record one clean 10–15s loop (roll → place → simulate → 12-0 poster),
first frame = the finished poster. Reuse it in the launch tweet, Show HN, and Reddit. See
[LAUNCH.md §1](LAUNCH.md).

### 3. "Vs." / challenge replays — **M**
Given two share codes, run both and show a side-by-side poster ("my 12-0 vs your 9-3"). Turns the
existing replay link into a challenge primitive — the natural viral mechanic after daily.

### 4. Leaderboard (localStorage first) — **M→L**
A personal-best wall ("best record / highest OVR / longest dynasty") in localStorage now; a backend
board (Supabase / Vercel KV) later. Pairs with Daily Challenge and the share funnel. (v1.5 →
backend in v2.0.)

---

## Tier 2 — Depth & credibility

### 5. Per-result dynamic OG image — **M**
Right now every link shares the *same* static `og.png`. A Vercel OG function keyed off the `?b=`
code would render *that player's* card as the link preview — so a shared replay shows the actual
12-0 poster, not a generic one. Big multiplier on the replay-link share path.

### 6. Curated rating overrides, batched by era — **M (ongoing)**
`data-source/curated/overrides.json` is wired but thin. Audit marquee legends where the era-aware
formula under/over-rates (pre-1973 defense, pre-1980 shooting range, clutch extremes). Perceived
accuracy is the credibility backbone — every wrong-looking rating is a "this game is broken" reply.
(Feedback already routes to hglabs.studio@gmail.com via the footer.)

### 7. Trace/debug inspector (`?debug=1`) — **S**
The engine stores intermediate values (season OVR, team rating, playoff odds, injury rolls). Surface
them behind a query flag on Results for tuning + trust.

### 8. Monte Carlo CI guard — **S**
Promote `_balanceProbe.test.ts` (`BALANCE=1`) to a slow/nightly CI job that fails if the 12-0 rates
drift out of the calibrated bands after data/formula changes. See [BALANCE_2K.md §6](BALANCE_2K.md).

---

## Tier 3 — Big modes (v2.0)

### 9. Rewriting History mode — **L** (v2.0)
> **Status:** the disabled Home teaser. **Repositioned v1.5 → v2.0 on 2026-06-10** (per owner) —
> it's the largest engine surface-area change, so it ships after the social layer.

**What it is:** instead of New Chapter (career starts 2026-27 on current rosters and the future is
fully simulated), the player drops into the **rolled decade** and **real NBA history plays out
around them** — you're inserting a created superstar into, say, the 1990s and seeing whether they
can rewrite the record books against the actual league of that era.

**Why it's a v2.0-sized lift (design notes for whoever picks it up):**
- **Era-scoped opponents & league strength.** Team strength, playoff fields, and the Finals
  opponent must come from the *historical* league of the active decade, not the 2026 franchise
  model. Needs per-era franchise ratings (we only hand-tune 2026 today).
- **Real history as a backdrop.** Decide how much actual history is fixed vs. displaced — do real
  dynasties still happen, or does the created player overwrite them? Cleanest v1 of the mode:
  the player's *team* results are simulated, real league context (rivals, era pace/scoring) just
  flavors stats and framing.
- **A different framing of "the record."** "12-0" still anchors, but era stat baselines differ
  (90s defense vs. 2010s pace), so career-total comparisons need era normalization to stay fair.
- **Aging across a fixed timeline.** The career must fit inside the chosen era's window, interacting
  with the durability/retirement model.
- **Determinism preserved.** Same build + dataVersion + seed ⇒ identical history (the locked
  convention still holds).

Start with a **read-only historical backdrop** (player's results simulated, history just contextual)
before attempting true "rewriting" where the created star displaces real championships.

### 10. Backend leaderboard + head-to-head + run history — **L** (v2.0)
Global boards, async head-to-head, and a saved profile of past runs. Requires the first real
backend (Supabase / Vercel KV). See [roadmap.md](roadmap.md) v2.0.

---

## Open pre-launch nits (cheap, do before/with launch)
- **Verify OG render** by pasting `12-0.me` into X/Discord/iMessage after deploy (cache may need a
  scrape via X's Card Validator).
- **iOS "add to home screen"** hint + confirm the full offline PWA flow (DevTools offline → cold
  load → build → simulate).
- **Error boundary** on lazy routes with a "data failed — retry" state (today a failed `public/data`
  fetch silently strands the user).

---

*See [next-upgrades.md](next-upgrades.md) for the deeper engineering backlog (accessibility,
performance budget, offline hardening, franchise base-rating curation) — still valid, just lower
priority than the retention/sharing items above.*
