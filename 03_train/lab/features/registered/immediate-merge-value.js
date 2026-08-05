// Immediate merge value: what this placement actually scored, right now.
//
// The engine already computed it (RULES.md 5: each merge scores its resulting
// value times the chain index), so this feature just reads the score delta
// rather than modelling merges itself. Log-scaled: the difference between
// scoring 0 and 8 matters far more than the difference between 400 and 408,
// and a raw delta would let one lucky cascade drown every other feature.

export default {
  name: 'immediate-merge-value',
  version: 1,
  status: 'active',
  describe: 'game score earned by this placement, log-scaled (0 when nothing merges)',
  score(ctx) {
    return Math.log2(1 + ctx.scoreGain);
  },
};
