// metrics.js -- turning a pile of games into a comparable summary.
//
// Quantile method is stated rather than assumed, because a ladder that
// compares medians has to compare them the same way every time: linear
// interpolation between order statistics (the R type 7 definition, the one
// Excel's PERCENTILE.INC and NumPy's default use). On 500 games the choice
// barely moves the number, but "barely" is not "documented".

export function quantile(sortedAscending, p) {
  const n = sortedAscending.length;
  if (n === 0) return null;
  if (n === 1) return sortedAscending[0];
  const h = (n - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  if (lo === hi) return sortedAscending[lo];
  return sortedAscending[lo] + (h - lo) * (sortedAscending[hi] - sortedAscending[lo]);
}

export function summarise(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { n: 0 };
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return {
    n,
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    p99: quantile(sorted, 0.99),
    max: sorted[n - 1],
    mean,
    stdev: Math.sqrt(variance),
    total: sum,
  };
}

// Counts by exact value, ascending by value. Used for the max-tile
// distribution, where the values are powers of two and the shape is the point.
export function distribution(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const total = values.length;
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ value, count, share: total ? count / total : 0 }));
}

// Merge counts (group size -> merges) summed across a set of games.
export function sumMergeCounts(records) {
  const out = {};
  for (const rec of records) {
    for (const [size, count] of Object.entries(rec.mergeCounts ?? {})) {
      out[size] = (out[size] ?? 0) + count;
    }
  }
  return out;
}

export function round(value, dp = 2) {
  if (value === null || value === undefined) return value;
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

// ---------------------------------------------------------------------------
// Uncertainty (added 2026-08-05, audit 0019 proposal 3)
//
// A ladder of point medians invites a reader to believe every gap it shows. Some
// of those gaps are 3x and some would vanish under a different 500 seeds, and
// nothing in the table said which. These two functions are how a row and a rung
// get an interval.
//
// The method is the plain percentile bootstrap: resample the 500 games WITH
// replacement, recompute the statistic, and read the 2.5th and 97.5th centiles
// of the resampled values. It assumes only that the 500 games are exchangeable
// draws, which they are by construction (independent seeds from a frozen set),
// and in particular it assumes nothing about the shape of the score
// distribution, which is heavily right-skewed and would break a normal
// approximation.
//
// PAIRED comparisons resample SEED INDICES, not the two rows separately: both
// agents sat the same paper, so seed i's difference is one observation and must
// travel as one. That is why the statistic below is a function of an index array
// rather than of values.

// mulberry32: a small, fast, well-distributed 32-bit PRNG. The bootstrap must be
// reproducible from its recorded seed, so nothing here touches Math.random.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Percentile-bootstrap interval for any statistic of n paired observations.
// `statistic(indices)` receives an Int32Array of n resampled indices into the
// original observations and returns one number.
export function bootstrapCI({ n, statistic, resamples = 10000, level = 0.95, seed = 20260805 }) {
  if (!Number.isInteger(n) || n < 2) throw new Error(`bootstrap needs at least 2 observations, got ${n}`);
  const rng = makeRng(seed);
  const draws = new Array(resamples);
  const idx = new Int32Array(n);
  for (let b = 0; b < resamples; b++) {
    for (let i = 0; i < n; i++) idx[i] = Math.floor(rng() * n);
    draws[b] = statistic(idx);
  }
  draws.sort((a, b) => a - b);
  const alpha = (1 - level) / 2;
  const identity = Int32Array.from({ length: n }, (_, i) => i);
  return {
    point: statistic(identity),
    lo: quantile(draws, alpha),
    hi: quantile(draws, 1 - alpha),
    level,
    resamples,
    seed,
    method: 'percentile bootstrap over seeds',
  };
}

// The median of a set of values addressed through an index array, without
// allocating a fresh array per resample beyond the scratch buffer given.
export function medianOfIndexed(values, indices, scratch) {
  const n = indices.length;
  const buf = scratch ?? new Float64Array(n);
  for (let i = 0; i < n; i++) buf[i] = values[indices[i]];
  const view = buf.length === n ? buf : buf.subarray(0, n);
  view.sort();
  return quantile(view, 0.5);
}

export function meanOfIndexed(values, indices) {
  let sum = 0;
  for (let i = 0; i < indices.length; i++) sum += values[indices[i]];
  return sum / indices.length;
}
