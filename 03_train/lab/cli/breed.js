// breed.js -- run a CEM weight breed and record it as a run folder.
//
//   node 03_train/lab/cli/breed.js --init heuristic-v0 [--pop 24] [--elites 6]
//        [--gens 14] [--fit-games 150] [--fit-offset 0] [--val-games 500]
//        [--val-offset 1000] [--rng-seed 20260805] [--workers 6]
//        [--slug breed-v1] [--fixed game-over-risk=-1000]
//
// Seed discipline: fitness and validation blocks both come from train-v1 and
// must not overlap; eval-v1 is never read here. The fitness block is fixed
// across all generations (common random numbers), and the validation block is
// held out from breeding entirely: the champion earns its name there, not on
// the seeds it trained against.
//
// The run folder gets the manifest first (kind: breeding), one JSONL line per
// generation as it completes (a crashed breed still shows its curve), and
// result.json with the champion, the elite mean and the validation verdict.

import { createWriteStream, writeFileSync } from 'node:fs';
import path from 'node:path';

import { getAgent } from '../agents/index.js';
import { getFeature } from '../features/index.js';
import { loadSeedSet } from '../seeds.js';
import { allocateRunDir } from '../runner.js';
import { breed, fitnessOf } from '../train/cem.js';
import { playMatrixParallel, defaultWorkers } from '../parallel.js';
import { engineProvenance, HARNESS_VERSION } from '../manifest.js';
import { repoRelative } from '../paths.js';
import { round } from '../metrics.js';
import { CONFIG } from '../engine-link.js';
import { parseArgs, intArg } from './args.js';

const args = parseArgs();
const init = getAgent(args.init ?? 'heuristic-v0');
const trainSet = loadSeedSet(args.seeds ?? 'train-v1');
const population = intArg(args, 'pop', 24);
const elites = intArg(args, 'elites', 6);
const generations = intArg(args, 'gens', 14);
const fitGames = intArg(args, 'fit-games', 150);
const fitOffset = intArg(args, 'fit-offset', 0);
const valGames = intArg(args, 'val-games', 500);
const valOffset = intArg(args, 'val-offset', 1000);
const rngSeed = intArg(args, 'rng-seed', 20260805);
const workers = intArg(args, 'workers', defaultWorkers());

if (trainSet.id.startsWith('eval')) throw new Error('breeding must never read an eval set');
if (fitOffset + fitGames > trainSet.seeds.length) throw new Error('fitness block exceeds the train pool');
if (valOffset + valGames > trainSet.seeds.length) throw new Error('validation block exceeds the train pool');
const fitEnd = fitOffset + fitGames;
if (fitEnd > valOffset && valOffset + valGames > fitOffset) {
  throw new Error('fitness and validation blocks overlap; the champion must be validated on unseen seeds');
}

// --add name=initweight, comma separated: extend the init agent's vector with
// further registered features (pinned at their latest version) so a breed can
// price features the named agent does not carry.
const initWeights = { ...init.weights };
const pins = { ...init.pins };
for (const pair of String(args.add ?? '').split(',').filter(Boolean)) {
  const [name, value] = pair.split('=');
  if (name in initWeights) throw new Error(`--add ${name}: already a weight of ${init.id}`);
  const feature = getFeature(name);
  if (feature.status !== 'active') throw new Error(`--add ${name}: feature is ${feature.status}`);
  initWeights[name] = Number(value);
  pins[name] = feature.version;
  if (!Number.isFinite(initWeights[name])) throw new Error(`--add ${name}: bad value ${value}`);
}

// --fixed name=value, repeatable via comma separation.
const fixed = {};
for (const pair of String(args.fixed ?? '').split(',').filter(Boolean)) {
  const [name, value] = pair.split('=');
  if (!(name in initWeights)) throw new Error(`--fixed ${name}: not a weight of ${init.id}`);
  fixed[name] = Number(value);
  if (!Number.isFinite(fixed[name])) throw new Error(`--fixed ${name}: bad value ${value}`);
}

const fitSeeds = trainSet.seeds.slice(fitOffset, fitEnd);
const valSeeds = trainSet.seeds.slice(valOffset, valOffset + valGames);

const { runId, dir } = allocateRunDir(args.slug ?? `breed-${init.id}`);
const config = {
  init: init.id,
  initWeights: { ...initWeights },
  pins: { ...pins },
  added: String(args.add ?? '') || null,
  fixed,
  population,
  elites,
  generations,
  rngSeed,
  fitness: { seedSet: trainSet.id, offset: fitOffset, games: fitGames, metric: 'median score' },
  validation: { seedSet: trainSet.id, offset: valOffset, games: valGames },
  workers,
};

writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify({
  runId,
  kind: 'breeding',
  createdAt: new Date().toISOString(),
  harness: { name: 'nbs-lab', version: HARNESS_VERSION, node: process.version },
  method: 'cross-entropy over the weight vector; fixed features, fixed tie-break; '
    + 'fitness is median score over a fixed train-v1 block, common to all candidates',
  config,
  seedSet: { id: trainSet.id, file: trainSet.file, checksum: trainSet.checksum },
  engine: engineProvenance(),
  spawn: { ...CONFIG.spawn },
}, null, 2)}\n`);

console.log(`breed ${runId}: ${init.id}, pop ${population}, elites ${elites}, `
  + `up to ${generations} generations, fitness ${fitGames} train seeds at offset ${fitOffset}`);

const stream = createWriteStream(path.join(dir, 'generations.jsonl'), { flags: 'w' });
const wall0 = Date.now();

const outcome = await breed({
  initWeights,
  pins,
  fixed,
  seeds: fitSeeds,
  population,
  elites,
  generations,
  rngSeed,
  workers,
  onGeneration: (g) => {
    stream.write(`${JSON.stringify(g)}\n`);
    console.log(`gen ${String(g.generation).padStart(2)}  best ${String(g.bestFitness).padStart(9)}  `
      + `median ${String(g.medianFitness).padStart(9)}  worst ${String(g.worstFitness).padStart(9)}  `
      + `noise ${g.noiseFloor.toFixed(3)}  ${Math.round(g.wallMs / 1000)}s${g.stoppedEarly ? '  (early stop)' : ''}`);
  },
});
stream.end();

// Validation: champion weights and the unperturbed init weights, same held-out
// block, paired seeds. The champion is only worth naming if it holds up here.
console.log(`validating on ${valGames} held-out train seeds at offset ${valOffset} ...`);
const [champRecords, initRecords] = await playMatrixParallel({
  specs: [
    { weighted: { name: 'champion', version: 'candidate', weights: outcome.champion.weights, pins } },
    { weighted: { name: 'init', version: 'baseline', weights: { ...init.weights }, pins: init.pins } },
  ],
  seeds: valSeeds,
  workers,
});
const champVal = fitnessOf(champRecords);
const initVal = fitnessOf(initRecords);
let championWins = 0;
for (let i = 0; i < valSeeds.length; i++) {
  if (champRecords[i].score > initRecords[i].score) championWins += 1;
}

const result = {
  runId,
  wallMs: Date.now() - wall0,
  generationsRun: outcome.generations.length,
  champion: {
    weights: outcome.champion.weights,
    fitness: outcome.champion.fitness,
    generation: outcome.champion.generation,
  },
  eliteMeanFinal: outcome.eliteMean,
  fitnessCurve: outcome.generations.map((g) => ({
    generation: g.generation, best: g.bestFitness, median: g.medianFitness,
  })),
  validation: {
    games: valGames,
    offset: valOffset,
    championMedian: champVal,
    initMedian: initVal,
    championWinsHeadToHead: championWins,
    upliftOnMedian: initVal > 0 ? round(champVal / initVal, 3) : null,
  },
};
writeFileSync(path.join(dir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);

console.log(`champion (gen ${outcome.champion.generation}) fitness ${outcome.champion.fitness}`);
console.log(`validation: champion ${champVal} vs ${init.id} ${initVal} `
  + `(head-to-head ${championWins}/${valGames}, uplift ${result.validation.upliftOnMedian}x)`);
console.log(`written to ${repoRelative(dir)} in ${Math.round(result.wallMs / 1000)}s`);
