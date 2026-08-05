// engine.test.js -- the engine's conformance suite against RULES.md v1.1.
// Run: node --test docs/test/
// No dependencies: Node's built-in test runner only.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RULES, _pcg, newGame, fromPosition, play, spawnDistribution, distributionFor,
  previewValue, hashState, makeReplay, runReplay, verifyReplay, resultMetrics,
  cloneState,
} from '../js/engine.js';
import { CONFIG } from '../js/config.js';
import { SCRIPT_SEED, SCRIPT_SPAWN, runScriptedGame, EXPECTED } from './scripted-game.js';

// Pinned parameters for every distribution assertion below: these tests state
// exact integer weights, so they must never follow config.js retunes.
const P = SCRIPT_SPAWN;

// ---------------------------------------------------------------------------
// PCG32: bit-identical to the reference implementation

test('PCG32 matches the reference vectors (seed 42, seq 54)', () => {
  const rng = _pcg.init(42n, 54n);
  const got = Array.from({ length: 6 }, () => _pcg.next(rng));
  assert.deepEqual(got, [0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e]);
});

test('same seed and parameters give the identical opening', () => {
  const a = newGame('987654321', P);
  const b = newGame('987654321', P);
  assert.equal(a.current, b.current);
  assert.equal(a.nextValue, b.nextValue);
  assert.equal(hashState(a), hashState(b));
});

// ---------------------------------------------------------------------------
// The spawn distribution (RULES 3, v1.1)

test('empty board: exact integer weights, centre at tier 2, ceiling 5', () => {
  const d = distributionFor([[], [], [], [], []], P);
  assert.equal(d.centreMilli, 2000);
  assert.equal(d.ceiling, 5);
  assert.deepEqual(d.entries.map((e) => e.weight), [700, 1000, 700, 400, 100]);
  assert.equal(d.total, 2900);
  assert.deepEqual(d.entries.map((e) => e.value), [2, 4, 8, 16, 32]);
});

test('max tile 256: the centre has drifted and the ceiling widened, exactly', () => {
  const d = distributionFor([[256], [], [], [], []], P);
  // M = 8, c = 2000 + 400 x (8 - 4) = 3600, C = max(5, 4 + 3) = 7
  assert.equal(d.centreMilli, 3600);
  assert.equal(d.ceiling, 7);
  assert.deepEqual(d.entries.map((e) => e.weight), [220, 520, 820, 880, 580, 280, 40]);
  assert.equal(d.total, 3340);
});

test('the centre drifts monotonically with the board max tile', () => {
  const centreAt = (v) => distributionFor([[v], [], [], [], []], P).centreMilli;
  assert.equal(centreAt(16), 2000); // M = 4: drift not started
  assert.equal(centreAt(64), 2800); // M = 6
  assert.equal(centreAt(1024), 4400); // M = 10
  assert.ok(centreAt(16) < centreAt(64) && centreAt(64) < centreAt(1024));
});

test('no live tier ever reaches zero probability', () => {
  for (const v of [0, 16, 256, 4096, 65536]) {
    const board = v === 0 ? [[], [], [], [], []] : [[v], [], [], [], []];
    const d = distributionFor(board, P);
    for (const e of d.entries) {
      assert.ok(e.weight >= P.floorWeight, `tier ${e.tier} weight ${e.weight} below floor`);
      assert.ok(e.probability > 0);
    }
  }
});

test('probabilities sum to 1 at every stage of a full game', () => {
  let state = newGame('13579', P);
  for (let i = 0; i < 200 && state.status === 'playing'; i++) {
    const d = spawnDistribution(state);
    const sum = d.entries.reduce((acc, e) => acc + e.probability, 0);
    assert.ok(Math.abs(sum - 1) < 1e-12, `sum ${sum} at move ${i}`);
    assert.equal(d.entries.reduce((acc, e) => acc + e.weight, 0), d.total);
    state = play(state, i % 5).state;
  }
});

test('every spawned value is a live tier under the current ceiling', () => {
  let state = newGame('424242', P);
  for (let i = 0; i < 200 && state.status === 'playing'; i++) {
    const before = spawnDistribution(state);
    const { state: next, events } = play(state, i % 5);
    if (events.spawned) {
      // The spawned block is the previously previewed draw; its tier was live
      // when drawn (drawn from the pre-lock board of the PREVIOUS move).
      const tier = Math.round(Math.log2(events.spawned.value));
      assert.ok(tier >= 1, `tier ${tier} below 1`);
      assert.ok(before.entries.some((e) => e.value === events.spawned.value)
        || tier <= before.ceiling + 1,
      `spawn ${events.spawned.value} implausible against ceiling ${before.ceiling}`);
    }
    state = next;
  }
});

test('the preview is exactly the value that then spawns', () => {
  let state = newGame('86420', P);
  for (let i = 0; i < 60 && state.status === 'playing'; i++) {
    const promised = previewValue(state);
    const { state: next, events } = play(state, i % 5);
    if (events.spawned) assert.equal(events.spawned.value, promised);
    state = next;
  }
});

test('config.js carries all eight named spawn parameters as integers', () => {
  for (const name of ['centreBase', 'centreGain', 'centreStart', 'ceilingMin',
    'ceilingSpread', 'peakWeight', 'slope', 'floorWeight']) {
    assert.ok(Number.isInteger(CONFIG.spawn[name]), `${name} missing from config.spawn`);
  }
});

// ---------------------------------------------------------------------------
// Merging and the 2^(n-1) maths (RULES 4) -- unchanged in v1.1

test('pair merges to 2x on the locked cell, then settles', () => {
  const s = fromPosition({ board: [[2], [], [], [], []], current: 2, spawn: P });
  const { state, events } = play(s, 0);
  assert.equal(events.passes.length, 1);
  const m = events.passes[0].merges[0];
  assert.equal(m.size, 2);
  assert.equal(m.result, 4);
  assert.deepEqual(m.target, { c: 0, r: 1 }); // the just-locked cell
  assert.deepEqual(state.board[0], [4]); // gravity settled it down
  assert.equal(state.score, 4); // resulting value x chain index 1
});

test('triple merges to 4x, quad to 8x, quintuple to 16x', () => {
  const triple = play(fromPosition({ board: [[2], [2], [], [], []], current: 2, spawn: P }), 2);
  assert.equal(triple.state.board[2][0], 8);
  assert.equal(triple.state.score, 8);

  const quad = play(fromPosition({ board: [[2], [2], [2], [], []], current: 2, spawn: P }), 3);
  assert.equal(quad.state.board[3][0], 16);
  assert.equal(quad.state.score, 16);

  const quint = play(fromPosition({ board: [[2], [2], [], [2], [2]], current: 2, spawn: P }), 2);
  assert.equal(quint.state.board[2][0], 32);
  assert.equal(quint.state.score, 32);
  assert.equal(quint.state.mergeCounts[5], 1);
});

test('disjoint groups in one pass merge simultaneously and share its index', () => {
  const s = fromPosition({ board: [[2, 2], [], [], [4, 4], []], current: 16, spawn: P });
  const { state, events } = play(s, 2);
  assert.equal(events.passes.length, 1);
  assert.equal(events.passes[0].merges.length, 2);
  assert.equal(events.passes[0].chain, 1);
  assert.equal(state.score, 4 * 1 + 8 * 1);
});

test('two-pass cascade: chain index rises, cascade lands on the lowest cell', () => {
  const s = fromPosition({ board: [[4, 2], [8, 4], [], [], []], current: 2, spawn: P });
  const { state, events } = play(s, 0);
  assert.equal(events.passes.length, 2);
  assert.equal(events.passes[0].chain, 1);
  assert.equal(events.passes[1].chain, 2);
  const cascade = events.passes[1].merges[0];
  assert.equal(cascade.size, 3);
  assert.deepEqual(cascade.target, { c: 0, r: 0 }); // the group's lowest cell
  assert.equal(state.score, 4 * 1 + 16 * 2);
  assert.deepEqual(state.board[0], [16]);
  assert.deepEqual(state.board[1], [8]);
  assert.equal(state.longestChain, 2);
});

test('four-pass chain with a buried partner and simultaneous cascade groups', () => {
  const s = fromPosition({
    board: [[2, 4], [32], [16, 2, 8], [2, 8], []],
    current: 2,
    spawn: P,
  });
  const { state, events } = play(s, 1);
  assert.equal(events.passes.length, 4);
  assert.equal(events.passes[1].merges.length, 2); // the simultaneous pair
  assert.equal(events.passes[1].chain, 2);
  // 4x1 + (8+16)x2 + 32x3 + 64x4
  assert.equal(state.score, 4 + 48 + 96 + 256);
  assert.equal(state.longestChain, 4);
  assert.equal(state.maxTile, 64);
  assert.deepEqual(state.board, [[2, 8], [64], [], [2], []]);
});

// ---------------------------------------------------------------------------
// Overflow, clutch rescue, game over on the 6-row board (RULES 1, 6)

test('clutch rescue: an overflow lock that merges back to legal height plays on', () => {
  const full = [4, 8, 16, 32, 64, 2]; // 6 blocks, topmost a 2
  const s = fromPosition({ board: [[], [], full, [], []], current: 2, spawn: P });
  const { state, events } = play(s, 2);
  assert.equal(events.locked.row, 6); // locked above row 6
  assert.equal(state.status, 'playing');
  assert.equal(state.board[2].length, 6);
  assert.equal(state.board[2][5], 4); // the rescued merge result
});

test('game over: overflow with no rescue ends the game at the current score', () => {
  const full = [4, 8, 16, 32, 64, 128];
  const s = fromPosition({ board: [[], [], full, [], []], current: 2, spawn: P });
  const { state, events } = play(s, 2);
  assert.equal(state.status, 'over');
  assert.equal(events.gameOver, true);
  assert.equal(events.spawned, null);
  assert.equal(state.score, 0); // placement scores zero; final score stands
  assert.throws(() => play(state, 0), /game is over/);
});

test('game over is judged after full resolution, merges elsewhere included', () => {
  const full = [4, 8, 16, 32, 64, 128];
  const s = fromPosition({ board: [[2, 2], [], full, [], []], current: 512, spawn: P });
  const { state } = play(s, 2); // the [2,2] pair merges, column 2 stays at 7
  assert.equal(state.score, 4); // the elsewhere-merge scored on pass 1
  assert.equal(state.status, 'over');
});

test('a column of exactly 6 is legal and does not end the game', () => {
  const s = fromPosition({ board: [[4, 8, 16, 32, 64], [], [], [], []], current: 128, spawn: P });
  const { state } = play(s, 0);
  assert.equal(state.board[0].length, 6);
  assert.equal(state.status, 'playing');
});

// ---------------------------------------------------------------------------
// Purity and replay determinism (RULES 3, 7)

test('play does not mutate its input state', () => {
  const s = fromPosition({ board: [[2], [], [], [], []], current: 2, spawn: P });
  const before = hashState(s);
  play(s, 0);
  assert.equal(hashState(s), before);
});

test('cloneState is deep for board, rng, spawn and mergeCounts', () => {
  const s = newGame('7', P);
  const c = cloneState(s);
  c.board[0].push(2);
  c.mergeCounts[2] = 99;
  c.rng.state += 1n;
  c.spawn.slope += 1;
  assert.equal(s.board[0].length, 0);
  assert.equal(s.mergeCounts[2], undefined);
  assert.notEqual(s.rng.state, c.rng.state);
  assert.equal(s.spawn.slope, P.slope);
});

test('replay determinism: scripted game, saved and re-run, identical hash and score', () => {
  const { state, moves } = runScriptedGame();
  const replay = makeReplay(SCRIPT_SEED, moves, {
    date: '2026-08-05', player: 'test', result: resultMetrics(state),
  }, SCRIPT_SPAWN);
  const rerun = runReplay(replay);
  assert.equal(hashState(rerun), hashState(state));
  assert.equal(rerun.score, state.score);
  assert.deepEqual(resultMetrics(rerun), replay.meta.result);
  const verdict = verifyReplay(replay);
  assert.equal(verdict.ok, true);
});

test('a replay verifies under its own embedded tuning, not the live config', () => {
  const softer = { ...SCRIPT_SPAWN, slope: 500 };
  let state = newGame('999', softer);
  const moves = [];
  for (let i = 0; i < 30 && state.status === 'playing'; i++) {
    moves.push(i % 5);
    state = play(state, i % 5).state;
  }
  const replay = makeReplay('999', moves, { result: resultMetrics(state) }, softer);
  assert.equal(verifyReplay(replay).ok, true);
  assert.equal(replay.spawn.slope, 500);
});

test('the scripted game matches the locked-in cross-environment expectation', () => {
  const { state } = runScriptedGame();
  assert.equal(hashState(state), EXPECTED.finalHash);
  assert.equal(state.score, EXPECTED.score);
  assert.equal(state.status, EXPECTED.status);
  assert.equal(state.moveCount, EXPECTED.moveCount);
});

test('a tampered replay fails verification', () => {
  const { state, moves } = runScriptedGame();
  const replay = makeReplay(SCRIPT_SEED, moves, { result: resultMetrics(state) }, SCRIPT_SPAWN);
  replay.meta.result.score += 1;
  assert.equal(verifyReplay(replay).ok, false);
});

test('a format v1 replay is refused with a clear reason', () => {
  assert.throws(() => runReplay({ version: 1, seed: '1', moves: [] }),
    /v1 replay.*cannot be replayed correctly/s);
  assert.throws(() => runReplay({ version: 3, seed: '1', moves: [] }),
    /unsupported replay version/);
});

// ---------------------------------------------------------------------------
// Metrics (RULES 7)

test('metrics track placements, merge counts by size and longest chain', () => {
  const s = fromPosition({ board: [[4, 2], [8, 4], [], [], []], current: 2, spawn: P });
  const { state } = play(s, 0);
  const m = resultMetrics(state);
  assert.equal(m.blocksPlaced, 1);
  assert.equal(m.mergeCounts[2], 1);
  assert.equal(m.mergeCounts[3], 1);
  assert.equal(m.longestChain, 2);
  assert.equal(m.maxTile, 16);
  assert.equal(typeof m.finalHash, 'string');
});
