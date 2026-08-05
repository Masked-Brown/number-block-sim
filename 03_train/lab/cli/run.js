// run.js -- play one agent on one seed set and write a run folder.
//
//   node 03_train/lab/cli/run.js --agent heuristic-v0 --seeds eval-v1 --games 500 \
//                                --slug heuristic-v0-eval [--replay-best]
//
// Writes 03_train/output/runs/<YYYY-MM-DD>_<slug>/ containing manifest.json
// (written first, before any game), games.jsonl (one line per game, streamed)
// and summary.json. Optionally re-plays the best game with reasoning on and
// saves it as an enriched replay beside them.

import path from 'node:path';

import { getAgent, listAgents } from '../agents/index.js';
import { loadSeedSet } from '../seeds.js';
import { runSeries, playGame, allocateRunDir } from '../runner.js';
import { buildReplay, writeReplay } from '../replay.js';
import { repoRelative } from '../paths.js';
import { parseArgs, intArg } from './args.js';
import { round } from '../metrics.js';

const args = parseArgs();
if (args.help || !args.agent) {
  console.log('usage: node 03_train/lab/cli/run.js --agent <id> [--seeds eval-v1] '
    + '[--games N] [--slug <slug>] [--replay-best]');
  console.log(`agents: ${listAgents().map((a) => a.id).join(', ')}`);
  process.exit(args.help ? 0 : 1);
}

const agent = getAgent(args.agent);
const seedSet = loadSeedSet(args.seeds ?? 'eval-v1');
const games = intArg(args, 'games', seedSet.count);
const slug = args.slug ?? `${agent.id}-${seedSet.id}`;

const { runId, dir } = allocateRunDir(slug);
console.log(`run ${runId}: ${agent.id} on ${seedSet.id}, ${games} games`);

const { summary } = runSeries({
  agent,
  seedSet,
  games,
  dir,
  note: args.note ?? null,
  onProgress: (done, total) => process.stdout.write(`\r  ${done}/${total}`),
});
process.stdout.write('\r');

console.log(`  median ${summary.score.median}  q1 ${summary.score.q1}  q3 ${summary.score.q3}  `
  + `mean ${round(summary.score.mean, 1)}  max ${summary.score.max}`);
console.log(`  ${summary.throughput.gamesPerMinute} games/min, ${summary.throughput.wallMs} ms wall`);

if (args['replay-best']) {
  const inst = agent.create({});
  const best = playGame(inst, summary.bestGame.seed, { explain: true });
  const replay = buildReplay({
    agent,
    seed: best.seed,
    moves: best.moves,
    reasoning: best.reasoning,
    finalState: best.finalState,
    note: `best of ${games} games on ${seedSet.id}`,
  });
  const file = path.join(dir, `best-game.replay.json`);
  writeReplay(replay, file);
  console.log(`  best game replay: ${repoRelative(file)} (score ${best.metrics.score}, verified)`);
}

console.log(`written to ${repoRelative(dir)}`);
