// campaign.js -- the smoke campaign: the four-agent ladder on eval-v1.
//
//   node 03_train/lab/cli/campaign.js [--games 500] [--slug smoke-ladder]
//
// Produces one run folder holding: a campaign manifest, one series folder per
// agent (each with its own manifest, streamed games.jsonl and summary.json),
// the supplementary stacker sweep that answers the centre-stacking question,
// the determinism proof, and the machine-written ladder tables. The run's prose
// summary (SUMMARY.md, closing with candidate findings for the register) is
// authored by hand: a script can tabulate, it cannot judge.

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { getAgent, makeStacker, makeStrictStacker } from '../agents/index.js';
import { loadSeedSet } from '../seeds.js';
import { runSeries, playGame, allocateRunDir } from '../runner.js';
import { buildReplay, writeReplay } from '../replay.js';
import { proveDeterminism } from '../determinism.js';
import { engineProvenance, HARNESS_VERSION } from '../manifest.js';
import { SAMPLES_DIR, repoRelative } from '../paths.js';
import { round } from '../metrics.js';
import { COLS } from '../board.js';
import { CONFIG } from '../engine-link.js';
import { parseArgs, intArg } from './args.js';

const args = parseArgs();
const seedSet = loadSeedSet(args.seeds ?? 'eval-v1');
const games = intArg(args, 'games', 500);
const LADDER = ['random-v1', 'greedy-v1', 'stacker-v1', 'heuristic-v0'];

const { runId, dir } = allocateRunDir(args.slug ?? 'smoke-ladder');
console.log(`campaign ${runId}: ${LADDER.length} agents x ${games} games on ${seedSet.id}\n`);

const campaignStart = Date.now();

// ---------------------------------------------------------------------------
// The ladder

const series = [];
for (const id of LADDER) {
  const agent = getAgent(id);
  process.stdout.write(`${id.padEnd(14)} `);
  const result = runSeries({
    agent,
    seedSet,
    games,
    dir: path.join(dir, id),
    note: `smoke campaign ladder leg, run ${runId}`,
    onProgress: (done, total) => process.stdout.write(`\r${id.padEnd(14)} ${done}/${total}`),
  });
  const s = result.summary;
  console.log(`\r${id.padEnd(14)} median ${String(s.score.median).padStart(9)}  `
    + `mean ${String(round(s.score.mean, 0)).padStart(9)}  max ${String(s.score.max).padStart(9)}  `
    + `${String(s.throughput.gamesPerMinute).padStart(6)} g/min`);
  series.push({ agent, ...result });
}

// ---------------------------------------------------------------------------
// Supplementary: the stacker sweep.
//
// Two questions BUILD.md's observation raises and the four-agent ladder cannot
// answer on its own. First, is the CENTRE column special, or is stacking
// column-invariant. Second, how much of the registered stacker's score comes
// from the SPILL (its fallback to the shortest column once the home column
// fills) rather than from stacking. The strict variant never spills and is
// what an unattended game literally does.
//
// Summaries only, no per-game lines: the campaign manifest and the seed set
// checksum below pin everything needed to reproduce any of it exactly.

console.log('\nsupplementary stacker sweep (summaries only):');
const sweep = [];
for (let col = 0; col < COLS; col++) {
  for (const [kind, make] of [['spill', makeStacker], ['strict', makeStrictStacker]]) {
    const agent = make(col);
    const inst = agent.create({});
    const records = [];
    for (let i = 0; i < games; i++) {
      records.push(playGame(inst, seedSet.seeds[i]).metrics);
    }
    const scores = records.map((r) => r.score).sort((a, b) => a - b);
    const entry = {
      column: col,
      variant: kind,
      agent: `${agent.name}-${agent.version}`,
      median: scores[Math.floor((scores.length - 1) * 0.5)],
      mean: round(scores.reduce((a, b) => a + b, 0) / scores.length, 1),
      max: scores[scores.length - 1],
      maxTile: Math.max(...records.map((r) => r.maxTile)),
      medianBlocks: records.map((r) => r.blocksPlaced).sort((a, b) => a - b)[Math.floor((games - 1) * 0.5)],
    };
    sweep.push(entry);
    console.log(`  col ${col} ${kind.padEnd(6)} median ${String(entry.median).padStart(7)}  `
      + `mean ${String(entry.mean).padStart(9)}  max ${String(entry.max).padStart(8)}`);
  }
}
mkdirSync(path.join(dir, 'supplementary'), { recursive: true });
writeFileSync(path.join(dir, 'supplementary', 'stacker-sweep.json'), `${JSON.stringify({
  what: 'Stacker sweep: every column, both variants. Summaries only; reproducible from '
    + 'the seed set and agent ids below, which is why there are no per-game lines here.',
  spill: 'the registered stacker-v1: home column while it has room, else the shortest column',
  strict: 'never steers, including into overflow; this is literally an unattended game',
  seedSet: { id: seedSet.id, checksum: seedSet.checksum, games },
  engine: engineProvenance(),
  spawn: { ...CONFIG.spawn },
  results: sweep,
}, null, 2)}\n`);

// ---------------------------------------------------------------------------
// Determinism proof

console.log('\ndeterminism proof:');
const proof = proveDeterminism({ agentId: 'heuristic-v0', seed: seedSet.seeds[0] });
for (const leg of proof.legs) {
  console.log(`  ${leg.leg.padEnd(22)} score ${String(leg.score).padStart(9)}  hash ${leg.finalHash}`);
}
console.log(`  identical across Node legs: ${proof.identical}; move lists identical: ${proof.movesIdentical}`);

const proofReplayFile = path.join(SAMPLES_DIR, 'determinism-proof.replay.json');
writeReplay(proof.replay, proofReplayFile);
writeFileSync(path.join(dir, 'determinism.json'), `${JSON.stringify({
  ...proof,
  replay: undefined,
  replayFile: repoRelative(proofReplayFile),
  browserLeg: 'pending: open the replay file in cinema mode on the live site',
}, null, 2)}\n`);
console.log(`  browser leg replay: ${repoRelative(proofReplayFile)}`);

// ---------------------------------------------------------------------------
// Sample replays: the heuristic's best eval game and the stacker's best.

console.log('\nsample replays:');
const samples = [];
for (const id of ['heuristic-v0', 'stacker-v1']) {
  const leg = series.find((s) => s.agent.id === id);
  const agent = leg.agent;
  const best = playGame(agent.create({}), leg.summary.bestGame.seed, { explain: true });
  if (best.metrics.score !== leg.summary.bestGame.score) {
    throw new Error(`${id}: replaying the best game gave ${best.metrics.score}, `
      + `the run recorded ${leg.summary.bestGame.score}`);
  }
  const replay = buildReplay({
    agent,
    seed: best.seed,
    moves: best.moves,
    reasoning: best.reasoning,
    finalState: best.finalState,
    note: `best of ${games} games on ${seedSet.id}, run ${runId}`,
  });
  const file = path.join(SAMPLES_DIR, `${id}-best-eval-v1.replay.json`);
  writeReplay(replay, file);
  samples.push({
    agent: id, seed: best.seed, score: best.metrics.score, maxTile: best.metrics.maxTile,
    moves: best.moves.length, file: repoRelative(file),
  });
  console.log(`  ${id.padEnd(14)} seed ${best.seed}  score ${best.metrics.score}  `
    + `${best.moves.length} moves  -> ${repoRelative(file)}`);
}

// ---------------------------------------------------------------------------
// Ladder tables and the campaign manifest

const ladder = series.map((s) => ({
  agent: s.agent.id,
  describe: s.agent.describe,
  games: s.summary.games,
  score: s.summary.score,
  blocksPlaced: s.summary.blocksPlaced,
  longestChain: s.summary.longestChain,
  maxTile: s.summary.maxTile,
  mergeCounts: s.summary.mergeCounts,
  throughput: s.summary.throughput,
  bestGame: s.summary.bestGame,
}));

writeFileSync(path.join(dir, 'ladder.json'), `${JSON.stringify({ runId, seedSet: seedSet.id, games, ladder }, null, 2)}\n`);
writeFileSync(path.join(dir, 'ladder.md'), ladderMarkdown(ladder, sweep));

writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify({
  runId,
  kind: 'campaign',
  createdAt: new Date().toISOString(),
  harness: { name: 'nbs-lab', version: HARNESS_VERSION, node: process.version },
  agents: LADDER,
  supplementary: 'stacker sweep, every column, spill and strict variants',
  seedSet: { id: seedSet.id, file: seedSet.file, checksum: seedSet.checksum, gamesPerAgent: games },
  engine: engineProvenance(),
  spawn: { ...CONFIG.spawn },
  wallMs: Date.now() - campaignStart,
  samples,
  contents: {
    'manifest.json': 'this file',
    'SUMMARY.md': 'the run summary, hand-authored, closing with candidate findings',
    'ladder.md': 'machine-written ladder tables',
    'ladder.json': 'the same tables as data',
    'determinism.json': 'the determinism proof legs and hashes',
    '<agent-id>/': 'one series per ladder agent: manifest.json, games.jsonl, summary.json',
    'supplementary/stacker-sweep.json': 'stacker by column and variant, summaries only',
  },
}, null, 2)}\n`);

console.log(`\ncampaign written to ${repoRelative(dir)} in ${Math.round((Date.now() - campaignStart) / 1000)} s`);
console.log('next: author SUMMARY.md in that folder, and watch the samples in cinema mode.');

// ---------------------------------------------------------------------------

function ladderMarkdown(rows, sweepRows) {
  const fmt = (n) => (n === null || n === undefined ? 'n/a' : Number(n).toLocaleString('en-GB'));
  const out = [];
  out.push('<!-- generated by 03_train/lab/cli/campaign.js; do not hand-edit -->');
  out.push('');
  out.push(`# Ladder: ${LADDER.length} agents x ${games} games on ${seedSet.id}`);
  out.push('');
  out.push('## Game score');
  out.push('');
  out.push('| agent | median | q1 | q3 | mean | max | games |');
  out.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const r of rows) {
    out.push(`| ${r.agent} | ${fmt(r.score.median)} | ${fmt(r.score.q1)} | ${fmt(r.score.q3)} `
      + `| ${fmt(round(r.score.mean, 0))} | ${fmt(r.score.max)} | ${r.games} |`);
  }
  out.push('');
  out.push('## Blocks placed and longest chain');
  out.push('');
  out.push('| agent | blocks median | blocks q1 | blocks q3 | blocks max | longest chain median | longest chain max |');
  out.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const r of rows) {
    out.push(`| ${r.agent} | ${fmt(r.blocksPlaced.median)} | ${fmt(r.blocksPlaced.q1)} `
      + `| ${fmt(r.blocksPlaced.q3)} | ${fmt(r.blocksPlaced.max)} `
      + `| ${fmt(r.longestChain.median)} | ${fmt(r.longestChain.max)} |`);
  }
  out.push('');
  out.push('## Max tile reached, share of games');
  out.push('');
  const allTiles = [...new Set(rows.flatMap((r) => r.maxTile.histogram.map((h) => h.value)))].sort((a, b) => a - b);
  out.push(`| agent | ${allTiles.map(fmt).join(' | ')} |`);
  out.push(`|---|${allTiles.map(() => '---:').join('|')}|`);
  for (const r of rows) {
    const byValue = new Map(r.maxTile.histogram.map((h) => [h.value, h.share]));
    out.push(`| ${r.agent} | ${allTiles.map((t) => {
      const share = byValue.get(t);
      return share ? `${(share * 100).toFixed(1)}%` : '.';
    }).join(' | ')} |`);
  }
  out.push('');
  out.push('## Merges by group size, all games');
  out.push('');
  const sizes = [...new Set(rows.flatMap((r) => Object.keys(r.mergeCounts)))].sort((a, b) => a - b);
  out.push(`| agent | ${sizes.map((s) => `size ${s}`).join(' | ')} |`);
  out.push(`|---|${sizes.map(() => '---:').join('|')}|`);
  for (const r of rows) {
    out.push(`| ${r.agent} | ${sizes.map((s) => fmt(r.mergeCounts[s] ?? 0)).join(' | ')} |`);
  }
  out.push('');
  out.push('## Throughput, single process');
  out.push('');
  out.push('| agent | games/min | moves/s | wall ms |');
  out.push('|---|---:|---:|---:|');
  for (const r of rows) {
    out.push(`| ${r.agent} | ${fmt(r.throughput.gamesPerMinute)} | ${fmt(r.throughput.movesPerSecond)} | ${fmt(r.throughput.wallMs)} |`);
  }
  out.push('');
  out.push('## Supplementary: stacker by column and variant');
  out.push('');
  out.push('spill = the registered stacker-v1 (home column, else shortest). strict = never steers, including into overflow.');
  out.push('');
  out.push('| column | variant | median | mean | max | max tile | median blocks |');
  out.push('|---:|---|---:|---:|---:|---:|---:|');
  for (const s of sweepRows) {
    out.push(`| ${s.column} | ${s.variant} | ${fmt(s.median)} | ${fmt(s.mean)} | ${fmt(s.max)} | ${fmt(s.maxTile)} | ${fmt(s.medianBlocks)} |`);
  }
  out.push('');
  return `${out.join('\n')}\n`;
}
