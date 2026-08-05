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
