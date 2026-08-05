// one-game.js -- play a single game and print its result as JSON.
//
//   node 03_train/lab/cli/one-game.js --agent heuristic-v0 --seed 12345
//
// Exists so the determinism proof can run a leg in a SEPARATE Node process:
// a repeat inside one process shares module state, a caching bug there would
// hide itself, and the claim being made is about the engine and the agent, not
// about one process's memory.

import { getAgent } from '../agents/index.js';
import { playGame } from '../runner.js';
import { parseArgs } from './args.js';

const args = parseArgs();
if (!args.agent || !args.seed) {
  console.error('usage: node 03_train/lab/cli/one-game.js --agent <id> --seed <seed>');
  process.exit(1);
}

const agent = getAgent(args.agent);
const game = playGame(agent.create({}), String(args.seed));
console.log(JSON.stringify({
  agent: agent.id,
  seed: game.seed,
  score: game.metrics.score,
  maxTile: game.metrics.maxTile,
  blocksPlaced: game.metrics.blocksPlaced,
  moveCount: game.metrics.moveCount,
  finalHash: game.metrics.finalHash,
}));
