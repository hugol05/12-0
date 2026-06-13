/**
 * Career share card — rendered with the Canvas 2D API (not a DOM snapshot).
 *
 * We used to capture the off-screen poster with `html-to-image`, but that was
 * flaky on mobile: the first tap often produced a half-blank / all-black PNG
 * (web-font + mask race, fixed off-screen node). Drawing the card by hand on a
 * canvas is deterministic — every share looks identical and nothing can fail to
 * "paint". The layout is a compact 4:5 portrait (1080×1350) that shows the whole
 * story: Finals record, peak OVR, nickname, awards, averages and the Built-With
 * DNA — the artifact people post to Twitter/X.
 *
 * Sharing prefers the Web Share API with a file (system sheet → X / Messages /
 * Instagram). When file-sharing isn't available we download the PNG instead.
 */

export interface ShareAward {
  count: number;
  label: string;
}
export interface ShareDna {
  cat: string;
  player: string;
  rating: string;
  headshotUrl?: string;
  teamId?: string;
  teamAbbr?: string;
}
export interface ShareCardData {
  wins: number;
  losses: number;
  perfect: boolean;
  peakOvr: number;
  nick: string;
  archetype: string;
  height: string;
  difficulty: string;
  awards: ShareAward[];
  averages: { ppg: string; rpg: string; apg: string; spg: string; bpg: string };
  builtWith: ShareDna[];
  startTeam: string;
}

export interface ShareImageOptions {
  fileName?: string;
  title?: string;
  text?: string;
}

export type ShareImageResult = 'shared' | 'downloaded' | 'cancelled' | 'error';

import { getTeamColors } from '../theme/teamColors';

/* ── palette (mirrors src/styles/tokens.css) ───────────────────────────── */
const GOLD = '#d4a853';
const GOLD_DEEP = '#9a7635';
const WHITE = '#ffffff';
const SECONDARY = '#8a8a9a';
const TERTIARY = '#5a5a68';
const BORDER = 'rgba(255,255,255,0.09)';
const ELEVATED = '#14141f';

const DISPLAY = '"Clash Display", "Arial Narrow", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const BODY = '"Satoshi", system-ui, sans-serif';

const W = 1080;
const H = 1350;
const PAD = 72;

/** Ensure the self-hosted webfonts are rasterizable before we draw text. */
async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('700 150px "Clash Display"'),
      document.fonts.load('600 44px "Clash Display"'),
      document.fonts.load('700 52px "JetBrains Mono"'),
      document.fonts.load('400 28px "JetBrains Mono"'),
      document.fonts.load('500 30px "Satoshi"'),
    ]);
    await document.fonts.ready;
  } catch {
    /* fall back to system fonts — still renders, just less on-brand */
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Truncate a string to fit `maxW` at the current font, adding an ellipsis. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Draws the whole card and returns a PNG blob. */
export async function renderCareerCard(d: ShareCardData): Promise<Blob> {
  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  // ── background ──
  const bg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, H * 0.55, H);
  bg.addColorStop(0, '#181822');
  bg.addColorStop(0.55, '#0a0a10');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // faint gold spotlight behind the record
  const glow = ctx.createRadialGradient(W / 2, 360, 0, W / 2, 360, 520);
  glow.addColorStop(0, d.perfect ? 'rgba(212,168,83,0.20)' : 'rgba(212,168,83,0.10)');
  glow.addColorStop(1, 'rgba(212,168,83,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 760);

  // perfect-run gold frame
  if (d.perfect) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    roundRect(ctx, 14, 14, W - 28, H - 28, 28);
    ctx.stroke();
  }

  let y = PAD;

  // ── header: brand + difficulty pill ──
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `700 46px ${DISPLAY}`;
  ctx.fillStyle = WHITE;
  ctx.fillText('12–0', PAD, y + 38);

  ctx.font = `500 24px ${MONO}`;
  const diff = d.difficulty.toUpperCase();
  const dw = ctx.measureText(diff).width;
  ctx.fillStyle = ELEVATED;
  roundRect(ctx, W - PAD - dw - 40, y, dw + 40, 52, 26);
  ctx.fill();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.5;
  roundRect(ctx, W - PAD - dw - 40, y, dw + 40, 52, 26);
  ctx.stroke();
  ctx.fillStyle = SECONDARY;
  ctx.fillText(diff, W - PAD - dw - 20, y + 35);

  y += 80;

  // ── hero: record (left) + peak OVR (right) ──
  ctx.textAlign = 'left';
  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText('FINALS RECORD', PAD, y);

  ctx.font = `700 168px ${DISPLAY}`;
  ctx.fillStyle = WHITE;
  ctx.fillText(`${d.wins}–${d.losses}`, PAD - 4, y + 150);

  // peak OVR on the right, baseline-aligned with the big number
  ctx.textAlign = 'right';
  ctx.font = `700 110px ${MONO}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(String(d.peakOvr), W - PAD, y + 150);
  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText('PEAK OVR', W - PAD, y + 30);

  y += 180;

  if (d.perfect) {
    ctx.textAlign = 'left';
    ctx.font = `700 24px ${MONO}`;
    ctx.fillStyle = GOLD;
    ctx.fillText('★ RECORD BROKEN — PERFECT FINALS', PAD, y);
    y += 40;
  }

  // ── nickname + archetype ──
  ctx.textAlign = 'left';
  ctx.font = `600 56px ${DISPLAY}`;
  ctx.fillStyle = WHITE;
  ctx.fillText(fit(ctx, d.nick, W - PAD * 2), PAD, y + 44);
  y += 64;
  ctx.font = `500 28px ${MONO}`;
  ctx.fillStyle = GOLD_DEEP;
  const sub = [d.archetype, d.height].filter(Boolean).join('  ·  ');
  ctx.fillText(fit(ctx, sub, W - PAD * 2), PAD, y + 22);
  y += 44;

  // divider
  const divider = (yy: number) => {
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD, yy);
    ctx.lineTo(W - PAD, yy);
    ctx.stroke();
  };
  divider(y);
  y += 32;

  // ── awards row (up to 5 chips) ──
  const awards = d.awards.slice(0, 5);
  if (awards.length) {
    const gap = 18;
    const chipW = Math.min(190, (W - PAD * 2 - gap * (awards.length - 1)) / awards.length);
    const chipH = 116;
    const totalW = chipW * awards.length + gap * (awards.length - 1);
    let x = (W - totalW) / 2;
    for (const a of awards) {
      ctx.fillStyle = ELEVATED;
      roundRect(ctx, x, y, chipW, chipH, 18);
      ctx.fill();
      ctx.strokeStyle = BORDER;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, chipW, chipH, 18);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = `700 52px ${MONO}`;
      ctx.fillStyle = GOLD;
      ctx.fillText(String(a.count), x + chipW / 2, y + 56);
      ctx.font = `500 21px ${MONO}`;
      ctx.fillStyle = SECONDARY;
      ctx.fillText(fit(ctx, a.label.toUpperCase(), chipW - 16), x + chipW / 2, y + 92);
      x += chipW + gap;
    }
    y += chipH + 32;
    divider(y);
    y += 32;
  }

  // ── career averages ──
  ctx.textAlign = 'left';
  ctx.font = `500 24px ${MONO}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText('CAREER AVERAGES', PAD, y);
  y += 24;
  const avgs: [string, string][] = [
    [d.averages.ppg, 'PPG'],
    [d.averages.rpg, 'RPG'],
    [d.averages.apg, 'APG'],
    [d.averages.spg, 'SPG'],
    [d.averages.bpg, 'BPG'],
  ];
  const colW = (W - PAD * 2) / avgs.length;
  avgs.forEach(([v, l], i) => {
    const cx = PAD + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.font = `700 50px ${MONO}`;
    ctx.fillStyle = WHITE;
    ctx.fillText(v, cx, y + 52);
    ctx.font = `500 22px ${MONO}`;
    ctx.fillStyle = TERTIARY;
    ctx.fillText(l, cx, y + 84);
  });
  y += 100;
  divider(y);
  y += 32;

  // ── built with ──
  ctx.textAlign = 'left';
  ctx.font = `500 24px ${MONO}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText('BUILT WITH', PAD, y);
  y += 32;
  const rows = d.builtWith.slice(0, 8);
  const rowH = (H - PAD - 30 - y) / Math.max(rows.length, 1);
  const ratingX = W - PAD;
  const playerStartX = PAD + 260; // Pulled back slightly to fit images

  const headshots = await Promise.all(
    rows.map((r) => r.headshotUrl
      ? loadImage(`https://wsrv.nl/?url=${encodeURIComponent(r.headshotUrl)}&w=64&h=64&fit=cover&mask=circle`)
      : Promise.resolve(null)
    )
  );

  rows.forEach((r, i) => {
    const cy = y + rowH / 2 + 10;
    ctx.textAlign = 'left';
    ctx.font = `500 26px ${MONO}`;
    ctx.fillStyle = SECONDARY;
    ctx.fillText(r.cat.toUpperCase(), PAD, cy);

    let currentX = playerStartX;

    // Draw team badge
    if (r.teamId && r.teamAbbr) {
      const colors = getTeamColors(r.teamId);
      const tw = 48;
      const th = 26;
      const tx = currentX;
      const ty = cy - 20;

      ctx.fillStyle = colors.primary;
      roundRect(ctx, tx, ty, tw, th, 6);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.font = `700 13px ${MONO}`;
      ctx.fillStyle = colors.text;
      ctx.fillText(r.teamAbbr, tx + tw / 2, ty + th / 2 + 5);

      currentX += tw + 16;
    }

    // Draw headshot
    const img = headshots[i];
    if (img) {
      const size = 32;
      ctx.drawImage(img, currentX, cy - 24, size, size);
      currentX += size + 16;
    }

    ctx.textAlign = 'left';
    ctx.font = `500 30px ${BODY}`;
    ctx.fillStyle = WHITE;
    ctx.fillText(fit(ctx, r.player, ratingX - currentX - 90), currentX, cy);

    ctx.textAlign = 'right';
    ctx.font = `700 30px ${MONO}`;
    ctx.fillStyle = GOLD;
    ctx.fillText(r.rating, ratingX, cy);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y + rowH);
    ctx.lineTo(W - PAD, y + rowH);
    ctx.stroke();
    y += rowH;
  });

  // ── footer ──
  ctx.textAlign = 'center';
  ctx.font = `500 24px ${MONO}`;
  ctx.fillStyle = TERTIARY;
  ctx.fillText(fit(ctx, `12-0.me  ·  Started on the ${d.startTeam}`, W - PAD * 2), W / 2, H - PAD + 8);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Render the career card and share it (or download as a fallback). */
export async function shareCareerImage(
  data: ShareCardData,
  opts: ShareImageOptions = {},
): Promise<ShareImageResult> {
  const { fileName = '12-0-career', title = '12-0', text } = opts;
  let blob: Blob;
  try {
    blob = await renderCareerCard(data);
  } catch {
    return 'error';
  }

  const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };

  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    download(blob, fileName);
    return 'downloaded';
  } catch {
    return 'error';
  }
}
