// heuristic-v2 -- bred over ELEVEN features: the nine seeded ones plus the
// two the campaign's death-board inspection earned, tier-gap-cost (the
// fragmentation the worst games die of) and next-merge-ready (the honest
// preview, previously unread). Champion of breed 2026-08-05_breed-h1-features
// (CEM from heuristic-v1's weights, generation 5, rng seed 2; curve in that
// run's generations.jsonl).
//
// Fitness 228,442 median on the train-v1 fitness block; validated 209,102
// against v1's 144,168 on 500 HELD-OUT train seeds (uplift 1.45x,
// head-to-head 322/500).
//
// Read against v1, the new features rebalance the whole vector: with
// fragmentation priced (-1.70) and the preview in hand (+1.12), the agent no
// longer panic-merges (immediate-merge-value 3.64 back to 1.62) or hugs the
// floor (height-cost -4.42 back to -2.31); what it will not do at any price
// is bury a low tile (strand-risk -4.93, the harshest ordinary weight ever
// bred here) or leave the incoming distribution unanswered (spawn-pressure
// -4.37). setup-adjacency returns to barely positive (0.20) from v1's
// negative: banking is affordable once the preview says when it will pay.

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
  'tier-gap-cost': 1,
  'next-merge-ready': 1,
});

const WEIGHTS = Object.freeze({
  'immediate-merge-value': 1.6205247526845243,
  'chain-potential': 1.5925632347250156,
  'setup-adjacency': 0.20130692737178923,
  'column-flexibility': 0.7835496418108241,
  'height-cost': -2.309065683937778,
  'unevenness-cost': -1.21208090038321,
  'strand-risk': -4.926508042429592,
  'spawn-pressure': -4.370925782077923,
  'tier-gap-cost': -1.698705892238784,
  'next-merge-ready': 1.123835523100817,
  'game-over-risk': -1000,
});

export default makeWeightedAgent({
  name: 'heuristic',
  version: 'v2',
  describe: 'bred weight vector over eleven features, tier-gap-cost and next-merge-ready included '
    + '(CEM, run 2026-08-05_breed-h1-features)',
  weights: WEIGHTS,
  pins: PINS,
});
