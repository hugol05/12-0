import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..');
export const RAW_DIR = join(ROOT, 'data-source', 'raw');
export const CURATED_DIR = join(ROOT, 'data-source', 'curated');
export const OUT_DIR = join(ROOT, 'public', 'data');
export const SCHEMA_DIR = join(ROOT, 'data', 'schemas');

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/** Download a URL into data-source/raw/<filename>, using the cached copy if present. */
export async function fetchCached(url: string, filename: string): Promise<string> {
  await ensureDir(RAW_DIR);
  const path = join(RAW_DIR, filename);
  try {
    await stat(path);
    return await readFile(path, 'utf8');
  } catch {
    // not cached yet
  }
  process.stdout.write(`  fetch ${url}\n`);
  const res = await fetch(url, { headers: { 'user-agent': '12-0-data-pipeline' } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url}`);
  const text = await res.text();
  await writeFile(path, text, 'utf8');
  return text;
}

export function parseCsv(text: string): Record<string, string>[] {
  return parse(text, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/** Normalise a player name for cross-dataset joins (lowercase, strip accents/punctuation/suffixes). */
export function normName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bjr\b|\bsr\b|\biii\b|\bii\b|\biv\b/g, '')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toNum(v: string | undefined): number {
  if (v === undefined) return 0;
  const s = v.replace('%', '').trim();
  if (s === '' || s === 'NA') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Percent strings in the BR set are like "56.40%"; convert to 0..1 fraction. */
export function pctToFrac(v: string | undefined): number {
  const n = toNum(v);
  return n > 1.5 ? n / 100 : n;
}

export function decadeOf(seasonStartYear: number): string {
  return `${Math.floor(seasonStartYear / 10) * 10}s`;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Map a sorted-ascending numeric array + value to a percentile in [0,1]. */
export function percentileRanker(values: number[]): (v: number) => number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return (v: number) => {
    if (n === 0) return 0.5;
    // count of values strictly less than v
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return n === 1 ? 0.5 : lo / (n - 1);
  };
}
