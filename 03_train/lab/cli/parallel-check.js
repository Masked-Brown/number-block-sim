// parallel-check.js -- the bit-identity proof for the worker pool.
//
//   node 03_train/lab/cli/parallel-check.js [--agent heuristic-v0] [--games 100]
//                                           [--workers N] [--out <file>]
//
// Plays the same seeds serially and through the pool and compares every game
// record byte for byte (metrics AND the full move list, JSON-serialised the
// way games.jsonl serialises them). Exits non-zero on any mismatch, because a
// pool that reorders, drops or perturbs even one game is not an optimisation,
// it is a different experiment. Determinism discipline (work order
// orchestrated-training-campaign): any nondeterminism found here is a
// stop-and-report, not a workaround.

import { writeFileSync } from 'node:fs';

import { getAgent } from '../agents/index.js';
import { loadSeedSet } from '../seeds.js';
import { playGame } from '../runner.js';
import { playSeedsParallel, defaultWorkers, gameIdentity } from '../parallel.js';
import { parseArgs, intArg } from './args.js';

const args = parseArgs();
const agent = getAgent(args.agent ?? 'heuristic-v0');
const seedSet = loadSeedSet(args.seeds ?? 'eval-v1');
const games = intArg(args, 'games', 100);
const workers = intArg(args, 'workers', defaultWorkers());
const seeds = seedSet.seeds.slice(0, games);

console.log(`parallel-check: ${agent.id}, ${games} games of ${seedSet.id}, ${workers} workers`);

const t0 = Date.now();
const instance = agent.create({});
const serial = seeds.map((seed) => {
  const game = playGame(instance, seed);
  return JSON.stringify(gameIdentity({ ...game.metrics, moves: game.moves }));
});
const serialMs = Date.now() - t0;

const t1 = Date.now();
const parallel = await playSeedsParallel({ agentSpec: { id: agent.id }, seeds, workers });
const parallelMs = Date.now() - t1;
const parallelLines = parallel.map((r) => JSON.stringify(gameIdentity(r)));

const mismatches = [];
for (let i = 0; i < games; i++) {
  if (serial[i] !== parallelLines[i]) mismatches.push({ index: i, seed: String(seeds[i]) });
}

const verdict = {
  what: 'Bit-identity proof: serial and worker-pool records compared as serialised JSON, '
    + 'metrics and full move lists included. harnessMs is excluded: it is a wall-clock '
    + 'measurement of the harness, not of the game, and differs between any two runs, '
    + 'two serial ones included.',
  agent: agent.id,
  seedSet: { id: seedSet.id, checksum: seedSet.checksum },
  games,
  workers,
  identical: mismatches.length === 0,
  mismatches,
  wallMs: { serial: serialMs, parallel: parallelMs },
  note: 'wall times here are one pass each and are NOT the throughput measurement; '
    + 'see throughput-parallel.js for repeated timing',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(verdict, null, 2)}\n`);
console.log(`identical: ${verdict.identical} (${games} games, ${mismatches.length} mismatches)`);
console.log(`one-pass wall: serial ${serialMs} ms, parallel ${parallelMs} ms`);
if (!verdict.identical) {
  console.error('MISMATCH: the pool is not bit-identical to the serial runner. Stop and report.');
  process.exit(1);
}
