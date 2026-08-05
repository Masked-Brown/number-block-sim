// parallel.js -- the worker-pool fan-out over seeds.
//
// Games are completely independent and playGame is a pure function of (agent
// version, seed), so parallelism is a scheduling concern and nothing else: the
// pool hands seeds to workers one at a time (dynamic, so a long game on one
// core never idles the others), collects each record by its seed index, and
// returns them in seed order. The output is therefore BIT-IDENTICAL to the
// serial runner's by construction, and the lab suite asserts it rather than
// assuming it. No engine change, no dependency; this file is both halves, the
// pool (main thread) and the worker loop (guarded below).
//
// An agent crosses the thread boundary as a SPEC, never as an object:
//   { id: 'heuristic-v0' }                        a registered version
//   { weighted: { name, version, weights, pins } } an ephemeral candidate
// The worker resolves the spec against its own copy of the registry, so the
// code that plays is the same code the serial runner plays.

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { createWriteStream, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CONFIG } from './engine-link.js';
import { getAgent } from './agents/index.js';
import { makeWeightedAgent } from './agents/weighted.js';
import { playGame, summariseSeries } from './runner.js';
import { buildManifest } from './manifest.js';

// The game-defining content of a record: everything except harnessMs, which
// is a wall-clock measurement of the harness and differs between ANY two runs,
// two serial ones included. Bit-identity is a claim about the game, so the
// stopwatch is excluded from it by definition, and every identity comparison
// in the lab says so by going through this function.
export function gameIdentity(record) {
  const { harnessMs, ...identity } = record;
  return identity;
}

// Two threads are left for the OS and the pool's own main thread, so a full
// campaign does not starve the machine it is measured on.
export function defaultWorkers() {
  const cores = os.availableParallelism?.() ?? os.cpus().length;
  return Math.max(1, cores - 2);
}

export function resolveAgentSpec(spec) {
  if (spec.id) return getAgent(spec.id);
  if (spec.weighted) return makeWeightedAgent(spec.weighted);
  throw new Error(`unresolvable agent spec: ${JSON.stringify(spec)}`);
}

// The shared pool core: a list of work items, each (specIndex, seed), played
// by whichever worker frees up first. Workers resolve specs lazily and cache
// the instance per specIndex, so a breeding generation costs one pool
// lifecycle rather than one per candidate.
function runPool({ specs, items, spawn, workers, includeMoves, onProgress }) {
  if (items.length === 0) return Promise.resolve([]);
  const n = Math.min(workers, items.length);
  return new Promise((resolve, reject) => {
    const records = new Array(items.length);
    let next = 0;
    let done = 0;
    let failed = false;
    const pool = [];

    const finish = (err) => {
      for (const w of pool) w.terminate();
      if (err) { failed = true; reject(err); } else resolve(records);
    };

    const feed = (w) => {
      if (next >= items.length) return;
      const item = items[next];
      w.postMessage({ index: next, specIndex: item.specIndex, seed: item.seed });
      next += 1;
    };

    for (let i = 0; i < n; i++) {
      const w = new Worker(fileURLToPath(import.meta.url), {
        workerData: { nbsParallelWorker: true, specs, spawn, includeMoves },
      });
      pool.push(w);
      w.on('message', (msg) => {
        if (failed) return;
        records[msg.index] = msg.record;
        done += 1;
        if (onProgress) onProgress(done, items.length);
        if (done === items.length) finish();
        else feed(w);
      });
      w.on('error', (err) => { if (!failed) finish(err); });
      feed(w);
    }
  });
}

// Play `seeds` in parallel and return records in seed order. A record is the
// serial runner's shape exactly: { ...metrics, moves } (moves omitted when
// includeMoves is false, which breeding uses to keep messaging cheap).
export function playSeedsParallel({
  agentSpec, seeds, spawn = CONFIG.spawn, workers = defaultWorkers(),
  includeMoves = true, onProgress,
}) {
  return runPool({
    specs: [agentSpec],
    items: seeds.map((seed) => ({ specIndex: 0, seed })),
    spawn, workers, includeMoves, onProgress,
  });
}

// Play every spec over every seed: one pool lifecycle for a whole breeding
// generation. Returns records[specIndex][seedIndex], metrics only.
export async function playMatrixParallel({
  specs, seeds, spawn = CONFIG.spawn, workers = defaultWorkers(), onProgress,
}) {
  const items = [];
  for (let s = 0; s < specs.length; s++) {
    for (const seed of seeds) items.push({ specIndex: s, seed });
  }
  const flat = await runPool({ specs, items, spawn, workers, includeMoves: false, onProgress });
  const out = specs.map(() => []);
  for (let i = 0; i < items.length; i++) out[items[i].specIndex].push(flat[i]);
  return out;
}

// The parallel twin of runner.js runSeries: same manifest-first discipline,
// same games.jsonl lines in the same seed order, same summary maths. Only the
// throughput note differs, because the wall clock now measures a pool.
export async function runSeriesParallel({
  agent, agentSpec, seedSet, games, dir, spawn = CONFIG.spawn, note, workers = defaultWorkers(), onProgress,
}) {
  if (games > seedSet.seeds.length) {
    throw new Error(`seed set ${seedSet.id} holds ${seedSet.seeds.length} seeds, ${games} requested`);
  }
  mkdirSync(dir, { recursive: true });
  const manifest = buildManifest({
    runId: path.basename(dir), agent, seedSet, games, spawn, note,
  });
  writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const wall0 = Date.now();
  const records = await playSeedsParallel({
    agentSpec: agentSpec ?? { id: agent.id }, seeds: seedSet.seeds.slice(0, games), spawn, workers, onProgress,
  });
  const wallMs = Date.now() - wall0;

  const stream = createWriteStream(path.join(dir, 'games.jsonl'), { flags: 'w' });
  for (const record of records) stream.write(`${JSON.stringify(record)}\n`);
  stream.end();

  const summary = summariseSeries({ manifest, records, wallMs });
  summary.throughput.note = `worker pool, ${Math.min(workers, games)} workers over independent seeds`;
  summary.throughput.workers = Math.min(workers, games);
  writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return { manifest, summary, records, dir };
}

// ---------------------------------------------------------------------------
// The worker half. One agent instance per spec per worker, created lazily and
// reused across that spec's games, exactly as the serial runner reuses one
// instance across a series.

if (!isMainThread && workerData?.nbsParallelWorker) {
  const { specs, spawn, includeMoves } = workerData;
  const instances = new Array(specs.length).fill(null);
  parentPort.on('message', ({ index, specIndex, seed }) => {
    if (instances[specIndex] === null) {
      instances[specIndex] = resolveAgentSpec(specs[specIndex]).create({});
    }
    const game = playGame(instances[specIndex], seed, { spawn });
    const record = includeMoves ? { ...game.metrics, moves: game.moves } : game.metrics;
    parentPort.postMessage({ index, record });
  });
}
