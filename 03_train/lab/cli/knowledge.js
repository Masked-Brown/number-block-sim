// knowledge.js -- assemble the campaign knowledge file.
//
//   node 03_train/lab/cli/knowledge.js
//
// Writes 03_train/output/knowledge.json: the champion's weights and feature
// list (from the registered modules, so the file cannot drift from the code),
// the search configuration, the breeding provenance and both learning curves
// (from the breed run folders), and the eval-v1 ladder medians (from the run
// summaries). Machine-assembled from the records rather than typed, so a
// transcription error cannot invent a result. Current-state file: regenerate
// whenever a new champion is named.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { getAgent } from '../agents/index.js';
import { getFeature } from '../features/index.js';
import { OUTPUT_DIR, RUNS_DIR } from '../paths.js';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const runFile = (run, file) => path.join(RUNS_DIR, run, file);

// The champion is the strongest agent whose measurement is HONEST. Updated
// 2026-08-05 (job remediate-and-game-v1.2) from expectimax-d3-v1 to
// expectimax-d3-v2: audit 0019 found v1's search leaves reading a block no player
// could see, so its median is a measurement of the leak and not of depth-3 play.
const champion = getAgent('expectimax-d3-v2');
const superseded = ['expectimax-d2-v1', 'expectimax-d3-v1'];
const flat = getAgent('heuristic-v2');
const manifest = champion.manifest();

const curve = (run) => readFileSync(runFile(run, 'generations.jsonl'), 'utf8')
  .trim().split('\n').map((l) => {
    const g = JSON.parse(l);
    return { generation: g.generation, best: g.bestFitness, median: g.medianFitness, worst: g.worstFitness };
  });

const evalRuns = {
  'random-v1': '2026-08-05_smoke-ladder/random-v1',
  'stacker-v1': '2026-08-05_smoke-ladder/stacker-v1',
  'greedy-v1': '2026-08-05_smoke-ladder/greedy-v1',
  'heuristic-v0': '2026-08-05_smoke-ladder/heuristic-v0',
  'heuristic-v1': '2026-08-05_eval-heuristic-v1',
  'heuristic-v2': '2026-08-05_eval-heuristic-v2',
  'expectimax-d2-v1': '2026-08-05_eval-expectimax-d2-v1',
  'expectimax-d3-v1': '2026-08-05_eval-expectimax-d3-v1',
  'expectimax-d2-v2': '2026-08-05_eval-expectimax-d2-v2',
  'expectimax-d3-v2': '2026-08-05_eval-expectimax-d3-v2',
};
const ladder = {};
for (const [id, run] of Object.entries(evalRuns)) {
  const file = runFile(run, 'summary.json');
  if (!existsSync(file)) { ladder[id] = null; continue; }
  const s = read(file);
  ladder[id] = {
    median: s.score.median,
    q1: s.score.q1,
    q3: s.score.q3,
    max: s.score.max,
    run: run.split('/')[0],
    // A reader of this file must not be able to mistake a leaked row for a
    // result. Both are kept: the pair is the measurement of the leak.
    ...(superseded.includes(id)
      ? { superseded: 'leaf-preview leak, audit 0019; see the -v2 row of the same depth' }
      : {}),
  };
}

const breed1 = read(runFile('2026-08-05_breed-h0', 'result.json'));
const breed2 = read(runFile('2026-08-05_breed-h1-features', 'result.json'));

const knowledge = {
  what: 'The campaign knowledge file: champion weights, feature list, search configuration, '
    + 'breeding provenance and learning curves, and the eval-v1 ladder. Machine-assembled by '
    + 'lab/cli/knowledge.js from the run records; regenerate on a new champion.',
  generated: new Date().toISOString(),
  job: 'remediate-and-game-v1.2 (champion updated after audit 0019; first assembled by '
    + 'orchestrated-training-campaign)',
  champion: {
    id: champion.id,
    describe: champion.describe,
    search: manifest.search,
    weightsSharedWith: flat.id,
    features: manifest.features.map((f) => ({
      ...f,
      describe: getFeature(`${f.name}@${f.version}`).describe,
    })),
  },
  breeding: [
    {
      run: '2026-08-05_breed-h0',
      init: 'heuristic-v0',
      champion: 'heuristic-v1',
      fitness: breed1.champion.fitness,
      validation: breed1.validation,
      curve: curve('2026-08-05_breed-h0'),
    },
    {
      run: '2026-08-05_breed-h1-features',
      init: 'heuristic-v1 plus tier-gap-cost and next-merge-ready',
      champion: 'heuristic-v2',
      fitness: breed2.champion.fitness,
      validation: breed2.validation,
      curve: curve('2026-08-05_breed-h1-features'),
    },
  ],
  evalLadder: { seedSet: 'eval-v1', games: 500, medians: ladder },
};

const out = path.join(OUTPUT_DIR, 'knowledge.json');
writeFileSync(out, `${JSON.stringify(knowledge, null, 2)}\n`);
console.log(`written ${out}`);
console.log(`champion ${champion.id}, ${manifest.features.length} features, `
  + `${Object.values(ladder).filter(Boolean).length} ladder rows`);
