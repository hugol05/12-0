# Nicknames & Archetypes

How the game names your assembled player. Two distinct labels are generated, both
purely from the build (no randomness beyond a single seeded tiebreak), so the same
build always reads the same way.

| Label | Example | Where it shows | Source |
|-------|---------|----------------|--------|
| **Archetype** | `Sharpshooting Floor General` | Preview header, Results poster | `buildArchetype()` |
| **Nickname** | `"The Sniper"` | Results poster (top line) | `nickname()` |

Both live in [`src/lib/archetype.ts`](../src/lib/archetype.ts).

> Note: the **legacy tier** (e.g. "Mercenary King", "Russell Breaker") is a *separate*
> label produced by the simulation engine in `src/simulation/career.ts` — see
> [simulation-engine.md](simulation-engine.md). It is no longer printed on the poster.

---

## Inputs

- `filled`: the 0–99 rating assigned to each category.
- `heightInches`: the real listed height of the player placed in the **Height** category
  (height is never shown as a 0–99 number; it folds into the labels instead).
- `seed`: the run's RNG seed (used only to pick among equally-fitting nicknames).
- `perfect`: whether the career went a perfect 12-0.

**Skill categories** (the ones that define identity): `shooting`, `playmaking`,
`defense`, `rebounding`, `athleticism`, `basketballIq`, `clutch`. Height and
Durability are *not* skills — height feeds the size bucket, durability is ignored here.

**Size buckets** (from `heightInches`):

| Size | Height |
|------|--------|
| Guard | < 6'2" |
| Wing | 6'2"–6'6" |
| Forward | 6'7"–6'10" |
| Big | ≥ 6'11" |

If no height is known, the player is treated as a **Wing**.

---

## Archetype — `buildArchetype()`

1. Rank the 7 skills high→low.
2. **Elite shortcuts** (checked first):
   - 6+ skills ≥ 90 → `Demigod`
   - 4+ skills ≥ 87 → `All-Around Star`
3. Otherwise take the **top skill** and map it to a size-aware **core name**:

| Top skill | Guard | Wing | Forward | Big |
|-----------|-------|------|---------|-----|
| Shooting | Sharpshooter | Sharpshooter | Sharpshooter | Stretch Big |
| Playmaking | Floor General | Point Forward | Point Forward | Point Center |
| Defense | Perimeter Lockdown | Perimeter Lockdown | Defensive Anchor | Defensive Anchor |
| Rebounding | Glass Cleaner | Glass Cleaner | Paint Beast | Paint Beast |
| Athleticism | Slasher | Slasher | Aerial Finisher | Rim Runner |
| Clutch | Shot Creator | Shot Creator | Shot Creator | Go-To Big |
| Basketball IQ | Maestro | Point Forward | Point Forward | Cerebral Big |

4. **Secondary prefix**: if the *2nd*-ranked skill is ≥ 82 (and isn't the same
   category, and doesn't duplicate the core), prepend an adjective:

   | 2nd skill | Prefix |
   |-----------|--------|
   | Shooting | Sharpshooting |
   | Playmaking | Playmaking |
   | Defense | Two-Way |
   | Rebounding | Rebounding |
   | Athleticism | Explosive |
   | Clutch | Clutch |
   | Basketball IQ | Crafty |

   → e.g. top = Playmaking guard + strong Shooting = **Sharpshooting Floor General**.

The archetype is deterministic — no seed involved.

---

## Nickname — `nickname()`

1. If the career was a perfect 12-0 → always `"The Immortal"`.
2. Otherwise take the **top skill**. A **Big** whose top skill is Rebounding or
   Defense draws from the height/"tower" pool instead of the skill pool.
3. Pick one entry from that pool using `seed % pool.length` (so the choice is stable
   per run but varies build-to-build).

Pools:

| Trait | Nicknames |
|-------|-----------|
| Shooting | The Sniper · The Marksman · Splash · Flamethrower · The Dagger |
| Playmaking | The Maestro · Floor General · The Magician · Point God · The Quarterback |
| Defense | The Glove · The Eraser · Lockdown · The Menace · No-Fly Zone |
| Rebounding | The Vacuum · Glass Cleaner · The Beast · Workhorse · The Enforcer |
| Athleticism | The Freak · Sky Walker · The Blur · High Riser · Bounce |
| Basketball IQ | The Professor · The General · The Surgeon · The Oracle · The Genius |
| Clutch | The Closer · Mr. Big Shot · Ice · Cold-Blooded · The Killer |
| Big + Reb/Def (tower) | The Tower · Skyscraper · The Monolith |

---

## Changing the vocabulary

Edit the `NICKS`, `coreName()`, and `SECOND_ADJ` tables in
[`src/lib/archetype.ts`](../src/lib/archetype.ts). Keep this doc in sync — it is a
living spec. The thresholds (90/87 for elite tiers, 82 for the secondary prefix) are
the main tuning knobs if archetypes start feeling too generous or too stingy.
