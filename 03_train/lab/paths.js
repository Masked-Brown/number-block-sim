// paths.js -- where things live, resolved from this file rather than from the
// working directory, so every CLI behaves the same wherever it is invoked.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LAB_DIR = path.dirname(fileURLToPath(import.meta.url));
export const STAGE_DIR = path.dirname(LAB_DIR); // 03_train
export const REPO_ROOT = path.dirname(STAGE_DIR);

export const SEEDS_DIR = path.join(STAGE_DIR, 'seeds');
export const OUTPUT_DIR = path.join(STAGE_DIR, 'output');
export const RUNS_DIR = path.join(OUTPUT_DIR, 'runs');
export const SAMPLES_DIR = path.join(OUTPUT_DIR, 'samples');

// Repo-relative, forward-slashed, for anything written into a record.
export function repoRelative(absolute) {
  return path.relative(REPO_ROOT, absolute).split(path.sep).join('/');
}
