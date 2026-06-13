import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Twitter } from 'lucide-react';
import type { RatingCategory } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { useGameData } from '@/data/useGameData';
import { shareCareerImage, type ShareCardData } from '@/share/shareImage';
import { PlayerSilhouette } from '@/components/PlayerSilhouette';
import { TeamBadge } from '@/components/TeamBadge';
import { buildArchetype, formatHeight, nickname, parseHeightInches } from '@/lib/archetype';
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
  // The shared image is drawn on a canvas (see share/shareImage) — a compact 4:5
  // card with the record, OVR, archetype, awards, averages and Built-With list.
  const [shareState, setShareState] = useState<'idle' | 'working' | 'shared' | 'saved' | 'error'>('idle');

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
  const heightPlayer = data?.playersById.get(assignments.find((a) => a.category === 'height')?.playerId ?? '');
  const heightInches = parseHeightInches(heightPlayer?.height);
  const nick = nickname(filled, seed ?? 0, perfect, heightInches);
  const archetype = buildArchetype(filled, heightInches);

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

  // Build the compact share-card data and render it to a PNG (canvas), then open
  // the system share sheet so it can be posted to Twitter/X, Messages, etc. —
  // falling back to a download when file-sharing isn't supported.
  const buildShareData = (): ShareCardData => {
    const awards: ShareCardData['awards'] = [];
    if (career.championships > 0) awards.push({ count: career.championships, label: 'Rings' });
    if (career.mvps > 0) awards.push({ count: career.mvps, label: 'MVP' });
    if (career.finalsMvps > 0) awards.push({ count: career.finalsMvps, label: 'FMVP' });
    if (career.dpoys > 0) awards.push({ count: career.dpoys, label: 'DPOY' });
    if (career.allStars > 0) awards.push({ count: career.allStars, label: 'All-Star' });
    const builtWith: ShareCardData['builtWith'] = assignments
      .filter((a) => a.category !== 'durability')
      .sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category))
      .map((a) => ({
        cat: CAT_LABEL[a.category],
        player: playerName(a.playerId),
        rating: a.category === 'height'
          ? formatHeight(data?.playersById.get(a.playerId)?.height)
          : String(a.rating),
      }));
    return {
      wins: finals.wins, losses: finals.losses, perfect,
      peakOvr: career.peakOvr, nick, archetype, height: formatHeight(heightPlayer?.height),
      difficulty, awards, averages: avg, builtWith, startTeam,
    };
  };

  const share = async () => {
    if (shareState === 'working') return;
    setShareState('working');
    const line = perfect 
      ? `I went a PERFECT 12–0 in the Finals on 12-0 🏆\n\nhttps://12-0.me` 
      : `I went ${finals.wins}–${finals.losses} in the Finals on 12-0 🏆\n\nhttps://12-0.me`;
    const slug = `12-0-${legacyTier.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const res = await shareCareerImage(buildShareData(), {
      fileName: slug,
      title: '12-0',
      text: line,
    });
    if (res === 'shared') setShareState('shared');
    else if (res === 'downloaded') setShareState('saved');
    else if (res === 'error') setShareState('error');
    else { setShareState('idle'); return; } // cancelled — no confirmation needed
    setTimeout(() => setShareState('idle'), 2200);
  };

  const shareLabel =
    shareState === 'working' ? 'Rendering…'
    : shareState === 'shared' ? 'Shared!'
    : shareState === 'saved' ? 'Image saved'
    : shareState === 'error' ? 'Try again'
    : 'Share image';

  // One-tap post to X with a pre-filled brag + the replay link (which carries the
  // site's OG card). Complements the image share — best path on desktop, where the
  // Web Share sheet usually isn't available.
  const tweet = () => {
    const url = 'https://12-0.me';
    const text = perfect
      ? `I went a PERFECT 12–0 in the Finals on 12-0 🏆\n\n`
      : `I went ${finals.wins}–${finals.losses} in the Finals on 12-0 🏆\n\n`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="results">
      <article className={`poster ${perfect ? 'poster--perfect' : ''}`}>
        <header className="poster__head">
          <span className="poster__brand">12&ndash;0</span>
          <span className="poster__diff">{difficulty.toUpperCase()}</span>
        </header>

        {/* hero — record + OVR beside the silhouette (fills the right column) */}
        <div className="poster__hero">
          <PlayerSilhouette mode="poster" size="md" filled={filled} className="poster__fig" />
          <div className="poster__record-wrap">
            <span className="poster__record">{finals.wins}&ndash;{finals.losses}</span>
            <span className="poster__record-label">Finals Record</span>
            {perfect && <span className="poster__broken">Record Broken</span>}
            <div className="poster__ovr">
              <span className="poster__ovr-num">{career.peakOvr}</span>
              <span className="poster__ovr-label">Peak OVR</span>
            </div>
          </div>
        </div>

        <div className="poster__name">
          <span className="poster__nick">{nick}</span>
          <span className="poster__archetype">{archetype} · {formatHeight(heightPlayer?.height)}</span>
        </div>

        {/* awards — clean count + label chips (no icons) */}
        <div className="poster__awards">
          {career.championships > 0 && <Award count={career.championships} label="Rings" />}
          {career.mvps > 0 && <Award count={career.mvps} label="MVP" />}
          {career.finalsMvps > 0 && <Award count={career.finalsMvps} label="Finals MVP" />}
          {career.scoringTitles > 0 && <Award count={career.scoringTitles} label="Scoring Title" />}
          {career.dpoys > 0 && <Award count={career.dpoys} label="DPOY" />}
          {career.allStars > 0 && <Award count={career.allStars} label="All-Star" />}
          {career.allNba > 0 && <Award count={career.allNba} label="All-NBA" />}
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
            {journey.map((st) => (
              <li key={`${st.team}-${st.startIdx}`} className={`leg ${st.rings > 0 ? 'leg--champ' : ''}`}>
                <TeamBadge franchiseId={st.team} abbreviation={abbr(st.team)} name={teamName(st.team)} size="sm" />
                <span className="leg__name">{teamName(st.team)}</span>
                <span className="leg__years">
                  {yearOf(st.startIdx)}{st.endIdx !== st.startIdx ? `–${String(yearOf(st.endIdx)).slice(2)}` : ''}
                </span>
                {st.rings > 0 && (
                  <span className="leg__meta"><span className="leg__rings">{st.rings}× ◆</span></span>
                )}
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

        {/* built-with DNA — includes Durability (the one non-OVR pick: it drives career length) */}
        <Section title="Built With">
          <ul className="poster__dna">
            {assignments
              .slice()
              .sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category))
              .map((a) => (
                <li key={a.category} className={`dna ${a.category === 'durability' ? 'dna--durability' : ''}`}>
                  <span className="dna__cat">{CAT_LABEL[a.category]}</span>
                  <span className="dna__player">{playerName(a.playerId)}</span>
                  <span className="dna__rating">
                    {a.category === 'height' ? formatHeight(data?.playersById.get(a.playerId)?.height) : a.rating}
                  </span>
                  <TeamBadge franchiseId={a.source.franchise} abbreviation={abbr(a.source.franchise)} name={teamName(a.source.franchise)} size="sm" className="dna__badge" />
                </li>
              ))}
          </ul>
          <p className="poster__dna-note">Durability sets career length — {career.seasonsPlayed} seasons here.</p>
        </Section>

        <footer className="poster__foot">Started on the {startTeam}</footer>
      </article>

      <div className="results__actions">
        <button className="results__share" onClick={share} disabled={shareState === 'working'}>
          {shareLabel}
        </button>
        <button className="results__tweet" onClick={tweet}>
          <Twitter size={17} aria-hidden="true" strokeWidth={2.25} />
          Tweet result
        </button>
        <div className="results__actions-row">
          <button className="results__again" onClick={playAgain}>Build another</button>
          <button className="results__home" onClick={goHome} aria-label="Back to home">
            <Home size={18} aria-hidden="true" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {/* full season-by-season log — always shown */}
      <section className="results__archive">
        <h3 className="results__archive-title">Season Archive</h3>
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
      </section>

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

/** A clean award tally — count over a label, no icon. */
function Award({ count, label }: { count: number; label: string }) {
  return (
    <div className="award">
      <span className="award__count">{count}</span>
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
  'shooting', 'height', 'playmaking', 'defense', 'rebounding', 'athleticism', 'basketballIq', 'clutch', 'durability',
];
const CAT_LABEL: Record<RatingCategory, string> = {
  shooting: 'Shooting', height: 'Height', playmaking: 'Playmaking', defense: 'Defense',
  rebounding: 'Rebounding', athleticism: 'Athleticism', basketballIq: 'IQ', clutch: 'Clutch',
  durability: 'Durability',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
