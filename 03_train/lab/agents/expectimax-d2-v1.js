// expectimax-d2-v1 -- depth-2 lookahead over heuristic-v2's exact weights.
//
// The depth ablation's middle row: same eleven features, same bred weights,
// same tie-break as heuristic-v2 (whose module is immutable and imported
// here, so the sharing is mechanical, not copied numbers); the only added
// ingredient is an exact max-max over the two KNOWN blocks, the falling one
// and the honest preview. Any gain over heuristic-v2 on eval-v1 is
// attributable to that search and nothing else.

import { makeExpectimax } from './expectimax.js';
import heuristicV2 from './heuristic-v2.js';

export default makeExpectimax({
  name: 'expectimax-d2',
  version: 'v1',
  describe: 'depth-2 max-max over current block and honest preview, heuristic-v2 weights',
  weights: heuristicV2.weights,
  pins: heuristicV2.pins,
  depth: 2,
});
