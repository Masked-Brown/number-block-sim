// throughput-parallel.js -- pool throughput, measured the honest way.
//
//   node 03_train/lab/cli/throughput-parallel.js [--agent heuristic-v0]
//        [--games 200] [--reps 5] [--workers N] [--out <file>]
//
// Same discipline as throughput.js (this machine varies by tens of per cent
// between identical passes, so nothing is quoted from one run): each rep is a
// full pool lifecycle including worker startup, because that is what a real
// campaign pays, repeated `reps` times with best, median and worst reported.
// The serial baseline is measured in the same process run so the speedup
// figure compares like with like.

import { writeFileSync } from 'node:fs';
import os from 'node:os';

import { getAgent } from '../agents/index.js';
import { loadSeedSet } from '../seeds.js';
import { playGame } from '../runner.js';
import { playSeedsParallel, defaultWorkers } from '../parallel.js';
import { round } from '../metrics.js';
import { parseArgs, intArg } from './args.js';

const args = parseArgs();
const agent = getAgent(args.agent ?? 'heuristic-v0');
const seedSet = loadSeedSet(args.seeds ?? 'eval-v1');
const games = intArg(args, 'games', 200);
const reps = intArg(args, 'reps', 5);
const workers = intArg(args, 'workers', defaultWorkers());
const seeds = seedSet.seeds.slice(0, games);

console.log(`throughput-parallel: ${agent.id}, ${games} games x ${reps} reps, ${workers} workers`);
console.log(`${os.cpus()[0]?.model ?? 'unknown cpu'}, ${os.cpus().length} logical cores, node ${process.version}\n`);

function summariseRates(passes) {
  const rates = passes.map((p) => p.gamesPerMinute).sort((a, b) => a - b);
  return { best: rates[rates.length - 1], median: rates[Math.floor((rates.length - 1) / 2)], worst: rates[0] };
}

// Serial baseline, warmed, same seeds.
const instance = agent.create({});
for (let i = 0; i < Math.min(20, games); i++) playGame(instance, seeds[i]);
const serialPasses = [];
for (let rep = 0; rep < reps; rep++) {
  const t0 = Date.now();
  for (const seed of seeds) playGame(instance, seed);
  const ms = Date.now() - t0;
  serialPasses.push({ wallMs: ms, gamesPerMinute: round((games / ms) * 60000, 0) });
}
const serial = summariseRates(serialPasses);
console.log(`serial   best ${String(serial.best).padStart(7)}  median ${String(serial.median).padStart(7)}  worst ${String(serial.worst).padStart(7)} games/min`);

// Pool, each rep a full lifecycle.
const parallelPasses = [];
for (let rep = 0; rep < reps; rep++) {
  const t0 = Date.now();
  await playSeedsParallel({ agentSpec: { id: agent.id }, seeds, workers, includeMoves: false });
  const ms = Date.now() - t0;
  parallelPasses.push({ wallMs: ms, gamesPerMinute: round((games / ms) * 60000, 0) });
}
const parallel = summariseRates(parallelPasses);
console.log(`parallel best ${String(parallel.best).padStart(7)}  median ${String(parallel.median).padStart(7)}  worst ${String(parallel.worst).padStart(7)} games/min`);
console.log(`speedup (best over best): ${round(parallel.best / serial.best, 2)}x over ${workers} workers`);

const payload = {
  what: 'Worker-pool throughput against a serial baseline, repeated to survive machine noise. '
    + 'Each parallel rep includes the full pool lifecycle, worker startup included, because '
    + 'that is what a campaign pays.',
  agent: agent.id,
  seedSet: { id: seedSet.id, checksum: seedSet.checksum },
  games,
  reps,
  workers,
  machine: {
    cpu: os.cpus()[0]?.model ?? null,
    logicalCores: os.cpus().length,
    platform: `${os.platform()} ${os.release()}`,
    node: process.version,
  },
  serial: { gamesPerMinute: serial, passes: serialPasses },
  parallel: { gamesPerMinute: parallel, passes: parallelPasses },
  speedupBestOverBest: round(parallel.best / serial.best, 2),
};

if (args.out) {
  writeFileSync(args.out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`written to ${args.out}`);
}
