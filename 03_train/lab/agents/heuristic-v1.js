// heuristic-v1 -- the first BRED weight vector, champion of breed
// 2026-08-05_breed-h0 (CEM from heuristic-v0, generation 3, rng seed
// 20260805; the full curve is in that run's generations.jsonl).
//
// Fitness 159,208 median on the train-v1 fitness block (seeds 0-149);
// validated 144,168 against v0's 108,700 on 500 HELD-OUT train seeds
// (offset 1000), head-to-head 293/500. Weights are the exact bred values,
// frozen forever; a further breed is a new version.
//
// What the breed decided, read against v0's hand-set reasoning: every
// survival cost is priced far harder (height 2.2x, strand risk 3.4x, spawn
// pressure 2.7x), taking the merge in front of you is worth 3.6x what v0
// paid for it, and SETUP-ADJACENCY FLIPS SIGN: deliberately banking triples
// and quads around an open landing cell is a liability at depth 1, because a
// bank must be closed by exactly the right tile before the board rises, and
// a one-move agent cannot steer the spawn to close it. The judgement lives
// in the weights, the maths in the shared factory: given identical weights
// the factory reproduces v0 move for move (asserted in the lab suite), so
// v1 and v0 differ in judgement only.

import { makeWeightedAgent } from './weighted.js';

const PINS = Object.freeze({
  'immediate-merge-value': 1,
  'chain-potential': 1,
  'setup-adjacency': 1,
  'column-flexibility': 1,
  'height-cost': 1,
  'unevenness-cost': 1,
  'strand-risk': 1,
  'spawn-pressure': 1,
  'game-over-risk': 1,
});

const WEIGHTS = Object.freeze({
  'immediate-merge-value': 3.643384346980847,
  'chain-potential': 2.109219312324528,
  'setup-adjacency': -0.4689263027890613,
  'column-flexibility': 0.5967793973043165,
  'height-cost': -4.417581215885435,
  'unevenness-cost': -0.27005858064800325,
  'strand-risk': -3.44008481417164,
  'spawn-pressure': -4.084230482319334,
  'game-over-risk': -1000,
});

export default makeWeightedAgent({
  name: 'heuristic',
  version: 'v1',
  describe: 'bred weight vector over the nine v0 features (CEM, run 2026-08-05_breed-h0)',
  weights: WEIGHTS,
  pins: PINS,
});
