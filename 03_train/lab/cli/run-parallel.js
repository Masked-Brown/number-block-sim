// run-parallel.js -- play one registered agent on one seed set through the
// worker pool and write the standard run folder.
//
//   node 03_train/lab/cli/run-parallel.js --agent heuristic-v1 [--seeds eval-v1]
//        [--games N] [--slug <slug>] [--workers 6] [--replay-best] [--note ...]
//
// The parallel twin of run.js: same manifest-first discipline, same games.jsonl
// content in the same seed order (bit-identity is proven and tested in the lab
// suite), same summary maths. Registered agents only: an eval run is a
// headline row, and headline rows belong to named immutable versions.

import path from 'node:path';

import { getAgent, listAgents } from '../agents/index.js';
import { loadSeedSet } from '../seeds.js';
import { playGame, allocateRunDir } from '../runner.js';
import { runSeriesParallel, defaultWorkers } from '../parallel.js';
import { buildReplay, writeReplay } from '../replay.js';
import { repoRelative } from '../paths.js';
import { parseArgs, intArg } from './args.js';
import { round } from '../metrics.js';

const args = parseArgs();
if (args.help || !args.agent) {
  console.log('usage: node 03_train/lab/cli/run-parallel.js --agent <id> [--seeds eval-v1] '
    + '[--games N] [--slug <slug>] [--workers N] [--replay-best]');
  console.log(`agents: ${listAgents().map((a) => a.id).join(', ')}`);
  process.exit(args.help ? 0 : 1);
}

const agent = getAgent(args.agent);
const seedSet = loadSeedSet(args.seeds ?? 'eval-v1');
const games = intArg(args, 'games', seedSet.count);
const workers = intArg(args, 'workers', defaultWorkers());
const slug = args.slug ?? `${agent.id}-${seedSet.id}`;

const { runId, dir } = allocateRunDir(slug);
console.log(`run ${runId}: ${agent.id} on ${seedSet.id}, ${games} games, ${workers} workers`);

const { summary } = await runSeriesParallel({
  agent,
  seedSet,
  games,
  dir,
  workers,
  note: args.note ?? null,
  onProgress: (done, total) => { if (done % 50 === 0) process.stdout.write(`\r  ${done}/${total}`); },
});
process.stdout.write('\r');

console.log(`  median ${summary.score.median}  q1 ${summary.score.q1}  q3 ${summary.score.q3}  `
  + `mean ${round(summary.score.mean, 1)}  max ${summary.score.max}`);
console.log(`  ${summary.throughput.gamesPerMinute} games/min over ${summary.throughput.workers} workers, `
  + `${summary.throughput.wallMs} ms wall`);

if (args['replay-best']) {
  const inst = agent.create({});
  const best = playGame(inst, summary.bestGame.seed, { explain: true });
  if (best.metrics.score !== summary.bestGame.score) {
    throw new Error(`replaying the best game gave ${best.metrics.score}, the run recorded ${summary.bestGame.score}`);
  }
  const replay = buildReplay({
    agent,
    seed: best.seed,
    moves: best.moves,
    reasoning: best.reasoning,
    finalState: best.finalState,
    note: `best of ${games} games on ${seedSet.id}, run ${runId}`,
  });
  const file = path.join(dir, 'best-game.replay.json');
  writeReplay(replay, file);
  console.log(`  best game replay: ${repoRelative(file)} (score ${best.metrics.score}, verified)`);
}

console.log(`written to ${repoRelative(dir)}`);
