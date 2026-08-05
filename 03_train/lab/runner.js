// runner.js -- play an agent on a seed set and write the record.
//
// The runner never decides anything about the game. It builds the view, asks
// the agent for a column, hands that column to the engine, and writes down
// what the engine reported. Per-game metrics are RULES.md 7's list; duration
// is deliberately NOT among them (RULES.md 7 scopes duration and per-move
// timestamps to human play), so the wall-clock field below is named for what
// it is, a harness throughput measurement.

import { createWriteStream, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { newGame, play, spawnDistribution, resultMetrics, RULES, CONFIG } from './engine-link.js';
import { buildManifest } from './manifest.js';
import { summarise, distribution, sumMergeCounts, round } from './metrics.js';
import { RUNS_DIR } from './paths.js';

// A guard, not a rule. Merges can in principle feed themselves indefinitely,
// and a batch runner that can hang is a batch runner that will. No observed
// game has come close; a run that trips this says so in its summary.
export const MAX_MOVES = 50000;

// Play one game to its end. Pure with respect to everything outside it: the
// same agent version and the same seed always produce the same game.
export function playGame(instance, seed, { spawn = CONFIG.spawn, explain = false, maxMoves = MAX_MOVES } = {}) {
  const started = process.hrtime.bigint();
  let state = newGame(seed, spawn);
  const moves = [];
  // reasoning[] only exists if the agent can actually explain itself. An array
  // of empty strings would make a replay claim commentary it does not have.
  const explaining = explain && typeof instance.explain === 'function';
  const reasoning = explaining ? [] : null;
  let truncated = false;

  while (state.status === 'playing') {
    if (moves.length >= maxMoves) { truncated = true; break; }
    const view = {
      state,
      current: state.current,
      next: state.nextValue,
      spawn: spawnDistribution(state),
    };
    if (explaining) reasoning.push(instance.explain(view));
    const col = instance.choose(view);
    if (!Number.isInteger(col) || col < 0 || col >= RULES.COLS) {
      throw new Error(`agent returned an illegal column ${col} on seed ${seed} move ${moves.length}`);
    }
    moves.push(col);
    state = play(state, col).state;
  }

  const harnessMs = Number(process.hrtime.bigint() - started) / 1e6;
  return {
    seed: String(seed),
    moves,
    reasoning,
    truncated,
    harnessMs,
    finalState: state,
    metrics: {
      seed: String(seed),
      ...resultMetrics(state),
      moveCount: moves.length,
      truncated,
      harnessMs: round(harnessMs, 3),
    },
  };
}

// Run one agent over the first `games` seeds of a set, streaming a line per
// game. Returns the summary plus the per-game records (used to pick the best
// game for a sample replay).
export function runSeries({ agent, seedSet, games, dir, spawn = CONFIG.spawn, note, onProgress }) {
  if (games > seedSet.seeds.length) {
    throw new Error(`seed set ${seedSet.id} holds ${seedSet.seeds.length} seeds, ${games} requested`);
  }
  mkdirSync(dir, { recursive: true });

  // Manifest first: no manifest, no run.
  const manifest = buildManifest({
    runId: path.basename(dir), agent, seedSet, games, spawn, note,
  });
  writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const instance = agent.create({ seedSet: seedSet.id });
  const stream = createWriteStream(path.join(dir, 'games.jsonl'), { flags: 'w' });
  const records = [];
  const wall0 = Date.now();

  for (let i = 0; i < games; i++) {
    const seed = seedSet.seeds[i];
    const game = playGame(instance, seed, { spawn });
    const record = { ...game.metrics, moves: game.moves };
    records.push(record);
    stream.write(`${JSON.stringify(record)}\n`);
    if (onProgress && (i + 1) % 100 === 0) onProgress(i + 1, games);
  }
  stream.end();

  const wallMs = Date.now() - wall0;
  const summary = summariseSeries({ manifest, records, wallMs });
  writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return { manifest, summary, records, instance, dir };
}

export function summariseSeries({ manifest, records, wallMs }) {
  const scores = records.map((r) => r.score);
  const maxTiles = records.map((r) => r.maxTile);
  const blocks = records.map((r) => r.blocksPlaced);
  const chains = records.map((r) => r.longestChain);
  const best = records.reduce((a, b) => (b.score > a.score ? b : a));
  const totalMoves = records.reduce((a, r) => a + r.moveCount, 0);

  return {
    runId: manifest.runId,
    agent: manifest.agent.id,
    seedSet: manifest.seedSet.id,
    games: records.length,
    score: rounded(summarise(scores)),
    blocksPlaced: rounded(summarise(blocks)),
    longestChain: rounded(summarise(chains)),
    maxTile: {
      ...rounded(summarise(maxTiles)),
      histogram: distribution(maxTiles).map((d) => ({ ...d, share: round(d.share, 4) })),
    },
    mergeCounts: sumMergeCounts(records),
    bestGame: { seed: best.seed, score: best.score, maxTile: best.maxTile, moveCount: best.moveCount },
    truncatedGames: records.filter((r) => r.truncated).length,
    throughput: {
      wallMs,
      gamesPerMinute: wallMs > 0 ? round((records.length / wallMs) * 60000, 0) : null,
      movesPerSecond: wallMs > 0 ? round((totalMoves / wallMs) * 1000, 0) : null,
      totalMoves,
      note: 'single process, single thread, cold Node start excluded',
    },
  };
}

function rounded(stats) {
  const out = {};
  for (const [k, v] of Object.entries(stats)) out[k] = typeof v === 'number' ? round(v, 2) : v;
  return out;
}

// Run-id per 03_train/CONTEXT.md: <YYYY-MM-DD>_<slug>, suffixed -b, -c on a
// same-day collision. A completed run folder is never edited, so a collision
// always makes a new folder rather than reusing one.
export function allocateRunDir(slug, date = new Date().toISOString().slice(0, 10)) {
  const base = `${date}_${slug}`;
  let candidate = base;
  for (let i = 1; existsSync(path.join(RUNS_DIR, candidate)); i++) {
    if (i > 24) throw new Error(`too many runs named ${base} today`);
    candidate = `${base}-${String.fromCharCode(97 + i)}`; // -b, -c, ...
  }
  const dir = path.join(RUNS_DIR, candidate);
  mkdirSync(dir, { recursive: true });
  return { runId: candidate, dir };
}
