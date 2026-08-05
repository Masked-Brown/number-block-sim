// engine.test.mjs -- the engine's conformance suite against RULES.md v1.0.
// Run: node --test docs/test/
// No dependencies: Node's built-in test runner only.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RULES, _pcg, newGame, fromPosition, play, spawnWindow, previewValue,
  hashState, makeReplay, runReplay, verifyReplay, resultMetrics, cloneState,
} from '../js/engine.js';
import { SCRIPT_SEED, runScriptedGame, EXPECTED } from './scripted-game.js';

// ---------------------------------------------------------------------------
// PCG32: bit-identical to the reference implementation

test('PCG32 matches the reference vectors (seed 42, seq 54)', () => {
  const rng = _pcg.init(42n, 54n);
  const got = Array.from({ length: 6 }, () => _pcg.next(rng));
  assert.deepEqual(got, [0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e]);
});

test('same seed twice gives the identical opening', () => {
  const a = newGame('987654321');
  const b = newGame('987654321');
  assert.equal(a.current, b.current);
  assert.equal(a.nextOffset, b.nextOffset);
  assert.equal(hashState(a), hashState(b));
});

// ---------------------------------------------------------------------------
// Merging and the 2^(n-1) maths (RULES 4)

test('pair merges to 2x on the locked cell, then settles', () => {
  const s = fromPosition({ board: [[2], [], [], [], []], current: 2 });
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
  const triple = play(fromPosition({ board: [[2], [2], [], [], []], current: 2 }), 2);
  assert.equal(triple.state.board[2][0], 8);
  assert.equal(triple.state.score, 8);

  const quad = play(fromPosition({ board: [[2], [2], [2], [], []], current: 2 }), 3);
  assert.equal(quad.state.board[3][0], 16);
  assert.equal(quad.state.score, 16);

  const quint = play(fromPosition({ board: [[2], [2], [], [2], [2]], current: 2 }), 2);
  assert.equal(quint.state.board[2][0], 32);
  assert.equal(quint.state.score, 32);
  assert.equal(quint.state.mergeCounts[5], 1);
});

test('disjoint groups in one pass merge simultaneously and share its index', () => {
  // Two pre-existing pairs plus a neutral lock: both merge on pass 1.
  const s = fromPosition({ board: [[2, 2], [], [], [4, 4], []], current: 16 });
  const { state, events } = play(s, 2);
  assert.equal(events.passes.length, 1);
  assert.equal(events.passes[0].merges.length, 2);
  assert.equal(events.passes[0].chain, 1);
  assert.equal(state.score, 4 * 1 + 8 * 1);
});

// ---------------------------------------------------------------------------
// Cascades and chain-index scoring (RULES 4, 5)

test('two-pass cascade: chain index rises, cascade lands on the lowest cell', () => {
  // Lock 2 on [4,2]: pair -> 4 settles beside the 4s, and the resulting
  // triple of 4s lands on the lowest cell (0,0) on the cascade pass.
  const s = fromPosition({ board: [[4, 2], [8, 4], [], [], []], current: 2 });
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
  // Lock 2 at (1,1); its partner (2,1) is buried under an 8. The freed 8
  // falls beside another 8 while the merged 4 sits beside another 4: two
  // disjoint groups share pass 2, and the chain runs to pass 4.
  const s = fromPosition({
    board: [[2, 4], [32], [16, 2, 8], [2, 8], []],
    current: 2,
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
// Floor rise, no purge, stranded blocks (RULES 3)

test('floor rises at exactly 128x and retired blocks stay (no purge)', () => {
  // 128 + 128 merge to 256 = 128 x floor 2: the first rise, window {4..32}.
  const s = fromPosition({ board: [[128], [], [], [], [2]], current: 128 });
  const { state, events } = play(s, 0);
  assert.deepEqual(events.floorRose, { from: 2, to: 4 });
  assert.deepEqual(spawnWindow(state), [4, 8, 16, 32]);
  assert.deepEqual(state.board[4], [2]); // the retired 2 is still there
});

test('floor does not rise below the threshold', () => {
  const s = fromPosition({ board: [[64], [], [], [], []], current: 64 });
  const { state, events } = play(s, 0); // max tile 128 < 256
  assert.equal(events.floorRose, null);
  assert.equal(state.floor, 2);
});

test('floor doubles repeatedly while the threshold holds', () => {
  // 512 + 512 merge to 1024 from floor 2: 1024 >= 256, 512, 1024 -> floor 16.
  const s = fromPosition({ board: [[512], [], [], [], []], current: 512 });
  const { state } = play(s, 0);
  assert.equal(state.floor, 16);
  assert.deepEqual(spawnWindow(state), [16, 32, 64, 128]);
});

test('stranded retired blocks can still merge with each other', () => {
  const s = fromPosition({ board: [[2], [], [], [], []], current: 2, floor: 8 });
  const { state } = play(s, 0);
  assert.deepEqual(state.board[0], [4]);
});

test('the queued offset binds at spawn time, under the post-rise floor', () => {
  const s = fromPosition({ board: [[128], [], [], [], []], current: 128 });
  const offset = s.nextOffset;
  assert.equal(previewValue(s), 2 * 2 ** offset); // honest preview before the rise
  const { state, events } = play(s, 0); // rise to floor 4 happens first
  assert.equal(events.spawned.value, 4 * 2 ** offset);
  assert.equal(state.current, 4 * 2 ** offset);
});

test('every spawn over a long seeded game is inside the current window', () => {
  let state = newGame('424242');
  for (let i = 0; i < 300 && state.status === 'playing'; i++) {
    const { state: next, events } = play(state, i % 5);
    if (events.spawned) {
      assert.ok(spawnWindow(next).includes(events.spawned.value),
        `spawn ${events.spawned.value} outside window ${spawnWindow(next)}`);
    }
    state = next;
  }
});

// ---------------------------------------------------------------------------
// Overflow, clutch rescue, game over (RULES 6)

test('clutch rescue: an overflow lock that merges back to legal height plays on', () => {
  const full = [4, 8, 16, 32, 64, 128, 2]; // 7 blocks, topmost a 2
  const s = fromPosition({ board: [[], [], full, [], []], current: 2 });
  const { state, events } = play(s, 2);
  assert.equal(events.locked.row, 7); // locked above row 7
  assert.equal(state.status, 'playing');
  assert.equal(state.board[2].length, 7);
  assert.equal(state.board[2][6], 4); // the rescued merge result
});

test('game over: overflow with no rescue ends the game at the current score', () => {
  const full = [4, 8, 16, 32, 64, 128, 256];
  const s = fromPosition({ board: [[], [], full, [], []], current: 2 });
  const { state, events } = play(s, 2);
  assert.equal(state.status, 'over');
  assert.equal(events.gameOver, true);
  assert.equal(events.spawned, null);
  assert.equal(state.score, 0); // placement scores zero; final score stands
  assert.throws(() => play(state, 0), /game is over/);
});

test('game over is judged after full resolution, merges elsewhere included', () => {
  const full = [4, 8, 16, 32, 64, 128, 256];
  const s = fromPosition({ board: [[2, 2], [], full, [], []], current: 512 });
  const { state } = play(s, 2); // the [2,2] pair merges, column 2 stays at 8
  assert.equal(state.score, 4); // the elsewhere-merge scored on pass 1
  assert.equal(state.status, 'over');
});

// ---------------------------------------------------------------------------
// Purity and replay determinism (RULES 3, 7)

test('play does not mutate its input state', () => {
  const s = fromPosition({ board: [[2], [], [], [], []], current: 2 });
  const before = hashState(s);
  play(s, 0);
  assert.equal(hashState(s), before);
});

test('cloneState is deep for board, rng and mergeCounts', () => {
  const s = newGame('7');
  const c = cloneState(s);
  c.board[0].push(2);
  c.mergeCounts[2] = 99;
  c.rng.state += 1n;
  assert.equal(s.board[0].length, 0);
  assert.equal(s.mergeCounts[2], undefined);
  assert.notEqual(s.rng.state, c.rng.state);
});

test('replay determinism: scripted game, saved and re-run, identical hash and score', () => {
  const { state, moves } = runScriptedGame();
  const replay = makeReplay(SCRIPT_SEED, moves, {
    date: '2026-08-05', player: 'test', result: resultMetrics(state),
  });
  const rerun = runReplay(replay);
  assert.equal(hashState(rerun), hashState(state));
  assert.equal(rerun.score, state.score);
  assert.deepEqual(resultMetrics(rerun), replay.meta.result);
  const verdict = verifyReplay(replay);
  assert.equal(verdict.ok, true);
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
  const replay = makeReplay(SCRIPT_SEED, moves, { result: resultMetrics(state) });
  replay.meta.result.score += 1;
  assert.equal(verifyReplay(replay).ok, false);
});

// ---------------------------------------------------------------------------
// Metrics (RULES 7)

test('metrics track placements, merge counts by size and longest chain', () => {
  const s = fromPosition({ board: [[4, 2], [8, 4], [], [], []], current: 2 });
  const { state } = play(s, 0);
  const m = resultMetrics(state);
  assert.equal(m.blocksPlaced, 1);
  assert.equal(m.mergeCounts[2], 1);
  assert.equal(m.mergeCounts[3], 1);
  assert.equal(m.longestChain, 2);
  assert.equal(m.maxTile, 16);
  assert.equal(typeof m.finalHash, 'string');
});
