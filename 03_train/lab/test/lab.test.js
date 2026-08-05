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
import { listFeatures, getFeature, bindWeights, buildContext } from '../features/index.js';
import { loadSeedSet, seedsChecksum } from '../seeds.js';
import { playGame, MAX_MOVES } from '../runner.js';
import { buildReplay } from '../replay.js';
import { quantile, summarise } from '../metrics.js';

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

test('the registry holds nine active features, each pure and finite', () => {
  const features = listFeatures();
  assert.equal(features.length, 9);
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
// Statistics

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
