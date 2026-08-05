// expectimax-d2-v1 -- depth-2 lookahead over heuristic-v2's exact weights.
//
// The depth ablation's middle row: same eleven features, same bred weights,
// same tie-break as heuristic-v2 (whose module is immutable and imported
// here, so the sharing is mechanical, not copied numbers); the only added
// ingredient is a max-max over the two KNOWN blocks, the falling one and the
// honest preview.
//
// SUPERSEDED BY expectimax-d2-v2 (leak fix, audit 0019, 2026-08-05). This
// version's leaf evaluation scores `next-merge-ready` against the engine's real
// third block, which the engine had drawn but no player could see, so its rows
// are not an honest measure of depth-2 play. It is kept registered and
// unchanged because its 500 recorded eval games are the measurement of what the
// leak was worth: the leaf mode below is now stated explicitly rather than
// inherited from a default, and the run of 2026-08-05_eval-expectimax-d2-v1
// reproduces bit-for-bit under it.

import { makeExpectimax } from './expectimax.js';
import heuristicV2 from './heuristic-v2.js';

export default makeExpectimax({
  name: 'expectimax-d2',
  version: 'v1',
  describe: 'depth-2 max-max over current block and honest preview, heuristic-v2 weights',
  weights: heuristicV2.weights,
  pins: heuristicV2.pins,
  depth: 2,
  leafNext: 'engine-draw',
});
