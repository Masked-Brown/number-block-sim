// probe-behaviour.js -- what does an agent actually DO, move by move.
//
//   node 03_train/lab/cli/probe-behaviour.js --agent heuristic-v0 [--games 100]
//        [--seeds train-v1] [--offset 500] [--out <file>]
//
// Plays the agent and, at every move, builds the context for EVERY candidate
// column (the same measurements the features read; measurements, never
// decisions) to record what was on offer and what was chosen. This is the
// instrument behind the campaign's strategic questions: does the agent take
// cheap pairs or bank bigger groups, how much burial does it accept relative
// to the best available, and does its max tile climb because it pushes or
// because it survives. Default seeds are train pool at an offset outside the
// breeding blocks; the probe is diagnostic, never a headline, so it stays off
// eval-v1 entirely.

import { writeFileSync } from 'node:fs';

import { newGame, spawnDistribution } from '../engine-link.js';
import { getAgent } from '../agents/index.js';
import { loadSeedSet } from '../seeds.js';
import { buildContext, getFeature } from '../features/index.js';
import { round, summarise } from '../metrics.js';
import { openColumns, lowestColumn } from '../board.js';
import { parseArgs, intArg } from './args.js';

const args = parseArgs();
const agent = getAgent(args.agent ?? 'heuristic-v0');
const seedSet = loadSeedSet(args.seeds ?? 'train-v1');
const games = intArg(args, 'games', 100);
const offset = intArg(args, 'offset', 500);
const seeds = seedSet.seeds.slice(offset, offset + games);
if (seeds.length < games) throw new Error('not enough seeds at that offset');

const strandRisk = getFeature('strand-risk');
const setupAdjacency = getFeature('setup-adjacency');

const instance = agent.create({});
const tally = {
  moves: 0,
  mergeAvailable: 0, // some candidate merges immediately
  mergeTaken: 0, // ... and the agent chose a merging candidate
  mergeDeclined: 0, // ... and the agent chose a non-merging candidate
  declinedButBanked: 0, // declined AND the chosen column banks a triple-or-better
  burialAccepted: 0, // chosen placement strictly worse on strand-risk than the best on offer
  burialMargins: [], // how much worse, when worse
  chosenStrand: [],
  bestStrand: [],
  maxTileAtBlock: {}, // blocks placed -> max tile, sampled every 25 blocks, all games pooled
  // Drift chasing: does the agent push its max tile (which drags the spawn
  // centre up, RULES.md 3) when more immediate points were on offer.
  raiseAvailable: 0, // some candidate raises the max tile
  chosenRaised: 0, // ... and the agent chose a raising candidate
  raisedOverHigherGain: 0, // chose a raise although another candidate scored strictly more now
  raiseDeclinedForGain: 0, // declined every raise for a strictly higher-scoring move
};
const perGame = [];

for (const seed of seeds) {
  let state = newGame(seed);
  let firstMaxTileClimbs = [];
  while (state.status === 'playing') {
    const open = openColumns(state.board);
    const candidates = open.length > 0 ? open : [lowestColumn(state.board)];
    const view = { state, current: state.current, next: state.nextValue, spawn: spawnDistribution(state) };
    const chosenCol = instance.choose(view);

    const contexts = candidates.map((col) => buildContext(state, col));
    const chosen = contexts.find((c) => c.col === chosenCol) ?? buildContext(state, chosenCol);
    const anyMerge = contexts.some((c) => c.scoreGain > 0);

    tally.moves += 1;
    if (anyMerge) {
      tally.mergeAvailable += 1;
      if (chosen.scoreGain > 0) tally.mergeTaken += 1;
      else {
        tally.mergeDeclined += 1;
        if (setupAdjacency.score(chosen) > 0) tally.declinedButBanked += 1;
      }
    }

    const raisers = contexts.filter((c) => c.after.maxTile > state.maxTile);
    if (raisers.length > 0) {
      tally.raiseAvailable += 1;
      const bestOtherGain = Math.max(...contexts.filter((c) => c.after.maxTile <= state.maxTile)
        .map((c) => c.scoreGain), -Infinity);
      if (chosen.after.maxTile > state.maxTile) {
        tally.chosenRaised += 1;
        if (bestOtherGain > chosen.scoreGain) tally.raisedOverHigherGain += 1;
      } else if (chosen.scoreGain > Math.max(...raisers.map((c) => c.scoreGain))) {
        tally.raiseDeclinedForGain += 1;
      }
    }

    const strands = contexts.map((c) => strandRisk.score(c));
    const chosenStrand = strandRisk.score(chosen);
    const bestStrand = Math.min(...strands);
    tally.chosenStrand.push(chosenStrand);
    tally.bestStrand.push(bestStrand);
    if (chosenStrand > bestStrand + 1e-12) {
      tally.burialAccepted += 1;
      tally.burialMargins.push(chosenStrand - bestStrand);
    }

    const prevMax = state.maxTile;
    state = chosen.after;
    if (state.maxTile > prevMax) firstMaxTileClimbs.push({ tile: state.maxTile, atBlock: state.blocksPlaced });
    if (state.blocksPlaced % 25 === 0) {
      (tally.maxTileAtBlock[state.blocksPlaced] ??= []).push(state.maxTile);
    }
  }
  perGame.push({
    seed: String(seed),
    score: state.score,
    maxTile: state.maxTile,
    blocksPlaced: state.blocksPlaced,
    mergeCounts: { ...state.mergeCounts },
    maxTileClimbs: firstMaxTileClimbs,
  });
}

const mergeCountsTotal = {};
for (const g of perGame) {
  for (const [size, n] of Object.entries(g.mergeCounts)) {
    mergeCountsTotal[size] = (mergeCountsTotal[size] ?? 0) + n;
  }
}

const result = {
  what: 'Per-move behaviour probe: what was on offer at every move versus what was chosen. '
    + 'Diagnostic instrument, train seeds only, never a headline number.',
  agent: agent.id,
  seedSet: { id: seedSet.id, checksum: seedSet.checksum, offset, games },
  moves: tally.moves,
  pairDiscipline: {
    mergeAvailableShare: round(tally.mergeAvailable / tally.moves, 4),
    takenWhenAvailable: round(tally.mergeTaken / Math.max(1, tally.mergeAvailable), 4),
    declinedWhenAvailable: round(tally.mergeDeclined / Math.max(1, tally.mergeAvailable), 4),
    declinedAndBankedInstead: round(tally.declinedButBanked / Math.max(1, tally.mergeDeclined), 4),
  },
  strandDiscipline: {
    burialAcceptedShare: round(tally.burialAccepted / tally.moves, 4),
    meanBurialMarginWhenAccepted: round(
      tally.burialMargins.reduce((a, b) => a + b, 0) / Math.max(1, tally.burialMargins.length), 5,
    ),
    meanChosenStrand: round(tally.chosenStrand.reduce((a, b) => a + b, 0) / tally.moves, 5),
    meanBestAvailableStrand: round(tally.bestStrand.reduce((a, b) => a + b, 0) / tally.moves, 5),
  },
  driftChasing: {
    raiseAvailableShare: round(tally.raiseAvailable / tally.moves, 4),
    chosenRaisedWhenAvailable: round(tally.chosenRaised / Math.max(1, tally.raiseAvailable), 4),
    raisedOverHigherGain: tally.raisedOverHigherGain,
    raiseDeclinedForGain: tally.raiseDeclinedForGain,
  },
  mergeCountsTotal,
  maxTileAtBlock: Object.fromEntries(
    Object.entries(tally.maxTileAtBlock).map(([blocks, tiles]) => {
      const s = summarise(tiles);
      return [blocks, { games: tiles.length, median: s.median, max: s.max }];
    }),
  ),
  score: (() => {
    const s = summarise(perGame.map((g) => g.score));
    return { n: s.n, median: round(s.median, 0), q1: round(s.q1, 0), q3: round(s.q3, 0), max: s.max };
  })(),
  perGame,
};

console.log(JSON.stringify({ ...result, perGame: undefined }, null, 2));
if (args.out) {
  writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`);
  console.error(`written to ${args.out}`);
}
