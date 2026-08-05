// expectimax-d3-v1 -- depth-3 expectimax over heuristic-v2's exact weights.
//
// The depth ablation's top row: heuristic-v2's evaluation (immutable module,
// imported), max-max over the two known blocks, then ONE expectation layer
// over the unknown third block using the live spawn distribution the engine
// itself would draw from (RULES.md 3, 7; BUILD.md decision 4). Coverage 0.9:
// the expectation is truncated to the most probable tiers reaching 90 per
// cent of the mass, renormalised, deterministic tie-break. That truncation is
// part of this version's identity and is recorded in every manifest; the
// campaign decision log holds the measurement behind the choice (about 1.8x
// faster than the full expectation, no observed cost to decision quality at
// probe sample sizes).

import { makeExpectimax } from './expectimax.js';
import heuristicV2 from './heuristic-v2.js';

export default makeExpectimax({
  name: 'expectimax-d3',
  version: 'v1',
  describe: 'depth-3 expectimax, third block expected over the live distribution at coverage 0.9, '
    + 'heuristic-v2 weights',
  weights: heuristicV2.weights,
  pins: heuristicV2.pins,
  depth: 3,
  coverage: 0.9,
});
