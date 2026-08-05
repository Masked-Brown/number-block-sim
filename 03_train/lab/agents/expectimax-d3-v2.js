// expectimax-d3-v2 -- the LEAK-FREE depth-3 row.
//
// Identical to expectimax-d3-v1 but for the leaf treatment: heuristic-v2's
// weights and pins imported from the immutable module, depth 3, one expectation
// layer over the unknown third block, coverage 0.9 (that truncation is part of
// this version's identity too, unchanged from v1 so the two rows differ by the
// leak fix alone), same tie-break.
//
// The leak v1 carried (audit 0019, 2026-08-05) bit one ply deeper here: the
// depth-3 leaf sits inside the third-block expectation, so `next-merge-ready`
// was scoring the engine's real FOURTH block. Here it is the exact expectation
// over the distribution that fourth block would be drawn from, given the
// hypothetical third block placed on that leaf's board. See expectimax.js's
// header for why that distribution is precisely the leaf context's `spawnNow`.

import { makeExpectimax } from './expectimax.js';
import heuristicV2 from './heuristic-v2.js';

export default makeExpectimax({
  name: 'expectimax-d3',
  version: 'v2',
  describe: 'depth-3 expectimax, third block expected over the live distribution at coverage 0.9, '
    + 'leak-free leaf (next-merge-ready expected over the live distribution), heuristic-v2 weights',
  weights: heuristicV2.weights,
  pins: heuristicV2.pins,
  depth: 3,
  coverage: 0.9,
  leafNext: 'expectation',
});
