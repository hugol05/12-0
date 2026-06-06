/** Validates the generated public/data/*.json against the JSON schemas + game invariants. */
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { OUT_DIR, SCHEMA_DIR, readJson } from './util.ts';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

const errors: string[] = [];
const fail = (m: string) => errors.push(m);

async function main(): Promise<void> {
  const playerSchema = await readJson<object>(join(SCHEMA_DIR, 'player.schema.json'));
  const franchiseSchema = await readJson<object>(join(SCHEMA_DIR, 'franchise.schema.json'));
  const rollSchema = await readJson<object>(join(SCHEMA_DIR, 'roll-index.schema.json'));
  const manifestSchema = await readJson<object>(join(SCHEMA_DIR, 'manifest.schema.json'));

  const players = await readJson<any[]>(join(OUT_DIR, 'players.json'));
  const franchises = await readJson<any[]>(join(OUT_DIR, 'franchises.json'));
  const roll = await readJson<any>(join(OUT_DIR, 'roll-index.json'));
  const manifest = await readJson<any>(join(OUT_DIR, 'manifest.json'));

  // ---- schema validation ----
  const vPlayer = ajv.compile(playerSchema);
  players.forEach((p, i) => { if (!vPlayer(p)) fail(`players[${i}] (${p?.name}): ${ajv.errorsText(vPlayer.errors)}`); });

  const vFr = ajv.compile(franchiseSchema);
  if (!vFr(franchises)) fail(`franchises.json: ${ajv.errorsText(vFr.errors)}`);
  const vRoll = ajv.compile(rollSchema);
  if (!vRoll(roll)) fail(`roll-index.json: ${ajv.errorsText(vRoll.errors)}`);
  const vMan = ajv.compile(manifestSchema);
  if (!vMan(manifest)) fail(`manifest.json: ${ajv.errorsText(vMan.errors)}`);

  // ---- invariants ----
  const playerIds = new Set(players.map((p) => p.id));
  if (playerIds.size !== players.length) fail('duplicate player ids');

  const inBucket = new Set<string>();
  for (const b of roll.buckets) {
    if (b.playerIds.length < roll.minBucketSize) fail(`bucket ${b.franchise}/${b.decade} has ${b.playerIds.length} < ${roll.minBucketSize}`);
    if (new Set(b.playerIds).size !== b.playerIds.length) fail(`bucket ${b.franchise}/${b.decade} has duplicate ids`);
    for (const id of b.playerIds) {
      if (!playerIds.has(id)) fail(`bucket ${b.franchise}/${b.decade} references unknown player ${id}`);
      inBucket.add(id);
    }
  }
  for (const p of players) {
    if (!inBucket.has(p.id)) fail(`player ${p.name} (${p.id}) is in no roll bucket`);
    const r = p.ratings;
    for (const k of ['shooting', 'height', 'playmaking', 'defense', 'rebounding', 'athleticism', 'basketballIq', 'clutch', 'durability']) {
      if (!Number.isInteger(r[k]) || r[k] < 0 || r[k] > 99) fail(`player ${p.name} rating ${k}=${r[k]} out of range`);
    }
  }

  const franchiseIds = new Set(franchises.map((f) => f.id));
  for (const b of roll.buckets) if (!franchiseIds.has(b.franchise)) fail(`bucket franchise ${b.franchise} not in franchises.json`);

  // ---- coverage report (informational) ----
  const byDecade = new Map<string, number>();
  for (const b of roll.buckets) byDecade.set(b.decade, (byDecade.get(b.decade) ?? 0) + 1);
  console.log('coverage by decade:');
  for (const d of [...byDecade.keys()].sort()) console.log(`  ${d}: ${byDecade.get(d)} buckets`);
  console.log(`players: ${players.length}, franchises: ${franchises.length}, buckets: ${roll.buckets.length}`);
  const verified = players.filter((p) => p.photo.status === 'verified').length;
  console.log(`photos verified: ${verified}/${players.length} (${Math.round((verified / players.length) * 100)}%)`);

  if (errors.length) {
    console.error(`\nVALIDATION FAILED (${errors.length}):`);
    for (const e of errors.slice(0, 40)) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('\nvalidation OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
