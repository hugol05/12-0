# 12-0 — Launch Playbook

> **Goal:** get the first few hundred people to *play* (build a player + simulate a
> career), share their result, and ideally come back. This is the scrappy,
> first-week go-to-market plan — not a long-term growth strategy.
>
> Live at **[12-0.me](https://12-0.me)** · deployed on Vercel.

---

## 0. Why this can spread

The game is a **shareable artifact** machine: every run ends on a poster (Finals
record + awards + the "Built With" DNA) that begs to be screenshotted. The whole
loop is < 3 minutes. That's the same shape that made **82-0** and **7-0** spread.
Our job at launch is just to put it in front of people who already love that
shape — basketball nerds and web-game people — and make the first share dead easy.

**The one number that matters week one:** *shares per 100 visitors.* If people
play but don't share, the loop is broken and no amount of posting fixes it. Watch
this first (see §6).

---

## 1. Pre-launch checklist (do this BEFORE posting anywhere)

A botched first impression wastes your best traffic. 30 minutes of checks:

- [ ] **Share image works** on a real phone (iOS Safari + Android Chrome). Build a
      run, tap **Share image**, confirm the system sheet opens with a real PNG
      (record, awards, averages, Built-With). This was just rewritten to a canvas
      renderer — verify it on device, not just desktop.
- [ ] **Open Graph / link preview.** When you paste `12-0.me` into X/iMessage/Discord,
      a real title, description, and preview image should appear — not a blank card.
      If missing, add `<meta property="og:*">` tags + a static `/og.png` (1200×630).
      *(This is the single highest-leverage pre-launch fix — a link with no preview
      gets a fraction of the clicks.)*
- [ ] **Mobile first-load.** Most traffic from X/Reddit is mobile. Cold-load on a
      phone over cellular: no black screens (the loading screen should show), the
      build screen fits, the player list scrolls cleanly.
- [ ] **Vercel Web Analytics is on** (it is, via `@vercel/analytics`) so you can see
      traffic and referrers from minute one.
- [ ] **A 10–15s demo GIF/video** of one full loop (roll → place → simulate → 12-0
      poster). Posts with motion massively outperform static text. Record it once,
      reuse everywhere.
- [ ] **2–3 still screenshots:** the build screen mid-roll, a god-tier poster, the
      season archive. For tweets/Reddit where a GIF isn't ideal.
- [ ] **Disclaimer is visible** (it is, in the footer) — fan project, not NBA
      affiliated. Reduces takedown / "is this official?" friction.

---

## 2. The launch tweet (your single most important post)

Your draft is good. Tightened versions — the hook is "god player + beat Russell":

**Primary (lead with the demo GIF/video):**

> Inspired by 82-0, I built **12-0**.
>
> You draft a Frankenstein NBA player — Curry's shooting, Wemby's size, Jordan's
> clutch — then simulate his whole career and try to go **12-0 in the Finals** to
> beat Bill Russell's 11 rings.
>
> Free, no signup → 12-0.me

**Variant A (challenge framing):**

> 11 rings made Bill Russell immortal.
>
> I made a game where you build the perfect NBA player from real attributes and
> try to win 12. Can you go a perfect 12-0 in the Finals?
>
> 🏀 12-0.me

**Variant B (curiosity / number):**

> Spent the week building a basketball game: pick the best shooting, defense,
> clutch etc. from any player in NBA history, stitch them into one god player,
> and sim 20 seasons. Goal = 12 championships > Russell's 11.
>
> Try it: 12-0.me (inspired by @ the 82-0 game)

**Tips**
- **Attach the GIF/video** — first frame should show the finished poster, not a
  loading screen.
- **First reply = the link again** as plain text + "built with React, all real
  player data, runs fully offline." People scroll past links in the main tweet.
- **Tag / credit the 82-0 creator** — it's honest, and they may quote/boost it.
- Post **late morning ET on a weekday** (sports Twitter is most awake). Avoid Friday
  night.
- Pin it to your profile for the week.

---

## 3. Channels, in priority order

### 3a. Reply to / quote 82-0 posts (highest intent, do first)
The audience is *already there and already convinced* of the format. Find recent
82-0 tweets and threads; leave a genuine, non-spammy reply: *"Loved 82-0 — it
inspired me to build a basketball one where you make a single god player and chase
12 rings: 12-0.me."* Don't paste the same line 50 times; vary it, and only where it
actually fits. The hype has cooled a bit, so also search for *new* 82-0 mentions
daily for a week and engage early on each.

### 3b. Reddit
Reddit converts well for web games but is allergic to ads. Read each sub's rules;
post as a maker sharing a free thing, not a marketer.
- **r/webgames** — perfect fit. Title like *"I made 12-0: build a Frankenstein NBA
  player and try to win 12 championships (free, no signup)."* Expectations are
  modest but it's pure target audience.
- **r/nba** — huge but strict; most days self-promo gets removed. Best shot is the
  daily off-topic/Saturday thread, or framing it as a fun tool, not a launch.
  Check rules + message mods first. One good r/nba hit dwarfs everything else.
- **r/basketball**, **r/nbadiscussion** — smaller, friendlier to this.
- **r/incremental_games / r/playmygame / r/IndieGaming** — secondary, format-friendly.
- Engage in the comments fast — Reddit rewards an active OP in the first hour.

### 3c. Hacker News — "Show HN"
*"Show HN: 12-0 – build an NBA superstar from real player stats and sim his career."*
HN likes the technical angle: deterministic seeded sim, real open data pipeline,
runs offline as a PWA, zero backend. Post early-morning ET, then answer every
comment. Even a modest HN showing brings devs who share.

### 3d. Product Hunt (optional, later in week)
Lower urgency. Good for a second wave + a backlink. Prep a gallery (GIF + 3 shots)
and a one-liner. Don't burn it on day one while you're still fixing things.

### 3e. Your own network / Discords
- Personal post: "I built a thing, would love feedback." Friends give you the first
  honest bug reports and the first shares.
- Any NBA / sim-game / gamedev Discords you're in (where self-promo is allowed).

---

## 4. First 48 hours — cadence

1. **T-0 (morning ET):** post the launch tweet + GIF. Pin it. Drop the link in your
   Discords / to friends.
2. **T+1h:** post to **r/webgames**. Sit in the comments.
3. **T+2–3h:** **Show HN**. Answer everything.
4. **Throughout:** reply to 82-0 tweets where it fits. Reply to *every* comment and
   quote-tweet on your own post in the first hours — early engagement is what the
   algorithms reward.
5. **T+24h:** post a **follow-up tweet** with a fun stat from real runs ("people
   have built 400 players and only 3% went 12-0") or the wildest poster someone
   shared. This restarts the loop without being repetitive.
6. **Day 2:** r/nba (rules permitting) or r/basketball; Product Hunt prep.

---

## 5. Lower the friction to share (in-product nudges)

Traffic is wasted if people don't share. Cheap wins, in rough priority:
- **Make the share button impossible to miss** on the results screen, with copy
  that implies bragging ("Flex your 12-0").
- **Prompt the share at the peak moment** — right when the 12th ring lands /
  the poster reveals, not buried under the archive.
- **Watermark the share image** with `12-0.me` (the canvas card already does) so
  every screenshot is an ad.
- **Pre-filled tweet intent** as a secondary share option:
  `https://twitter.com/intent/tweet?text=...&url=https://12-0.me` with the user's
  record filled in — one tap to post, no app sheet needed.
- **Replay links already exist** (`/r?b=…`) — surface "challenge a friend to beat
  this build" copy around them.

---

## 6. What to watch (Vercel Analytics + gut)

- **Visitors & referrers** — which channel actually sent people (Analytics → Referrers).
  Double down on whatever overperforms; ignore the rest.
- **Top pages / funnel** — do people who hit `/` reach `/build` and `/results`? A big
  drop at `/build` means the build step confuses people.
- **Shares per 100 visitors** (proxy: results-page reach, or add a custom
  `track('share')` event via `@vercel/analytics`). This is the loop-health metric.
- **Mobile vs desktop split** — informs where to spend polish.
- **Qualitative:** read every reply/comment for the same 2–3 complaints. Those are
  your next tasks. Feedback email is already in the footer (hglabs.studio@gmail.com).

---

## 7. Things to have ready for the second wave

If something hits, capitalize fast:
- A **daily-challenge / shared-seed** mode (everyone builds against the same rolls)
  is the natural "come back tomorrow" hook — see [roadmap.md](roadmap.md).
- A **leaderboard** of rarest builds / best records (even localStorage first).
- Reply to the viral moment with a **"how it works"** thread (the real-data pipeline,
  the two-axis difficulty) — devs love the behind-the-scenes.

---

*Keep it honest, keep it fast, reply to everyone. The game does the selling — your
job is just to get it in front of the right 500 people and make the first share
one tap.*
