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
- `winsFromStrength = 50 + 14·tanh((strength−82)/14) + U(−7,7) + hotBonus` — smooth, no hard cap,
  and no floor of 70 for champions. **`hotBonus`** (updated 2026-06-10, round 2) is a "career year"
  whose chance AND ceiling both scale with strength: `hotChance = clamp((strength−86)/7, 0, 1)`,
  `hotCeiling = clamp((strength−87)·1.2, 0, 12)`, `bonus = U(0, hotCeiling)` when triggered. Tuned
  empirically against the *real* strength distributions a career actually visits (most mass sits
  well below the build's peak strength because of aging/franchise drift), via
  `_balanceProbe.test.ts`'s win-tail output. Real-pool measurement: champion seasons average
  **~56-65 wins** across every build quality — matching real NBA title teams in the 50s/low-60s.
  - **94-OVR build (clutch 95): 70-win seasons ~3%** of all seasons (≈1-in-3 careers of 20 seasons)
    — exactly the owner's "70 should be elite for a strong-but-not-god build" target.
  - **God build (98-OVR/99 clutch): 70+ win seasons ~15%** (a few per career, ~2.4 of ~16.4
    seasons), and **74+ ("breaking 73-9") ~4%** per season → **≈50% chance of doing it at least
    once across a career** — exactly the owner's god-build target.

### Durability rewrite (2026-06-10, round 2)
Replaced the old discrete `retirementAge` buckets (90+→39, hard-capped at +2) with a
**piecewise-linear durability → years-in-league curve**, anchored to the owner's spec: 87→15,
89→16, 91→17, 95→18, 96→19, 98→20, 99→22 (with `±1` year variance). This **shortens careers
substantially** for sub-95 durability builds (e.g. 90 durability: ~39-43yr cap → ~16-17yr), which
is correct/intended (a 23-season NBA career was never realistic) but has a side effect: builds that
need many seasons to rack up 12 rings now have noticeably fewer "shots". `shouldRetire` was
simplified to `age >= retireAge` (+ TITLE_CAP / 11-rings exceptions, + a 35% early-retirement
chance on a season-ending injury within 2 years of `retireAge`).

### Measured (4,000 sims each, real pool, AFTER both the win-curve and durability changes)
| Scenario | avgSeasons | avg rings | reach 12 | 12-0 | avg Finals losses |
|---|--:|--:|--:|--:|--:|
| Owner 94-OVR build (clutch 95, durability 90 → ~17yr career) | 17.2 | 7.7 | 8.9% | **5.0%** | 0.95 |
| God build (elite + clutch 99, durability 97 → ~19.5yr cap, but TITLE_CAP ends it sooner) | 16.3 | 12.0 | 98.5% | **86.2%** | 0.13 |
| Optimal play (best-in-bucket, OVR ~92) | 17.9 | 6.4 | 13.3% | 9.7% | 1.20 |
| Average / bad play | 8.9-12.0 | ~0 | 0% | 0% | — |

### Pipeline durability re-derivation (2026-06-10, round 3)
Real players' Durability rating (`public/data/players.json`) is now derived from each player's
actual `seasonsPlayed` via `durabilityFromYears`'s inverse, `durabilityFromYears` (shared module
`src/simulation/durability.ts`), instead of 2K's `overall_durability` injury-resistance stat —
so durability **correlates with real career length** across the whole pool (give your build
LeBron's durability and you get a ~LeBron-length career). Re-ran `_balanceProbe.test.ts` after
regenerating `public/data/*.json`: results are essentially unchanged from the round-2 table above
(94-OVR build avgSeasons 17.2/avg rings 7.74/12-0 5.0%; god build avgSeasons 16.3/12-0 86.2%;
optimal play avgSeasons 17.3/12-0 10.3%) — the pool-wide durability shuffle didn't move the
calibrated bands. See `docs/data-strategy.md` "Durability (all players)" for the formula.

### Age-weighted team-carry (2026-06-10, round 4)
**Problem reported:** landing on a real contender felt irrelevant early — `teamStrengthOf` was a flat
`base·0.4 + OVR·0.6`, so a still-**developing** player (age 19-22 plays at only 82-92% of peak OVR)
dragged even a 60-win franchise down to ~.500 and lost in the first round. The team never got to
"carry" a young star, which is exactly when a stacked roster *should*.

**Fix:** the franchise share of team strength is now **age-weighted** — `franchiseWeightForAge(age) =
lerp(0.64, 0.40, (age−19)/(26−19))`, clamped to `[0.40, 0.64]`. While you're developing (≤ age ~25)
the existing roster carries more; by your prime (age 26+) it's back to the calibrated 0.40/0.60
(player-heavy). Purely youth-driven, so the bad-build floor is untouched (a weak build in its prime
still sits at 0.40 franchise weight).

| Scenario | avg rings | reach 12 | 12-0 | avg wins (champ seasons) |
|---|--:|--:|--:|--:|
| Owner 94-OVR build (clutch 95) | 7.7 → **8.25** | 8.9% → **14.4%** | 5.0% → **7.2%** | ~61 |
| God build (clutch 99) | 12.0 → **11.96** | ~98.5% → **98.6%** | 86.2% → **87.3%** | ~64 |
| Perfect (global-max) | — | — | ~88% → **89.1%** | ~64 |
| Optimal play (OVR ~92) | 6.4 → **6.92** | 13.3% → **19.5%** | 9.7% → **13.4%** | ~60 |
| Average / bad play | ~0 | 0% | **0%** | — |

So builds that land on good teams early collect modestly more rings (the team carries them through
development — the reported gap), while the **god-build/perfect ceiling and the bad-play floor are
unchanged** and champion seasons still average a real-NBA-like ~60-64 wins. Tunables live at the top
of `career.ts`: `FRANCHISE_WEIGHT_YOUNG` (0.64), `FRANCHISE_WEIGHT_PRIME` (0.40),
`FRANCHISE_CARRY_UNTIL_AGE` (26).

**Note:** the owner 94-OVR build's avg rings/12-0 dropped from the prior calibration (9.4/28%/11%
→ 7.7/8.9%/5.0%) purely because its career is now ~6 seasons shorter (22.9 → 17.2) — the
*per-season* ring rate is essentially unchanged (41% → 45%). The god build (whose career length is
governed by `TITLE_CAP`, not `retireAge`) is unaffected. If the owner wants the 94-OVR build's
*total* rings/12-0 numbers restored to the prior ~9.4/28%/11% despite the shorter, more-realistic
career, the lever is `ROUND_OPP`/`clutchFinalsBonus` (raise the per-season title odds) — not
revisited here since it wasn't part of this round's request and risks pushing the god build above
its calibrated 86-87% 12-0. The synthetic uniform-rating bands in `career.test.ts` were re-anchored
(`uniform-95` 12-0 floor lowered 0.05→0.035) to reflect the shorter careers.
