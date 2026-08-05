// seeds.js -- loading a frozen seed set.
//
// A seed set is a committed, frozen file. eval-v1 is the exam: every headline
// comparison in this experiment runs on it, and it is never regenerated,
// extended or reordered, because a result is only comparable to another result
// if both sat the same paper. train-v1 is the practice pool, disjoint from
// eval by construction, and training never touches eval.
//
// Loading verifies the file against its own declared count and its own
// checksum, so a set that has been edited fails at load rather than quietly
// producing incomparable numbers.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { SEEDS_DIR, repoRelative } from './paths.js';

export function seedSetPath(id) {
  return path.join(SEEDS_DIR, `${id}.json`);
}

// The checksum covers the seed list only, so adding a note to the file's
// prose fields can never look like tampering with the exam.
export function seedsChecksum(seeds) {
  return createHash('sha256').update(seeds.join('\n')).digest('hex');
}

export function loadSeedSet(id) {
  const file = seedSetPath(id);
  const raw = readFileSync(file, 'utf8');
  const set = JSON.parse(raw);
  if (set.id !== id) throw new Error(`seed set ${file}: declares id ${set.id}`);
  if (!Array.isArray(set.seeds)) throw new Error(`seed set ${id}: no seeds array`);
  if (set.seeds.length !== set.count) {
    throw new Error(`seed set ${id}: declares ${set.count} seeds, holds ${set.seeds.length}`);
  }
  const checksum = seedsChecksum(set.seeds);
  if (set.checksum !== checksum) {
    throw new Error(`seed set ${id} has been modified: checksum ${checksum} `
      + `does not match the frozen ${set.checksum}. A frozen set is never edited; `
      + 'a different set is a new id.');
  }
  if (new Set(set.seeds).size !== set.seeds.length) {
    throw new Error(`seed set ${id}: duplicate seeds`);
  }
  return {
    id: set.id,
    file: repoRelative(file),
    frozen: set.frozen,
    count: set.count,
    checksum,
    purpose: set.purpose,
    seeds: set.seeds,
  };
}
