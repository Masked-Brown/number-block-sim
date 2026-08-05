// throughput.js -- how fast the instrument runs, measured honestly.
//
//   node 03_train/lab/cli/throughput.js [--games 200] [--reps 5] [--out <file>]
//
// A single timed run on a laptop is not a throughput measurement. This machine
// varies by tens of per cent between identical runs, enough to swamp a real
// thirty per cent change in the work done, so a number quoted from one pass is
// a number that will be contradicted by the next pass and then argued about.
//
// So: repeat the same work N times and report the median, the range, and the
// best. The BEST run is the most informative single figure, because contention
// and thermal throttling can only ever make a run slower than the code
// deserves, never faster.

import { writeFileSync } from 'node:fs';
import os from 'node:os';

import { listAgents, getAgent } from '../agents/index.js';
import { loadSeedSet } from '../seeds.js';
import { playGame } from '../runner.js';
import { round } from '../metrics.js';
import { parseArgs, intArg } from './args.js';

const args = parseArgs();
const seedSet = loadSeedSet(args.seeds ?? 'eval-v1');
const games = intArg(args, 'games', 200);
const reps = intArg(args, 'reps', 5);
const ids = args.agent ? [args.agent] : listAgents().map((a) => a.id);
const seeds = seedSet.seeds.slice(0, games);

console.log(`throughput: ${games} games x ${reps} reps per agent on ${seedSet.id}`);
console.log(`${os.cpus()[0]?.model ?? 'unknown cpu'}, ${os.cpus().length} logical cores, node ${process.version}\n`);

const results = [];
for (const id of ids) {
  const agent = getAgent(id);
  const instance = agent.create({});
  // Warm the JIT on work that is not measured, so the first rep is not the
  // compiler's benchmark rather than the code's.
  for (let i = 0; i < Math.min(20, games); i++) playGame(instance, seeds[i]);

  const passes = [];
  let moves = 0;
  for (let rep = 0; rep < reps; rep++) {
    const cpu0 = process.cpuUsage();
    const t0 = Date.now();
    moves = 0;
    for (const seed of seeds) moves += playGame(instance, seed).moves.length;
    const ms = Date.now() - t0;
    const cpu = process.cpuUsage(cpu0);
    passes.push({
      wallMs: ms,
      cpuMs: round((cpu.user + cpu.system) / 1000, 0),
      gamesPerMinute: round((games / ms) * 60000, 0),
      movesPerSecond: round((moves / ms) * 1000, 0),
    });
  }
  const rates = passes.map((p) => p.gamesPerMinute).sort((a, b) => a - b);
  const entry = {
    agent: id,
    games,
    reps,
    movesPerGame: round(moves / games, 1),
    gamesPerMinute: {
      best: rates[rates.length - 1],
      median: rates[Math.floor((rates.length - 1) / 2)],
      worst: rates[0],
    },
    passes,
  };
  results.push(entry);
  console.log(`${id.padEnd(14)} best ${String(entry.gamesPerMinute.best).padStart(7)}  `
    + `median ${String(entry.gamesPerMinute.median).padStart(7)}  `
    + `worst ${String(entry.gamesPerMinute.worst).padStart(7)} games/min  `
    + `(${entry.movesPerGame} moves/game)`);
}

const payload = {
  what: 'Single-process throughput, repeated to survive machine noise. The best pass is the '
    + 'least contended and so the closest to what the code costs; the spread is the machine.',
  seedSet: { id: seedSet.id, checksum: seedSet.checksum },
  games,
  reps,
  machine: {
    cpu: os.cpus()[0]?.model ?? null,
    logicalCores: os.cpus().length,
    platform: `${os.platform()} ${os.release()}`,
    node: process.version,
  },
  results,
};

if (args.out) {
  writeFileSync(args.out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nwritten to ${args.out}`);
}
