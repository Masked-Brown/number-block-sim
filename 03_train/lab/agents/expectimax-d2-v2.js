// expectimax-d2-v2 -- the LEAK-FREE depth-2 row.
//
// Identical to expectimax-d2-v1 in every other respect: heuristic-v2's exact
// weights and pins (imported from the immutable module, never copied), depth 2,
// same tie-break, same candidate set. The one difference is the leaf treatment,
// and it is the honest one.
//
// What v1 did wrong (audit 0019, 2026-08-05). At depth 2 the positional half of
// the evaluation is read at the leaf, one ply past the honest preview. There
// `next-merge-ready` scored `ctx.next`, which on a simulated state is the THIRD
// block: drawn by the engine because the engine is deterministic, but invisible
// to any player. The agent was therefore rewarded for arranging a board around
// a block it could not know was coming.
//
// What this version does instead: at the leaf, `next-merge-ready` is scored as
// the EXACT expectation of its own maths over the live distribution the third
// block will be drawn from, which is the distribution of the board the leaf sits
// on (RULES.md 3, 7; BUILD.md decision 4). Nothing else changes, and the feature
// module itself is untouched at version 1, so this row and v1's differ by
// exactly one thing: whether the leaf peeks or integrates.

import { makeExpectimax } from './expectimax.js';
import heuristicV2 from './heuristic-v2.js';

export default makeExpectimax({
  name: 'expectimax-d2',
  version: 'v2',
  describe: 'depth-2 max-max over current block and honest preview, leak-free leaf '
    + '(next-merge-ready expected over the live distribution), heuristic-v2 weights',
  weights: heuristicV2.weights,
  pins: heuristicV2.pins,
  depth: 2,
  leafNext: 'expectation',
});
