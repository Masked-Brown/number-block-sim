// ladder-uncertainty.js -- how much of the ladder would survive another 500 seeds.
//
//   node 03_train/lab/cli/ladder-uncertainty.js --runs <dir>,<dir>,... --out <dir>
//        [--resamples 10000] [--seed 20260805] [--horizons 128,256,384,512]
//        [--pairs a-v1:b-v2,...] [--note "what else is in the output folder"]
//
// Audit 0019, proposal 3. The campaign's ladder quoted point medians and paired
// win counts and said nothing about how firm either was, which invites a reader
// to believe every gap in the table equally. This adds three things, all of them
// computed from the per-game lines already recorded (`games.jsonl`) plus replays
// of those same recorded games through the engine. NO new games are played and no
// agent is asked for a decision, so nothing here can change a result: it can only
// describe one.
//
//   1. A bootstrap interval on every row's median.
//   2. A PAIRED interval per rung. Both agents sat the same 500 seeds, so seed
//      i's difference is one observation; resampling seeds keeps the pairing,
//      which is what makes a 1.5x gap on shared seeds far tighter than two
//      independent medians would suggest.
//   3. A fixed-horizon panel: the score each agent had reached at N blocks
//      placed. The ladder's medians are end-of-game scores, and score compounds
//      with survival (RULES.md 5), so a better agent's advantage is partly that
//      it lives longer. At a fixed horizon everybody gets the same number of
//      blocks, which separates "scores faster" from "survives longer". 256 is the
//      human-relevant horizon: AB's practised game placed 256 blocks.
//
// The reading lives in the run's SUMMARY.md; this file only computes.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { newGame, play, CONFIG } from '../engine-link.js';
import { engineProvenance, HARNESS_VERSION } from '../manifest.js';
import {
  quantile, summarise, round, bootstrapCI, medianOfIndexed, meanOfIndexed,
} from '../metrics.js';
import { repoRelative } from '../paths.js';
import { parseArgs, intArg } from './args.js';

const args = parseArgs();
if (!args.runs || !args.out) {
  console.error('usage: node 03_train/lab/cli/ladder-uncertainty.js --runs <dir>,<dir>,... --out <dir>');
  process.exit(1);
}

const resamples = intArg(args, 'resamples', 10000);
const bootSeed = intArg(args, 'seed', 20260805);
const horizons = String(args.horizons ?? '128,256,384,512').split(',').map((h) => Number(h.trim()));
const level = 0.95;

// ---------------------------------------------------------------------------
// Load

function loadRow(dir) {
  const summary = JSON.parse(readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const games = readFileSync(path.join(dir, 'games.jsonl'), 'utf8')
    .trim().split('\n').map((line) => JSON.parse(line));
  return {
    agent: summary.agent,
    runId: summary.runId,
    dir: repoRelative(path.resolve(dir)),
    seedSet: summary.seedSet,
    spawn: manifest.spawn ?? CONFIG.spawn,
    games,
    scores: games.map((g) => g.score),
    blocks: games.map((g) => g.blocksPlaced),
  };
}

const rows = String(args.runs).split(',').filter(Boolean).map(loadRow);

const seedSets = new Set(rows.map((r) => r.seedSet));
const counts = new Set(rows.map((r) => r.games.length));
if (seedSets.size !== 1 || counts.size !== 1) {
  throw new Error(`refusing a mixed panel: seed sets ${[...seedSets]}, game counts ${[...counts]}`);
}
const n = rows[0].games.length;

// Every row must be the same seeds in the same order, or a paired statistic is a
// lie. The runner writes them in seed-set order, so this is a check, not a sort.
const reference = rows[0].games.map((g) => String(g.seed));
for (const row of rows) {
  const mine = row.games.map((g) => String(g.seed));
  for (let i = 0; i < n; i++) {
    if (mine[i] !== reference[i]) {
      throw new Error(`${row.agent} game ${i} is seed ${mine[i]}, ${rows[0].agent} has ${reference[i]}`);
    }
  }
}

console.log(`${rows.length} rows x ${n} games on ${[...seedSets][0]}, `
  + `${resamples} bootstrap resamples at seed ${bootSeed}`);

// ---------------------------------------------------------------------------
// 1. Per-row median intervals

const scratch = new Float64Array(n);

for (const row of rows) {
  const values = Float64Array.from(row.scores);
  row.medianCI = bootstrapCI({
    n,
    statistic: (idx) => medianOfIndexed(values, idx, scratch),
    resamples,
    level,
    seed: bootSeed,
  });
  row.meanCI = bootstrapCI({
    n,
    statistic: (idx) => meanOfIndexed(values, idx),
    resamples,
    level,
    seed: bootSeed + 1,
  });
  const s = summarise(row.scores);
  row.stats = { median: s.median, q1: s.q1, q3: s.q3, mean: s.mean, min: s.min, max: s.max };
}
rows.sort((a, b) => b.stats.median - a.stats.median);
console.log('  row medians done');

// ---------------------------------------------------------------------------
// 2. Paired rung intervals

function pairedRung(high, low) {
  const a = Float64Array.from(high.scores);
  const b = Float64Array.from(low.scores);
  const diff = Float64Array.from({ length: n }, (_, i) => a[i] - b[i]);
  const win = Float64Array.from({ length: n }, (_, i) => (a[i] > b[i] ? 1 : 0));
  const scratchA = new Float64Array(n);
  const scratchB = new Float64Array(n);
  return {
    high: high.agent,
    low: low.agent,
    medianRatio: bootstrapCI({
      n,
      statistic: (idx) => medianOfIndexed(a, idx, scratchA) / medianOfIndexed(b, idx, scratchB),
      resamples,
      level,
      seed: bootSeed + 2,
    }),
    medianPairedDifference: bootstrapCI({
      n,
      statistic: (idx) => medianOfIndexed(diff, idx, scratchA),
      resamples,
      level,
      seed: bootSeed + 3,
    }),
    winRate: bootstrapCI({
      n,
      statistic: (idx) => meanOfIndexed(win, idx),
      resamples,
      level,
      seed: bootSeed + 4,
    }),
    wins: win.reduce((x, y) => x + y, 0),
  };
}

const byAgent = new Map(rows.map((r) => [r.agent, r]));
const pairs = [];
for (let i = 0; i + 1 < rows.length; i++) pairs.push([rows[i], rows[i + 1]]);
for (const spec of String(args.pairs ?? '').split(',').filter(Boolean)) {
  const [hi, lo] = spec.split(':');
  const high = byAgent.get(hi);
  const low = byAgent.get(lo);
  if (!high || !low) throw new Error(`--pairs names an absent row: ${spec}`);
  pairs.push([high, low]);
}
const rungs = pairs.map(([high, low]) => pairedRung(high, low));
console.log(`  ${rungs.length} paired rungs done`);

// ---------------------------------------------------------------------------
// 3. Fixed-horizon panel
//
// Replay each recorded game through the engine and read the score at each
// horizon. A game that ended before a horizon keeps its final score there: it
// had its chance at those blocks and did not survive to use them, which is
// exactly the thing the panel is measuring against.

const maxHorizon = Math.max(...horizons);
for (const row of rows) {
  const atHorizon = new Map(horizons.map((h) => [h, []]));
  const survived = new Map(horizons.map((h) => [h, 0]));
  for (const game of row.games) {
    let state = newGame(game.seed, row.spawn);
    const marks = new Map();
    for (const move of game.moves) {
      if (state.status !== 'playing') break;
      state = play(state, move).state;
      if (horizons.includes(state.blocksPlaced)) marks.set(state.blocksPlaced, state.score);
      if (state.blocksPlaced >= maxHorizon && marks.size === horizons.length) break;
    }
    for (const h of horizons) {
      if (marks.has(h)) {
        atHorizon.get(h).push(marks.get(h));
        survived.set(h, survived.get(h) + 1);
      } else {
        atHorizon.get(h).push(state.score); // died first; this is what it managed
      }
    }
  }
  row.horizons = horizons.map((h) => {
    const values = Float64Array.from(atHorizon.get(h));
    const ci = bootstrapCI({
      n,
      statistic: (idx) => medianOfIndexed(values, idx, scratch),
      resamples,
      level,
      seed: bootSeed + 5,
    });
    const sorted = [...atHorizon.get(h)].sort((x, y) => x - y);
    return {
      blocks: h,
      median: quantile(sorted, 0.5),
      q1: quantile(sorted, 0.25),
      q3: quantile(sorted, 0.75),
      ci: { lo: ci.lo, hi: ci.hi },
      survivedShare: survived.get(h) / n,
    };
  });
  console.log(`  horizon panel: ${row.agent}`);
}

// Paired horizon comparisons for the depth rungs: same shape as the rungs above
// but on the fixed-horizon score, so the ordering can be checked with survival
// held constant.
for (const rung of rungs) {
  const high = byAgent.get(rung.high);
  const low = byAgent.get(rung.low);
  rung.atHorizons = horizons.map((h) => {
    const hi = high.horizons.find((x) => x.blocks === h).median;
    const lo = low.horizons.find((x) => x.blocks === h).median;
    return { blocks: h, highMedian: hi, lowMedian: lo, ratio: lo > 0 ? hi / lo : null };
  });
}

// ---------------------------------------------------------------------------
// Write

const outDir = args.out;
mkdirSync(outDir, { recursive: true });

const manifest = {
  runId: path.basename(path.resolve(outDir)),
  kind: 'measurement',
  createdAt: new Date().toISOString(),
  harness: { name: 'nbs-lab', version: HARNESS_VERSION, node: process.version },
  what: 'Bootstrap uncertainty for every ladder row, paired intervals per rung, and a '
    + 'fixed-horizon score panel, all derived from recorded games (audit 0019 proposal 3). '
    + 'No games played, no agent consulted.'
    + (args.note ? ` ${args.note}` : ''),
  sources: rows.map((r) => ({ agent: r.agent, runId: r.runId, dir: r.dir })),
  bootstrap: { resamples, level, seed: bootSeed, method: 'percentile bootstrap over seeds' },
  horizons,
  engine: engineProvenance(),
};
writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const payload = {
  seedSet: [...seedSets][0],
  games: n,
  bootstrap: manifest.bootstrap,
  horizons,
  rows: rows.map((r) => ({
    agent: r.agent,
    runId: r.runId,
    stats: r.stats,
    medianCI: r.medianCI,
    meanCI: r.meanCI,
    horizons: r.horizons,
  })),
  rungs,
};
writeFileSync(path.join(outDir, 'uncertainty.json'), `${JSON.stringify(payload, null, 2)}\n`);

// ---------------------------------------------------------------------------
// The tables

const fmt = (x) => (x === null || x === undefined ? 'n/a' : Math.round(x).toLocaleString('en-GB'));
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const out = [];
out.push('<!-- generated by 03_train/lab/cli/ladder-uncertainty.js; do not hand-edit -->');
out.push('');
out.push(`# Ladder uncertainty: ${rows.length} rows x ${n} games on ${[...seedSets][0]}`);
out.push('');
out.push(`Percentile bootstrap, ${resamples.toLocaleString('en-GB')} resamples over seeds, `
  + `${level * 100}% intervals, rng seed ${bootSeed}. Paired statistics resample SEEDS, so both `
  + 'agents are always compared on the same games.');
out.push('');
out.push('## Median game score, with interval');
out.push('');
out.push('| agent | median | 95% CI | q1 | q3 | mean | mean 95% CI |');
out.push('|---|---:|---|---:|---:|---:|---|');
for (const r of rows) {
  out.push(`| ${r.agent} | ${fmt(r.stats.median)} | ${fmt(r.medianCI.lo)} to ${fmt(r.medianCI.hi)} `
    + `| ${fmt(r.stats.q1)} | ${fmt(r.stats.q3)} | ${fmt(r.stats.mean)} `
    + `| ${fmt(r.meanCI.lo)} to ${fmt(r.meanCI.hi)} |`);
}
out.push('');
out.push('## Rungs, paired on shared seeds');
out.push('');
out.push('| rung | median ratio | ratio 95% CI | median paired difference | difference 95% CI | wins | win rate 95% CI |');
out.push('|---|---:|---|---:|---|---:|---|');
for (const g of rungs) {
  out.push(`| ${g.high} over ${g.low} | ${g.medianRatio.point.toFixed(2)}x `
    + `| ${g.medianRatio.lo.toFixed(2)} to ${g.medianRatio.hi.toFixed(2)} `
    + `| ${fmt(g.medianPairedDifference.point)} `
    + `| ${fmt(g.medianPairedDifference.lo)} to ${fmt(g.medianPairedDifference.hi)} `
    + `| ${g.wins}/${n} | ${pct(g.winRate.lo)} to ${pct(g.winRate.hi)} |`);
}
out.push('');
out.push('An interval on the paired difference that excludes zero, or a win-rate interval that');
out.push('excludes 50 per cent, is a rung that would survive a different 500 seeds.');
out.push('');
out.push('## Fixed-horizon panel: median score at N blocks placed');
out.push('');
out.push(`| agent | ${horizons.map((h) => `${h} blocks`).join(' | ')} |`);
out.push(`|---|${horizons.map(() => '---:').join('|')}|`);
for (const r of rows) {
  out.push(`| ${r.agent} | ${r.horizons.map((h) => fmt(h.median)).join(' | ')} |`);
}
out.push('');
out.push('With intervals, and the share of games that were still alive at that horizon:');
out.push('');
out.push('| agent | horizon | median | 95% CI | q1 | q3 | still alive |');
out.push('|---|---:|---:|---|---:|---:|---:|');
for (const r of rows) {
  for (const h of r.horizons) {
    out.push(`| ${r.agent} | ${h.blocks} | ${fmt(h.median)} | ${fmt(h.ci.lo)} to ${fmt(h.ci.hi)} `
      + `| ${fmt(h.q1)} | ${fmt(h.q3)} | ${pct(h.survivedShare)} |`);
  }
}
out.push('');
out.push('A game that ended before a horizon carries its final score at that horizon: it had those');
out.push('blocks available and did not survive to use them, which is part of what is being compared.');
out.push('');
out.push('## Rung ratios at a fixed horizon');
out.push('');
out.push(`| rung | ${horizons.map((h) => `${h} blocks`).join(' | ')} | end of game |`);
out.push(`|---|${horizons.map(() => '---:').join('|')}|---:|`);
for (const g of rungs) {
  out.push(`| ${g.high} over ${g.low} | ${g.atHorizons.map((h) => (h.ratio === null ? 'n/a' : `${h.ratio.toFixed(2)}x`)).join(' | ')} `
    + `| ${g.medianRatio.point.toFixed(2)}x |`);
}
out.push('');

writeFileSync(path.join(outDir, 'UNCERTAINTY.md'), `${out.join('\n')}\n`);
console.log(`written to ${repoRelative(path.resolve(outDir))}`);
