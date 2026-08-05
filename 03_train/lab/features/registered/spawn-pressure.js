// Spawn pressure: the share of what is coming that this board cannot meet.
//
// RULES.md 3 makes the spawn distribution a live function of the board, and
// RULES.md 7 requires the engine to expose it as a pure function precisely so
// the AI's lookahead uses the same numbers the UI shows. This feature is the
// reason that requirement exists.
//
// From the resulting board, take the exact live probabilities of the next
// draw. A tier is MET if some open landing cell already has a neighbour of
// that value, meaning a block of that tier could merge the moment it arrives.
// The pressure is the probability mass of the tiers that are not met: the
// chance that whatever comes next has nowhere to go but on top of the pile.
// Range 0 to 1, and a cost, so it carries a negative weight.

import { landingCells, occupiedNeighbours } from '../../board.js';

export default {
  name: 'spawn-pressure',
  version: 1,
  status: 'active',
  describe: 'live probability mass of next-draw tiers with no immediate home on the board',
  score(ctx) {
    const board = ctx.after.board;
    const met = new Set();
    for (const cell of landingCells(board)) {
      for (const n of occupiedNeighbours(board, cell.c, cell.r)) met.add(n.value);
    }
    let unmet = 0;
    for (const entry of ctx.spawnNext.entries) {
      if (!met.has(entry.value)) unmet += entry.probability;
    }
    return unmet;
  },
};
