// cem.js -- cross-entropy weight breeding over registered features.
//
// The search space is the agent's weight vector and nothing else: features are
// fixed pure modules, the tie-break is fixed, and the engine is the engine, so
// what breeding can discover is exactly "which judgements were mis-priced".
//
// Method: classic cross-entropy. Sample a population from a per-weight
// Gaussian, evaluate every candidate's median score over a FIXED block of
// train-v1 seeds (common random numbers: every candidate in every generation
// sits the same seeds, so comparisons are paired and seed luck cancels),
// refit mean and sigma to the elites, add a decaying noise floor so sigma
// cannot collapse before the search has looked around, repeat.
//
// Determinism: the only randomness is the sampler, which is mulberry32 seeded
// from the config and recorded in the run manifest. Re-running with the same
// config reproduces the identical breed, generation for generation. This PRNG
// is breeding machinery, not game logic; the games themselves remain the
// engine's alone.
//
// Fitness is the median, not the mean: the score's right tail is heavy
// (smoke-ladder finding), and a candidate should not win a generation on one
// lucky cascade.

import { quantile } from '../metrics.js';
import { playMatrixParallel } from '../parallel.js';

// mulberry32: tiny, seedable, good enough for sampling noise. Not for games.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller, one normal per call, cache for the pair.
export function gaussian(rng) {
  let spare = null;
  return function next() {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0; let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

export function fitnessOf(records) {
  const scores = records.map((r) => r.score).sort((a, b) => a - b);
  return quantile(scores, 0.5);
}

// Breed weights by CEM. Returns { champion, generations } and calls
// onGeneration after each generation so the caller can stream the record.
export async function breed({
  initWeights, // starting mean, usually a named agent's weights
  pins, // feature versions every candidate is pinned to
  fixed = {}, // weights held constant, excluded from the search
  seeds, // the FIXED fitness block (train pool only, never eval)
  population = 24,
  elites = 6,
  generations = 14,
  rngSeed,
  spawn,
  workers,
  initSigmaScale = 0.5,
  initSigmaFloor = 0.15,
  noiseFloor = (gen) => Math.max(0.02, 0.3 * 0.8 ** gen),
  earlyStop = { window: 3, minGain: 0.02 },
  onGeneration,
}) {
  const names = Object.keys(initWeights).filter((n) => !(n in fixed));
  const rng = mulberry32(rngSeed);
  const normal = gaussian(rng);

  let mean = names.map((n) => initWeights[n]);
  let sigma = names.map((n) => Math.max(Math.abs(initWeights[n]) * initSigmaScale, initSigmaFloor));

  const toWeights = (vector) => {
    const w = { ...fixed };
    names.forEach((n, i) => { w[n] = vector[i]; });
    return w;
  };

  const generationsOut = [];
  let bestEver = null;

  for (let gen = 0; gen < generations; gen++) {
    // Candidate 0 of generation 0 is the unperturbed starting point, so the
    // breed always knows what the incumbent scores on the fitness block.
    const vectors = [];
    for (let p = 0; p < population; p++) {
      if (gen === 0 && p === 0) { vectors.push([...mean]); continue; }
      vectors.push(mean.map((m, i) => m + sigma[i] * normal()));
    }

    const specs = vectors.map((v, p) => ({
      weighted: { name: 'cem-candidate', version: `g${gen}p${p}`, weights: toWeights(v), pins },
    }));
    const t0 = Date.now();
    const results = await playMatrixParallel({ specs, seeds, spawn, workers });
    const wallMs = Date.now() - t0;

    const scored = vectors.map((v, p) => ({
      vector: v,
      weights: toWeights(v),
      fitness: fitnessOf(results[p]),
    })).sort((a, b) => b.fitness - a.fitness);

    const elite = scored.slice(0, elites);
    if (bestEver === null || elite[0].fitness > bestEver.fitness) {
      bestEver = { ...elite[0], generation: gen };
    }

    // Refit to the elites, then add the noise floor.
    mean = names.map((_, i) => elite.reduce((a, e) => a + e.vector[i], 0) / elites);
    const floor = noiseFloor(gen);
    sigma = names.map((_, i) => {
      const variance = elite.reduce((a, e) => a + (e.vector[i] - mean[i]) ** 2, 0) / elites;
      return Math.sqrt(variance) + floor;
    });

    const record = {
      generation: gen,
      wallMs,
      games: population * seeds.length,
      bestFitness: elite[0].fitness,
      medianFitness: quantile(scored.map((s) => s.fitness).sort((a, b) => a - b), 0.5),
      worstFitness: scored[scored.length - 1].fitness,
      eliteMean: toWeights(mean),
      sigma: Object.fromEntries(names.map((n, i) => [n, sigma[i]])),
      noiseFloor: floor,
      best: { weights: elite[0].weights, fitness: elite[0].fitness },
      population: scored.map((s) => ({ fitness: s.fitness, weights: s.weights })),
    };
    generationsOut.push(record);
    if (onGeneration) onGeneration(record);

    // Early stop: no meaningful movement of the generation best over the
    // window, measured against the window's start.
    const w = earlyStop.window;
    if (generationsOut.length > w) {
      const then = generationsOut[generationsOut.length - 1 - w].bestFitness;
      const now = record.bestFitness;
      if (then > 0 && (now - then) / then < earlyStop.minGain) {
        record.stoppedEarly = true;
        break;
      }
    }
  }

  return { champion: bestEver, eliteMean: toWeights(mean), generations: generationsOut };
}
