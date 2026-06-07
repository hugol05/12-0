import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RatingCategory } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { encodeBuild, shareUrl } from '@/share/shareLink';
import { PlayerSilhouette } from '@/components/PlayerSilhouette';
import { TeamBadge } from '@/components/TeamBadge';
import type { SeasonResult } from '@/simulation/types';
import './Results.css';

const SEASON_START_YEAR = 2027;
const yearOf = (idx: number) => SEASON_START_YEAR + idx;
const yr2 = (idx: number) => `’${String(yearOf(idx)).slice(2)}`;

export default function Results() {
  const navigate = useNavigate();
  const { data } = useGameData();
  const result = useGameStore((s) => s.result);
  const reset = useGameStore((s) => s.reset);
  const difficulty = useGameStore((s) => s.difficulty);
  const seed = useGameStore((s) => s.seed);
  const franchise = useGameStore((s) => s.franchise);
  const assignments = useGameStore((s) => s.assignments);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!result) navigate('/');
  }, [result, navigate]);

  // category -> rating, for the silhouette + nickname (stable across renders)
  const filled = useMemo(() => {
    const f: Partial<Record<RatingCategory, number>> = {};
    for (const a of assignments) f[a.category] = a.rating;
    return f;
  }, [assignments]);

  if (!result) return null;

  const { career, finals, legacyTier, seasons, startingFranchise } = result;
  const startTeam = data?.franchisesById.get(startingFranchise)?.name ?? startingFranchise;
  const perfect = finals.perfect;
  const nick = nickname(filled, seed ?? 0, perfect);

  const games = Math.max(1, career.totals.games);
  const avg = {
    ppg: (career.totals.points / games).toFixed(1),
    rpg: (career.totals.rebounds / games).toFixed(1),
    apg: (career.totals.assists / games).toFixed(1),
    spg: (career.totals.steals / games).toFixed(1),
    bpg: (career.totals.blocks / games).toFixed(1),
  };

  const journey = buildJourney(seasons);
  const finalsRuns = seasons.filter((s) => s.madeFinals);
  const records = brokenRecords(result);

  const abbr = (id: string) => data?.franchisesById.get(id)?.abbreviation ?? id;
  const teamName = (id: string) => data?.franchisesById.get(id)?.name ?? id;
  const playerName = (id: string) => data?.playersById.get(id)?.name ?? id;

  const playAgain = () => { reset(); navigate('/'); };
  const goHome = () => navigate('/');

  const buildShareUrl = (): string | undefined => {
    const code = encodeBuild({ difficulty, seed, dataVersion: result.dataVersion, franchise, assignments });
    return code ? shareUrl(code) : undefined;
  };

  const share = async () => {
    const line = `I went ${finals.wins}–${finals.losses} in the Finals on 12-0. Legacy: ${legacyTier}.`;
    const url = buildShareUrl();
    const text = url ? `${line} Replay my exact run:` : line;
    try {
      if (navigator.share) await navigator.share({ title: '12-0', text, url });
      else {
        await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch { /* user dismissed share sheet */ }
  };

  const copyLink = async () => {
    const url = buildShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <main className="results">
      <article className={`poster ${perfect ? 'poster--perfect' : ''}`}>
        <header className="poster__head">
          <span className="poster__brand">12&ndash;0</span>
          <span className="poster__diff">{difficulty.toUpperCase()}</span>
        </header>

        {/* hero — record + silhouette */}
        <div className="poster__hero">
          <PlayerSilhouette mode="poster" size="md" filled={filled} className="poster__fig" />
          <div className="poster__record-wrap">
            <span className="poster__record">{finals.wins}&ndash;{finals.losses}</span>
            <span className="poster__record-label">Finals Record</span>
          </div>
        </div>

        <div className="poster__name">
          <span className="poster__nick">{nick}</span>
          <span className="poster__tier">{legacyTier}{perfect && ' · RECORD BROKEN'}</span>
          <span className="poster__ovr">OVR <strong>{career.peakOvr}</strong></span>
        </div>

        {/* awards as SVG medallions */}
        <div className="poster__awards">
          {career.championships > 0 && <AwardBadge count={career.championships} label="RINGS" kind="ring" />}
          {career.mvps > 0 && <AwardBadge count={career.mvps} label="MVP" kind="mvp" />}
          {career.finalsMvps > 0 && <AwardBadge count={career.finalsMvps} label="FMVP" kind="fmvp" />}
          {career.dpoys > 0 && <AwardBadge count={career.dpoys} label="DPOY" kind="dpoy" />}
          {career.allStars > 0 && <AwardBadge count={career.allStars} label="ALL-STAR" kind="allstar" />}
          {career.allNba > 0 && <AwardBadge count={career.allNba} label="ALL-NBA" kind="allnba" />}
        </div>

        {/* career averages */}
        <Section title="Career Averages">
          <div className="poster__avg">
            <Avg v={avg.ppg} l="PPG" /><Avg v={avg.rpg} l="RPG" /><Avg v={avg.apg} l="APG" />
            <Avg v={avg.spg} l="SPG" /><Avg v={avg.bpg} l="BPG" />
          </div>
        </Section>

        {/* career totals */}
        <Section title="Career Totals">
          <div className="poster__totals">
            <Tot v={career.totals.points} l="PTS" /><Tot v={career.totals.rebounds} l="REB" />
            <Tot v={career.totals.assists} l="AST" /><Tot v={career.totals.steals} l="STL" />
            <Tot v={career.totals.blocks} l="BLK" />
            <Tot v={career.seasonsPlayed} l="SEASONS" raw />
          </div>
        </Section>

        {/* finals timeline */}
        {finalsRuns.length > 0 && (
          <Section title="Finals Timeline">
            <div className="poster__finals">
              {finalsRuns.map((s) => (
                <div key={s.seasonIndex} className={`fin ${s.wonChampionship ? 'fin--w' : 'fin--l'}`} title={teamName(s.team)}>
                  <span className="fin__mark">{s.wonChampionship ? '◆' : '○'}</span>
                  <span className="fin__yr">{yr2(s.seasonIndex)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* career journey — team identity + championships by franchise */}
        <Section title="Career Journey">
          <ul className="poster__journey">
            {journey.map((st, i) => (
              <li key={`${st.team}-${st.startIdx}`} className={`leg ${st.rings > 0 ? 'leg--champ' : ''}`}>
                <TeamBadge franchiseId={st.team} abbreviation={abbr(st.team)} name={teamName(st.team)} size="sm" />
                <span className="leg__name">{teamName(st.team)}</span>
                <span className="leg__years">
                  {yearOf(st.startIdx)}{st.endIdx !== st.startIdx ? `–${String(yearOf(st.endIdx)).slice(2)}` : ''}
                </span>
                <span className="leg__meta">
                  {i === 0 ? 'Drafted' : 'New team'}
                  {st.rings > 0 && <span className="leg__rings"> · {st.rings}× ◆</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* records broken */}
        {records.length > 0 && (
          <Section title="Records Broken">
            <ul className="poster__records">
              {records.map((r) => <li key={r} className="rec">✓ {r}</li>)}
            </ul>
          </Section>
        )}

        {/* built-with DNA */}
        <Section title="Built With">
          <ul className="poster__dna">
            {assignments
              .filter((a) => a.category !== 'durability')
              .sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category))
              .map((a) => (
                <li key={a.category} className="dna">
                  <span className="dna__cat">{CAT_LABEL[a.category]}</span>
                  <span className="dna__player">{playerName(a.playerId)}</span>
                  <TeamBadge franchiseId={a.source.franchise} abbreviation={abbr(a.source.franchise)} name={teamName(a.source.franchise)} size="sm" className="dna__badge" />
                  <span className="dna__rating">{a.rating}</span>
                </li>
              ))}
          </ul>
        </Section>

        <footer className="poster__foot">Started on the {startTeam}</footer>
      </article>

      <div className="results__actions">
        <button className="cta" onClick={share}>{copied ? 'Copied!' : 'Share'}</button>
        <button className="ghost" onClick={copyLink}>{linkCopied ? 'Link copied!' : 'Link'}</button>
      </div>
      <div className="results__actions">
        <button className="ghost" onClick={playAgain}>Play Again</button>
        <button className="ghost" onClick={goHome}>Back to Home</button>
      </div>

      <button className="results__archive-toggle" onClick={() => setArchiveOpen((v) => !v)}>
        Season archive {archiveOpen ? '▲' : '▼'}
      </button>
      {archiveOpen && (
        <ul className="archive">
          {seasons.map((s) => (
            <li key={s.seasonIndex} className={`archive__row ${s.wonChampionship ? 'archive__row--ring' : ''}`}>
              <span className="archive__yr">{yr2(s.seasonIndex)}</span>
              <TeamBadge franchiseId={s.team} abbreviation={abbr(s.team)} name={teamName(s.team)} size="sm" />
              <span className="archive__rec">{s.wins}-{s.losses}</span>
              <span className="archive__stat">{s.stats.ppg}/{s.stats.rpg}/{s.stats.apg}</span>
              <span className="archive__tag">{archiveTag(s)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/* ── small presentational helpers ─────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="poster__section">
      <h3 className="poster__section-title">{title}</h3>
      {children}
    </section>
  );
}

function Avg({ v, l }: { v: string; l: string }) {
  return <div className="avg"><span className="avg__v">{v}</span><span className="avg__l">{l}</span></div>;
}

type AwardKind = 'ring' | 'mvp' | 'fmvp' | 'dpoy' | 'allstar' | 'allnba';

/**
 * SVG medallion award badge (no emoji). A gold shield with the count overlaid,
 * a small kind-specific glyph, and a label below. Screenshot-safe (pure SVG/CSS).
 */
function AwardBadge({ count, label, kind }: { count: number; label: string; kind: AwardKind }) {
  return (
    <div className={`award award--${kind}`}>
      <svg viewBox="0 0 52 60" className="award__shield" aria-hidden focusable="false">
        <defs>
          <linearGradient id={`aw-${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-glow)" />
            <stop offset="55%" stopColor="var(--gold-primary)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
        </defs>
        <path
          d="M26 2 L48 11 V30 C48 45 26 58 26 58 C26 58 4 45 4 30 V11 Z"
          fill={`url(#aw-${kind})`}
          stroke="var(--gold-glow)"
          strokeWidth="1.5"
          opacity="0.95"
        />
        <path
          d="M26 6 L44 13 V30 C44 42 26 53 26 53 C26 53 8 42 8 30 V13 Z"
          fill="none"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1"
        />
      </svg>
      <span className="award__count">{count}<span className="award__x">×</span></span>
      <span className="award__label">{label}</span>
    </div>
  );
}

function Tot({ v, l, raw }: { v: number; l: string; raw?: boolean }) {
  return <div className="tot"><span className="tot__v">{raw ? v : fmt(v)}</span><span className="tot__l">{l}</span></div>;
}

function archiveTag(s: SeasonResult): string {
  if (s.wonChampionship) return '◆';
  if (s.madeFinals) return 'F';
  if (s.roundReached === 'confFinals') return 'CF';
  if (s.madePlayoffs) return 'P';
  return '—';
}

/* ── derivations ──────────────────────────────────────────── */

interface Stint { team: string; startIdx: number; endIdx: number; rings: number; }

function buildJourney(seasons: SeasonResult[]): Stint[] {
  const stints: Stint[] = [];
  for (const s of seasons) {
    const last = stints[stints.length - 1];
    if (last && last.team === s.team) {
      last.endIdx = s.seasonIndex;
      if (s.wonChampionship) last.rings++;
    } else {
      stints.push({ team: s.team, startIdx: s.seasonIndex, endIdx: s.seasonIndex, rings: s.wonChampionship ? 1 : 0 });
    }
  }
  return stints;
}

// All-time landmarks (static; update manually). Only surpassed records render.
function brokenRecords(r: { career: { championships: number; totals: { points: number; rebounds: number; assists: number; blocks: number; steals: number }; mvps: number; finalsMvps: number }; finals: { perfect: boolean; wins: number } }): string[] {
  const { career: c, finals: f } = r;
  const out: string[] = [];
  if (c.championships > 11) out.push(`Most Championships — ${c.championships} (Russell: 11)`);
  if (f.perfect) out.push(`Perfect Finals Record — ${f.wins}-0`);
  if (c.finalsMvps > 6) out.push(`Most Finals MVPs — ${c.finalsMvps} (Jordan: 6)`);
  if (c.mvps > 6) out.push(`Most MVPs — ${c.mvps} (Kareem: 6)`);
  if (c.totals.points > 42184) out.push(`Most Career Points — ${fmt(c.totals.points)} (LeBron: 42,184)`);
  if (c.totals.rebounds > 23924) out.push(`Most Career Rebounds — ${fmt(c.totals.rebounds)} (Wilt: 23,924)`);
  if (c.totals.assists > 15806) out.push(`Most Career Assists — ${fmt(c.totals.assists)} (Stockton: 15,806)`);
  if (c.totals.blocks > 3830) out.push(`Most Career Blocks — ${fmt(c.totals.blocks)} (Olajuwon: 3,830)`);
  if (c.totals.steals > 3265) out.push(`Most Career Steals — ${fmt(c.totals.steals)} (Stockton: 3,265)`);
  return out;
}

const CAT_ORDER: RatingCategory[] = [
  'shooting', 'height', 'playmaking', 'defense', 'rebounding', 'athleticism', 'basketballIq', 'clutch',
];
const CAT_LABEL: Record<RatingCategory, string> = {
  shooting: 'Shooting', height: 'Height', playmaking: 'Playmaking', defense: 'Defense',
  rebounding: 'Rebounding', athleticism: 'Athleticism', basketballIq: 'IQ', clutch: 'Clutch',
  durability: 'Durability',
};

const NICKS: Record<RatingCategory, string[]> = {
  shooting: ['The Sniper', 'Flamethrower', 'Splash God'],
  height: ['The Tower', 'Skyscraper', 'The Monolith'],
  playmaking: ['The Maestro', 'The Conductor', 'Point God'],
  defense: ['The Wall', 'The Eraser', 'Lockdown'],
  rebounding: ['Glass Cleaner', 'The Vacuum', 'The Beast'],
  athleticism: ['The Freak', 'Highlight Reel', 'The Blur'],
  basketballIq: ['The Professor', 'The General', 'The Oracle'],
  clutch: ['The Closer', 'Mr. Big Shot', 'Ice Veins'],
  durability: ['The Ironman', 'Evergreen', 'Mr. Reliable'],
};

function nickname(filled: Partial<Record<RatingCategory, number>>, seed: number, perfect: boolean): string {
  if (perfect) return '"The Immortal"';
  // standout category = highest rating (canonical order breaks ties)
  let topCat: RatingCategory = 'clutch';
  let topVal = -1;
  for (const cat of [...CAT_ORDER, 'durability' as RatingCategory]) {
    const v = filled[cat];
    if (v != null && v > topVal) { topVal = v; topCat = cat; }
  }
  const pool = NICKS[topCat];
  return `"${pool[Math.abs(seed) % pool.length]}"`;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
