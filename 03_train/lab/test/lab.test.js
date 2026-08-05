// lab.test.js -- the harness's own conformance suite.
//
//   node --test 03_train/lab/test/
//
// The engine has its own suite (docs/test/); this one tests the MEASURING
// INSTRUMENT, because a subtle unfairness here would silently invalidate every
// later result. Four things matter most: agents are pure and deterministic,
// the exam is frozen, features are pure and finite, and an exported replay
// reproduces its own game.

import test from 'node:test';
import assert from 'node:assert/strict';

import { RULES, hashState, verifyReplay, newGame, play, spawnDistribution } from '../engine-link.js';
import { listAgents, getAgent, makeStrictStacker, makeStacker } from '../agents/index.js';
import { makeWeightedAgent } from '../agents/weighted.js';
import { makeExpectimax, NEXT_DEPENDENT_FEATURES } from '../agents/expectimax.js';
import { playSeedsParallel, gameIdentity } from '../parallel.js';
import { listFeatures, getFeature, bindWeights, buildContext } from '../features/index.js';
import { loadSeedSet, seedsChecksum } from '../seeds.js';
import { playGame, MAX_MOVES } from '../runner.js';
import { buildReplay } from '../replay.js';
import {
  quantile, summarise, bootstrapCI, medianOfIndexed, meanOfIndexed,
} from '../metrics.js';

const EVAL = loadSeedSet('eval-v1');
const SEEDS = EVAL.seeds.slice(0, 12);

// ---------------------------------------------------------------------------
// The exam

test('eval-v1 is exactly 500 seeds and matches its own checksum', () => {
  assert.equal(EVAL.count, 500);
  assert.equal(EVAL.seeds.length, 500);
  assert.equal(EVAL.frozen, true);
  assert.equal(seedsChecksum(EVAL.seeds), EVAL.checksum);
  assert.equal(new Set(EVAL.seeds).size, 500);
});

test('train-v1 exists and is disjoint from eval-v1', () => {
  const train = loadSeedSet('train-v1');
  const evalSet = new Set(EVAL.seeds);
  const overlap = train.seeds.filter((s) => evalSet.has(s));
  assert.equal(overlap.length, 0, `train-v1 overlaps eval-v1 on ${overlap.length} seeds`);
  assert.ok(train.count >= 500);
});

// ---------------------------------------------------------------------------
// The agent interface

test('every registered agent returns a legal column and never mutates the state', () => {
  for (const agent of listAgents()) {
    const instance = agent.create({});
    let state = newGame(SEEDS[0]);
    let moves = 0;
    while (state.status === 'playing' && moves < 40) {
      const before = hashState(state);
      const view = {
        state, current: state.current, next: state.nextValue, spawn: spawnDistribution(state),
      };
      const col = instance.choose(view);
      assert.equal(hashState(state), before, `${agent.id} mutated the state it was handed`);
      assert.ok(Number.isInteger(col) && col >= 0 && col < RULES.COLS,
        `${agent.id} returned column ${col}`);
      state = play(state, col).state;
      moves += 1;
    }
    assert.ok(moves > 0, `${agent.id} played no moves`);
  }
});

test('every agent is deterministic: same seed, same game, twice', () => {
  for (const agent of listAgents()) {
    for (const seed of SEEDS.slice(0, 4)) {
      const a = playGame(agent.create({}), seed);
      const b = playGame(agent.create({}), seed);
      assert.equal(a.moves.join(','), b.moves.join(','), `${agent.id} move list differs on seed ${seed}`);
      assert.equal(a.metrics.finalHash, b.metrics.finalHash, `${agent.id} final hash differs on seed ${seed}`);
      assert.equal(a.metrics.score, b.metrics.score);
    }
  }
});

test('every agent terminates well inside the runaway guard', () => {
  for (const agent of listAgents()) {
    for (const seed of SEEDS.slice(0, 4)) {
      const game = playGame(agent.create({}), seed);
      assert.equal(game.truncated, false, `${agent.id} hit the ${MAX_MOVES} move guard`);
      assert.equal(game.finalState.status, 'over');
      assert.equal(game.moves.length, game.metrics.blocksPlaced);
    }
  }
});

// ---------------------------------------------------------------------------
// The feature registry

test('the registry holds the eleven active features, each pure and finite', () => {
  const features = listFeatures();
  assert.equal(features.length, 11); // nine seeded + tier-gap-cost + next-merge-ready (campaign job)
  const state = newGame(SEEDS[1]);
  const ctx = buildContext(state, 2);
  for (const feature of features) {
    const first = feature.score(ctx);
    const second = feature.score(ctx);
    assert.equal(typeof first, 'number', `${feature.name} did not return a number`);
    assert.ok(Number.isFinite(first), `${feature.name} returned ${first}`);
    assert.equal(first, second, `${feature.name} is not pure`);
  }
});

test('features stay finite across a whole played game', () => {
  const agent = getAgent('heuristic-v0');
  const instance = agent.create({});
  const features = listFeatures();
  let state = newGame(SEEDS[2]);
  let moves = 0;
  while (state.status === 'playing' && moves < 120) {
    for (let col = 0; col < RULES.COLS; col++) {
      const ctx = buildContext(state, col);
      for (const feature of features) {
        assert.ok(Number.isFinite(feature.score(ctx)),
          `${feature.name} went non-finite at move ${moves} column ${col}`);
      }
    }
    const col = instance.choose({ state, current: state.current, next: state.nextValue, spawn: null });
    state = buildContext(state, col).after;
    moves += 1;
  }
});

test('an agent pinned to a missing feature version refuses to construct', () => {
  assert.throws(
    () => bindWeights({ 'height-cost': -1 }, { 'height-cost': 99 }, { agentLabel: 'test' }),
    /no such feature/,
  );
  assert.throws(
    () => bindWeights({ 'height-cost': -1 }, {}, { agentLabel: 'test' }),
    /no pinned feature version/,
  );
  assert.throws(
    () => bindWeights({}, {}, { agentLabel: 'test' }),
    /empty weight vector/,
  );
});

test('heuristic-v0 pins a version for every weight it carries', () => {
  const agent = getAgent('heuristic-v0');
  const manifest = agent.manifest();
  assert.equal(manifest.features.length, 9);
  for (const entry of manifest.features) {
    const feature = getFeature(`${entry.name}@${entry.version}`);
    assert.equal(feature.status, 'active');
    assert.equal(typeof entry.weight, 'number');
  }
});

// ---------------------------------------------------------------------------
// Replay export

test('an enriched replay verifies through the engine and carries one reason per move', () => {
  const agent = getAgent('heuristic-v0');
  const game = playGame(agent.create({}), SEEDS[3], { explain: true });
  const replay = buildReplay({
    agent,
    seed: game.seed,
    moves: game.moves,
    reasoning: game.reasoning,
    finalState: game.finalState,
  });
  assert.equal(replay.version, 2);
  assert.equal(replay.reasoning.length, replay.moves.length);
  assert.ok(replay.reasoning.every((r) => typeof r.text === 'string' && r.text.length > 0));
  assert.ok(replay.spawn.centreBase !== undefined, 'a replay must embed its own spawn tuning');
  const verdict = verifyReplay(replay);
  assert.equal(verdict.ok, true, verdict.mismatches.join('; '));
  assert.equal(verdict.state.score, game.metrics.score);
});

test('a replay whose recorded score is wrong fails verification', () => {
  const agent = getAgent('greedy-v1');
  const game = playGame(agent.create({}), SEEDS[4]);
  const replay = buildReplay({
    agent, seed: game.seed, moves: game.moves, finalState: game.finalState,
  });
  replay.meta.result.score += 1;
  assert.equal(verifyReplay(replay).ok, false);
});

// ---------------------------------------------------------------------------
// The stacking question

test('strict stacking is column-invariant in score, so no column is special', () => {
  for (const seed of SEEDS.slice(0, 6)) {
    const results = [0, 1, 2, 3, 4].map((col) => {
      const game = playGame(makeStrictStacker(col).create({}), seed);
      return `${game.metrics.score}/${game.metrics.maxTile}/${game.metrics.blocksPlaced}`;
    });
    assert.equal(new Set(results).size, 1,
      `seed ${seed} gave different results by column: ${results.join(' ')}`);
  }
});

test('the registered stacker spills once its home column is full', () => {
  const game = playGame(makeStacker(2).create({}), SEEDS[5]);
  assert.ok(new Set(game.moves).size > 1, 'stacker-v1 never left its home column');
  const strict = playGame(makeStrictStacker(2).create({}), SEEDS[5]);
  assert.equal(new Set(strict.moves).size, 1, 'the strict stacker left its home column');
});

// ---------------------------------------------------------------------------
// The parallel pool and the weighted factory

test('the worker pool is bit-identical to the serial runner', async () => {
  for (const id of ['random-v1', 'heuristic-v0']) {
    const agent = getAgent(id);
    const instance = agent.create({});
    const seeds = SEEDS.slice(0, 8);
    const serial = seeds.map((seed) => {
      const game = playGame(instance, seed);
      return JSON.stringify(gameIdentity({ ...game.metrics, moves: game.moves }));
    });
    const parallel = await playSeedsParallel({ agentSpec: { id }, seeds, workers: 3 });
    parallel.forEach((record, i) => {
      assert.equal(JSON.stringify(gameIdentity(record)), serial[i], `${id} differs on seed ${seeds[i]}`);
    });
  }
});

test('the weighted factory given v0 weights reproduces heuristic-v0 exactly', () => {
  const v0 = getAgent('heuristic-v0');
  const twin = makeWeightedAgent({
    name: 'twin', version: 'v0', weights: v0.weights, pins: v0.pins,
  });
  for (const seed of SEEDS.slice(0, 3)) {
    const a = playGame(v0.create({}), seed);
    const b = playGame(twin.create({}), seed);
    assert.equal(a.moves.join(','), b.moves.join(','), `factory twin diverges on seed ${seed}`);
    assert.equal(a.metrics.finalHash, b.metrics.finalHash);
  }
});

test('an ephemeral weighted spec through the pool matches its serial games', async () => {
  const v0 = getAgent('heuristic-v0');
  const weights = { ...v0.weights, 'height-cost': -1.5 };
  const spec = { weighted: { name: 'candidate', version: 'test', weights, pins: v0.pins } };
  const seeds = SEEDS.slice(0, 4);
  const instance = makeWeightedAgent(spec.weighted).create({});
  const serial = seeds.map((seed) => {
    const game = playGame(instance, seed);
    return JSON.stringify(gameIdentity({ ...game.metrics, moves: game.moves }));
  });
  const parallel = await playSeedsParallel({ agentSpec: spec, seeds, workers: 2 });
  parallel.forEach((record, i) => assert.equal(JSON.stringify(gameIdentity(record)), serial[i]));
});

// ---------------------------------------------------------------------------
// Expectimax

test('expectimax depth 1 is move-for-move the flat weighted agent', () => {
  const v0 = getAgent('heuristic-v0');
  const flat = makeWeightedAgent({ name: 'flat', version: 'x', weights: v0.weights, pins: v0.pins });
  // Depth 1's only leaf is the root, where the preview is genuinely known, so
  // both leaf modes must agree with the flat agent.
  for (const leafNext of ['engine-draw', 'expectation']) {
    const em = makeExpectimax({
      name: 'em', version: 'x', weights: v0.weights, pins: v0.pins, depth: 1, leafNext,
    });
    for (const seed of SEEDS.slice(0, 2)) {
      const a = playGame(flat.create({}), seed);
      const b = playGame(em.create({}), seed);
      assert.equal(a.moves.join(','), b.moves.join(','),
        `depth 1 (${leafNext}) diverges from flat on seed ${seed}`);
      assert.equal(a.metrics.finalHash, b.metrics.finalHash);
    }
  }
});

test('expectimax depths 2 and 3 are deterministic and legal', () => {
  const v0 = getAgent('heuristic-v0');
  for (const depth of [2, 3]) {
    for (const leafNext of ['engine-draw', 'expectation']) {
      const em = makeExpectimax({
        name: 'em',
        version: 'x',
        weights: v0.weights,
        pins: v0.pins,
        depth,
        coverage: depth === 3 ? 0.9 : 1,
        leafNext,
      });
      const a = playGame(em.create({}), SEEDS[6], { maxMoves: 60 });
      const b = playGame(em.create({}), SEEDS[6], { maxMoves: 60 });
      assert.equal(a.moves.join(','), b.moves.join(','), `depth ${depth} ${leafNext} not deterministic`);
      assert.ok(a.moves.every((c) => Number.isInteger(c) && c >= 0 && c < RULES.COLS));
    }
  }
});

test('expectimax refuses to be built without an explicit leaf-preview mode', () => {
  const v0 = getAgent('heuristic-v0');
  const build = (leafNext) => makeExpectimax({
    name: 'em', version: 'x', weights: v0.weights, pins: v0.pins, depth: 2, leafNext,
  });
  assert.throws(() => build(undefined), /leafNext must be one of/);
  assert.throws(() => build('peek'), /leafNext must be one of/);
});

// The leak audit 0019 found, turned into a standing property.
//
// An honest agent's choice may depend only on what a player can see: the board,
// the falling block, the honest preview and the live distribution. The engine
// has ALSO already drawn every later block, and those draws live in the rng
// state. So: perturb the rng and nothing else. A leak-free agent must choose
// the same column every time; a leaking one is free to change its mind, and the
// v1 versions do, which is what makes their rows a measurement of the leak
// rather than of depth.
function perturbedChoices(agentId, seed, { moves = 40, streams = 4 } = {}) {
  const inst = getAgent(agentId).create({});
  let state = newGame(seed);
  const flips = [];
  for (let i = 0; i < moves && state.status === 'playing'; i++) {
    const view = { state, current: state.current, next: state.nextValue, spawn: spawnDistribution(state) };
    const base = inst.choose(view);
    for (let k = 1; k < streams; k++) {
      const alt = { ...state, rng: { state: state.rng.state ^ BigInt(k * 0x9e3779b9), inc: state.rng.inc } };
      // Everything a player can see is untouched.
      assert.equal(alt.current, state.current);
      assert.equal(alt.nextValue, state.nextValue);
      const col = inst.choose({ state: alt, current: alt.current, next: alt.nextValue, spawn: view.spawn });
      if (col !== base) flips.push({ move: i, stream: k, base, col });
    }
    state = play(state, base).state;
  }
  return flips;
}

test('leak-free expectimax ignores the engine draws a player cannot see', () => {
  for (const id of ['expectimax-d2-v2', 'expectimax-d3-v2']) {
    const flips = perturbedChoices(id, SEEDS[3], { moves: 30 });
    assert.equal(flips.length, 0,
      `${id} changed its choice when only the unknowable draws moved: ${JSON.stringify(flips.slice(0, 3))}`);
  }
});

test('the superseded v1 expectimax versions demonstrably read those draws', () => {
  for (const id of ['expectimax-d2-v1', 'expectimax-d3-v1']) {
    const flips = perturbedChoices(id, SEEDS[3], { moves: 30 });
    assert.ok(flips.length > 0,
      `${id} is recorded as leaking through the leaf preview but showed no flips; `
      + 'if the leak is genuinely gone, the record needs correcting, not this test');
  }
});

// The browser grader (docs/js/grader.js) is a second implementation of
// expectimax-d2-v2, because the lab is not served to browsers and the game grades
// human moves with no network. Two implementations of one judgement are only
// acceptable if something binds them, and this is that something: it fails on a
// single disagreed column, so a re-versioned feature or a retuned weight cannot
// leave the browser copy quietly stale.
test('the browser grader matches the pinned champion move for move', async () => {
  const grader = await import('../../../docs/js/grader.js');
  const champion = getAgent(grader.CHAMPION_ID);
  const inst = champion.create({});
  let positions = 0;
  for (const seed of SEEDS.slice(0, 3)) {
    let state = newGame(seed);
    for (let i = 0; i < 90 && state.status === 'playing'; i++) {
      const mine = inst.choose({
        state, current: state.current, next: state.nextValue, spawn: spawnDistribution(state),
      });
      const theirs = grader.choose(state);
      assert.equal(theirs, mine,
        `docs/js/grader.js chose ${theirs}, ${grader.CHAMPION_ID} chose ${mine} `
        + `on seed ${seed} move ${i}`);
      positions += 1;
      state = play(state, mine).state;
    }
  }
  assert.ok(positions > 200, `only ${positions} positions compared`);
});

test('the browser grader is leak-free too', async () => {
  const grader = await import('../../../docs/js/grader.js');
  let state = newGame(SEEDS[4]);
  for (let i = 0; i < 25 && state.status === 'playing'; i++) {
    const base = grader.choose(state);
    for (let k = 1; k < 4; k++) {
      const alt = { ...state, rng: { state: state.rng.state ^ BigInt(k * 0x85ebca6b), inc: state.rng.inc } };
      assert.equal(grader.choose(alt), base,
        `the grader changed its mind at move ${i} when only the unknowable draws moved`);
    }
    state = play(state, base).state;
  }
});

test('every next-reading feature is declared to the searching agents', () => {
  // NEXT_DEPENDENT_FEATURES is the agent's hand-maintained list of features that
  // cannot be evaluated honestly at a deep leaf. This holds it to the registry:
  // score a real context at two different `next` values and see who moves.
  let state = newGame(SEEDS[1]);
  for (let i = 0; i < 40 && state.status === 'playing'; i++) state = play(state, i % RULES.COLS).state;
  const ctx = buildContext(state, 0);
  const values = [2, 4, 8, 16, 32, 64, 128, 256];
  for (const feature of listFeatures()) {
    const scores = values.map((v) => {
      const probe = buildContext(state, 0);
      probe.next = v;
      return feature.score(probe);
    });
    const varies = scores.some((s) => s !== scores[0]);
    assert.equal(varies, NEXT_DEPENDENT_FEATURES.has(feature.name),
      `feature ${feature.key} ${varies ? 'reads' : 'does not read'} ctx.next but is `
      + `${NEXT_DEPENDENT_FEATURES.has(feature.name) ? '' : 'not '}declared in `
      + 'NEXT_DEPENDENT_FEATURES; a next-reading feature must be declared there or every '
      + 'leak-free expectimax version silently starts peeking again');
    assert.ok(Number.isFinite(feature.score(ctx)));
  }
});

// ---------------------------------------------------------------------------
// Statistics

test('the bootstrap is reproducible, brackets its point estimate and narrows with n', () => {
  // A skewed sample, because game scores are skewed and that is the whole reason
  // for bootstrapping rather than assuming a normal interval.
  const values = Float64Array.from({ length: 400 }, (_, i) => (i + 1) ** 1.7);
  const stat = (idx) => medianOfIndexed(values, idx);
  const a = bootstrapCI({ n: values.length, statistic: stat, resamples: 400, seed: 7 });
  const b = bootstrapCI({ n: values.length, statistic: stat, resamples: 400, seed: 7 });
  assert.deepEqual(b, a, 'the same seed must give the same interval');
  const c = bootstrapCI({ n: values.length, statistic: stat, resamples: 400, seed: 8 });
  assert.notEqual(c.lo, a.lo, 'a different seed should move the interval a little');

  assert.equal(a.point, quantile([...values].sort((x, y) => x - y), 0.5));
  assert.ok(a.lo <= a.point && a.point <= a.hi, 'the interval must bracket the point estimate');

  // Ten times the data, roughly a third the width: the bootstrap has to behave
  // like an interval, not merely return two numbers.
  const big = Float64Array.from({ length: 4000 }, (_, i) => ((i / 10) + 1) ** 1.7);
  const wide = bootstrapCI({ n: 400, statistic: (idx) => medianOfIndexed(values, idx), resamples: 400, seed: 3 });
  const tight = bootstrapCI({ n: 4000, statistic: (idx) => medianOfIndexed(big, idx), resamples: 400, seed: 3 });
  assert.ok((tight.hi - tight.lo) < (wide.hi - wide.lo), 'more games should give a tighter interval');
});

test('a paired bootstrap keeps the pairing and finds a real difference', () => {
  // Two agents on the same 300 seeds, the second always 10 per cent better. The
  // paired difference is unmistakable even though each row's own spread is huge.
  const n = 300;
  const a = new Float64Array(n);
  const b = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const seedDifficulty = (i * 7919) % 100000; // wide, shared spread
    b[i] = 1000 + seedDifficulty;
    a[i] = b[i] * 1.1;
  }
  const diff = Float64Array.from({ length: n }, (_, i) => a[i] - b[i]);
  const ci = bootstrapCI({ n, statistic: (idx) => medianOfIndexed(diff, idx), resamples: 500, seed: 11 });
  assert.ok(ci.lo > 0, 'a uniform 10 per cent gain must give an interval above zero');
  const wins = bootstrapCI({
    n,
    statistic: (idx) => meanOfIndexed(Float64Array.from({ length: n }, (_, i) => (a[i] > b[i] ? 1 : 0)), idx),
    resamples: 500,
    seed: 12,
  });
  assert.equal(wins.point, 1);
});

test('quantiles use linear interpolation between order statistics', () => {
  const xs = [1, 2, 3, 4];
  assert.equal(quantile(xs, 0.5), 2.5);
  assert.equal(quantile(xs, 0.25), 1.75);
  assert.equal(quantile(xs, 0), 1);
  assert.equal(quantile(xs, 1), 4);
  const s = summarise([5, 1, 3]);
  assert.equal(s.median, 3);
  assert.equal(s.min, 1);
  assert.equal(s.max, 5);
  assert.equal(s.mean, 3);
});
