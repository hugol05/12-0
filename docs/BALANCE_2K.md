# Balance impact of the 2K ratings — and how to make 12-0 hard again

> **STATUS 2026-06-10: RESOLVED — see "§6 Resolution" at the bottom for the shipped calibration.**
> The hardening described below was implemented as a **two-axis** model (rings ← OVR, Finals losses ←
> clutch) and verified against the real pool. Keep this doc as the rationale; §6 is the current truth.

> TL;DR (original diagnosis) — switching to the 2K-style ratings made the game **~3-4× too easy**. A
> *skilled* player (just picking the best player offered each roll) now averages **11.8 championships**
> and goes **12-0 about 21%** of the time; a *perfect* build goes 12-0 **69%** of the time. The targets
> were ~5-8% and ~20%. The ratings are not the problem to fix — the **engine's difficulty constants**
> were tuned for the old compressed ratings and need recalibrating to the new, higher input
> distribution. **Do not re-deflate the 2K ratings** (we want that consensus); harden the sim instead.

## 1. What changed

The old box-score formula compressed everything into the 80s (the whole top-100 OVR spanned 89→81) and
clutch — *the* category that drives Finals wins — rarely reached the top. The 2K ratings are correctly
**separated and higher**, especially the impactful categories. In the shipped pool today:

| Category | players ≥ 90 | players ≥ 95 | max |
|----------|----:|----:|----:|
| Clutch (15% OVR, **drives Finals win %**) | 68 | 27 | 99 (11 players) |
| Playmaking | 186 | 48 | 99 |
| Rebounding | 192 | 69 | 99 |
| Shooting | 108 | 25 | 98 |
| Basketball IQ | 120 | 32 | 98 |

Because the roll hands you a *bucket* and you pick the best player in it, elite category values are now
easy to assemble. A "best-in-bucket per roll" build averages **OVR 91 / clutch 91**; the theoretical
ceiling (best of every category) is **OVR 98 / clutch 99**.

## 2. Measured impact (real engine, real pool)

Run with `BALANCE=1 npx vitest run src/simulation/_balanceProbe.test.ts` (4,000 sims each):

| Build quality | Intended 12-0 | **Current 12-0** | Avg titles | Any ring |
|---------------|:----:|:----:|:----:|:----:|
| **Perfect** (global-max each cat) | ~20% | **68.8%** | 12.00 | 100% |
| **Skilled** (best-in-bucket per roll, OVR ~91) | ~5-8% | **21.0%** | 11.79 | 100% |
| **Casual** (random pick, OVR ~68) | <1% | 0.0% | 1.13 | 50% |

The floor (casual) is fine — bad play still fails. The problem is the **middle and top collapsed**: a
thoughtful player now *almost always* wins 10-12 rings, and the only remaining challenge is whether they
drop a single Finals. The skill gradient between "good build" and "perfect build" is nearly gone.

## 3. Root cause (in `src/simulation/career.ts`)

Finals series win probability is:

```
seriesWinProb = 0.5 + (ourStrength − oppStrength) · SERIES_COEFF + clutchFinalsBonus
ourStrength   = franchiseBase · 0.4 + OVR · 0.6
```

Three constants were calibrated for the old ratings and are now too generous:

- **`clutchFinalsBonus`** (the biggest culprit): a flat **+0.18** at clutch ≥95, +0.14 at ≥90. With 68
  players now ≥90 clutch, a skilled build gets ~+0.14-0.18 *for free* every Finals.
- **`ROUND_OPP = [66, 73, 78, 82]`**: the Finals opponent baseline (82) is below a skilled build's
  strength (~88-92), so `(our − opp)·0.05` is already positive before the clutch bonus.
- **`SERIES_COEFF = 0.05`**: makes series highly deterministic, so a strength edge almost guarantees the
  sweep — there's little upset variance to ever cost a perfect run.

Net: a skilled build's Finals win prob clamps near the **0.985 ceiling** every round.

## 4. Levers to make it harder (ranked)

Ordered by leverage. **A + B, calibrated with the probe, is the recommended fix.**

### A. Recalibrate the Finals/series constants (highest leverage, smallest change)
Tune `clutchFinalsBonus`, `ROUND_OPP`, and `SERIES_COEFF` so the realized distribution hits the targets.
A verified experiment (halved clutch bonus, `ROUND_OPP = [70,77,83,88]`, `SERIES_COEFF = 0.04`) moved
Perfect 68.8%→**8.7%** and Skilled 21%→**0.3%** — that overshot (too hard), which proves the levers are
powerful and sensitive. A gentler dial lands on target, e.g. as a starting point to iterate:
- `clutchFinalsBonus`: `≥97 → +0.12, ≥92 → +0.08, ≥85 → +0.05, ≥75 → +0.02, else 0/−0.08` (raise the
  threshold for the top tier — clutch 90 should no longer be near-max).
- `ROUND_OPP`: `[68, 75, 81, 86]` (title-contender Finals opponent).
- `SERIES_COEFF`: `0.045` (a touch more upset variance).

### B. Scale the opponent to the player (rubber-band) — most future-proof
Make the late-round/Finals opponent strength a function of the player's own OVR (e.g. the strongest
league team "reloads" to within a few points of the player). Elite builds then always face elite
contenders, so the difficulty is robust to *any* future rating inflation — you never have to re-tune
when the dataset changes.

### C. Diminishing returns above 90
Apply a concave transform where it's read for win-prob: `effClutch = 90 + (clutch−90)·0.5`, similarly for
the OVR term. Since the pool now offers many 90+ values, this stops "everyone is 95+" from compounding.

### D. More playoff variance / stakes
12-0 needs 12 *consecutive* perfect Finals. Raising series variance, or adding a small playoff-injury /
"upset" roll, makes a flawless run rare again **without** lowering the casual floor much.

### E. Lower the player's share of team strength
`teamStrengthOf` is `base·0.4 + OVR·0.6`. Dropping toward `0.5/0.5` means one inflated superstar can't
single-handedly carry a weak franchise to 12 rings — team context matters more.

### F. Re-anchor the balance test to the real pool
`career.test.ts` Monte Carlo uses *synthetic uniform* ratings, so it still "passes" at 22%/6.5%/0.3% even
though real builds are far stronger. Keep `_balanceProbe.test.ts` (real pool + real engine) as the
calibration source of truth and tune A/B against it.

## 5. Recommendation

1. Keep the 2K ratings exactly as they are (consensus is the point).
2. Implement **A + B**, calibrated with the probe to: Perfect ~20%, Skilled ~5-8%, Casual <1%.
3. Re-run `_balanceProbe.test.ts` until the bands hold, then update the synthetic targets in
   `career.test.ts` (and `docs/simulation-engine.md` difficulty section) to match.

Difficulty modes (Easy/Normal/Hard) are intentionally information-only and are **not** a lever here — they
must not change the sim (locked convention). The hardening lives entirely in the engine constants above.

---

## 6. Resolution (shipped 2026-06-10)

The hardening landed as a **two-axis difficulty model** in `src/simulation/career.ts`, calibrated
against the real pool with `_balanceProbe.test.ts` (now reports the named-build + play-tier scenarios
below). The owner's design intent, in one line each:

- **Total rings ← OVR.** Reaching the Finals (3 wins vs strong, near-peer fields) is the OVR-gated
  grind. A ~92-OVR build reaches the Finals about half its prime years (~7 rings); a god build nearly
  every year. This is why a 92 should average ~7 rings, not run to 12.
- **Finals losses (12-0 vs 12-X) ← clutch, steeply.** The Finals is rubber-banded to a near-peer
  opponent and decided almost entirely by clutch. A 90-95 clutch career still drops **1-3 Finals**;
  only **97+ clutch** stays loss-free. A true 12-0 therefore needs a *god build* (elite everything
  **and** ~99 clutch).

### Constants (career.ts)
- `SERIES_COEFF = 0.045`
- `ROUND_OPP = [82, 85, 88, 86]` (R1, R2, ConfFinals, Finals baseline — high on purpose)
- `ROUND_RUBBER_GAP = [∞, ∞, ∞, 3]` — only the **Finals** floats up to within 3 of the player's
  strength, so deep runs are decided by clutch, not an inflated strength edge (future-proof to rating
  inflation).
- `clutchFinalsBonus`: `99→+.50, 97→+.40, 95→+.27, 93→+.20, 90→+.15, 87→+.08, 83→0, 78→−.08,
  72→−.16, else −.24` (CF gets half this). Series prob clamps at `0.99`.
- `winsFromStrength = 50 + 14·tanh((strength−82)/14) + U(−7,7) + raresBonus` (10% chance of
  `U(0, clamp((strength−78)/1.8, 0, 12))`) — smooth, no hard cap, **and no floor of 70 for
  champions** (updated 2026-06-10 from an earlier `42 + 36·tanh(...)` curve that still skewed
  champion seasons into the 70s). Real-pool measurement: champion seasons average **~56-60 wins**
  across every build quality (from a 94-OVR build to a god build) — matching real NBA title teams
  that win in the 50s/low-60s. **70-win seasons are an elite outlier (~0.5-1.6% of seasons)**, 72+
  rarer (~0.1-0.9%), and 76-78 only appear for god-tier builds on a hot-streak roll (≤0.1%).

### Measured (4,000 sims each, real pool)
| Scenario | avg rings | reach 12 | 12-0 | avg Finals losses |
|---|--:|--:|--:|--:|
| Owner 94-OVR build (clutch 95) | 9.4 | 28% | **11%** | 1.2 |
| God build (elite + clutch 99) | 12.0 | 99.6% | **87%** | 0.14 |
| Optimal play (best-in-bucket, OVR ~92) | 7.5 | 24% | 15% | 1.5 |
| Average / bad play | ~0 | 0% | 0% | — |

Targets were: 94-OVR ~8-11 rings / 0-5 losses / 12-0 ~1-in-7; god ~90% 12-0; optimal ~20% reach 12 /
~7 rings. All within tolerance. (Note: *optimal play maxes clutch to 99*, so its 12-0 rate — 15% —
runs a bit above the owner's 8% estimate; reaching 12 at all is the limiter. Re-tune `ROUND_OPP` up a
point if a harder reach-the-Finals grind is wanted.) The synthetic uniform-rating bands in
`career.test.ts` were re-anchored to this calibration (uniform builds are intentionally far harder than
real, clutch-stacked builds).
