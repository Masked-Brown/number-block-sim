// make-seeds.js -- generate the frozen seed sets. Run ONCE, ever.
//
//   node 03_train/lab/cli/make-seeds.js
//
// eval-v1 is the exam: 500 seeds, generated here, committed, and never
// regenerated. Every headline comparison in this experiment runs on it, and
// the moment it changes, every number previously measured on it becomes
// incomparable. This script therefore refuses to overwrite an existing set.
//
// The seeds are derived, not random: sha256 over a fixed label and an index,
// first eight bytes read as a 64-bit integer. Anyone can regenerate the same
// list from this file and check it, and the two sets are disjoint by
// construction because their labels differ (checked anyway, below).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import { SEEDS_DIR } from '../paths.js';
import { seedSetPath, seedsChecksum } from '../seeds.js';
import { parseArgs } from './args.js';

const SETS = [
  {
    id: 'eval-v1',
    count: 500,
    purpose: 'The frozen exam. Every headline comparison runs on this set. '
      + 'Never regenerated, never extended, never reordered. Training never touches it.',
  },
  {
    id: 'train-v1',
    count: 2000,
    purpose: 'The practice pool for tuning and later training campaigns. '
      + 'Disjoint from eval-v1 by construction, so nothing tuned here has seen the exam.',
  },
];

function seedFor(label, index) {
  const digest = createHash('sha256').update(`nbs-seeds:${label}:${index}`).digest();
  return digest.readBigUInt64BE(0).toString();
}

function generate(set) {
  const seeds = [];
  for (let i = 0; i < set.count; i++) seeds.push(seedFor(set.id, i));
  if (new Set(seeds).size !== seeds.length) throw new Error(`${set.id}: duplicate seeds generated`);
  return seeds;
}

const args = parseArgs();
mkdirSync(SEEDS_DIR, { recursive: true });

const generated = SETS.map((set) => ({ set, seeds: generate(set) }));

const evalSeeds = new Set(generated.find((g) => g.set.id === 'eval-v1').seeds);
const overlap = generated.find((g) => g.set.id === 'train-v1').seeds.filter((s) => evalSeeds.has(s));
if (overlap.length > 0) throw new Error(`train-v1 overlaps eval-v1 on ${overlap.length} seeds`);

for (const { set, seeds } of generated) {
  const file = seedSetPath(set.id);
  if (existsSync(file) && !args.force) {
    console.log(`${set.id}: already exists and is frozen, left alone`);
    continue;
  }
  if (existsSync(file) && args.force) {
    console.log(`${set.id}: WARNING, --force is overwriting a frozen set. `
      + 'Every result previously measured on it becomes incomparable.');
  }
  const payload = {
    id: set.id,
    frozen: true,
    created: new Date().toISOString().slice(0, 10),
    count: set.count,
    purpose: set.purpose,
    generator: 'sha256("nbs-seeds:<id>:<index>") first 8 bytes big-endian as uint64; '
      + 'see 03_train/lab/cli/make-seeds.js',
    checksum: seedsChecksum(seeds),
    seeds,
  };
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`${set.id}: wrote ${set.count} seeds, checksum ${payload.checksum.slice(0, 16)}...`);
}

console.log('eval-v1 and train-v1 verified disjoint.');
