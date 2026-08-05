// grading.test.js -- the v1.2 post-game grader and composite score.
// Run: node --test docs/test/
//
// Two things matter here. The judge must be a pure function of the position, so
// that a replay graded twice grades the same and a shared score means something.
// And the composite must be exactly the arithmetic config.js says it is, so that
// nobody has to read the code to know what their number means.
//
// The judge's AGREEMENT with the lab's pinned champion is not tested here: it
// cannot be, because the lab is not part of what the browser loads. That
// equivalence is pinned from the other side, in 03_train/lab/test/lab.test.js
// ("the browser grader matches the pinned champion move for move").

import test from 'node:test';
import assert from 'node:assert/strict';

import { newGame, play, makeReplay, resultMetrics } from '../js/engine.js';
import { CONFIG } from '../js/config.js';
import { choose, rank, candidates, CHAMPION_ID } from '../js/grader.js';
import {
  assess, gradeGame, scoreIndex, paceIndex, composite, medianSecondsPerMove,
} from '../js/performance.js';

const P = CONFIG.performance;

// A reproducible stand-in for a human game: a fixed, slightly silly policy, so
// the moves disagree with the champion often enough for accuracy to be
// interesting, plus per-move timestamps at a fixed cadence.
function humanish(seed = '424242', maxMoves = 70, msPerMove = 3000) {
  let state = newGame(seed);
  const moves = [];
  const stamps = [];
  let i = 0;
  while (state.status === 'playing' && moves.length < maxMoves) {
    const col = (i * 3 + 1) % 5;
    const open = candidates(state);
    const move = open.includes(col) ? col : open[0];
    moves.push(move);
    stamps.push((moves.length) * msPerMove);
    state = play(state, move).state;
    i += 1;
  }
  return makeReplay(seed, moves, {
    date: '2026-08-05T12:00:00.000Z',
    player: 'human',
    result: resultMetrics(state),
    durationMs: stamps[stamps.length - 1],
    moveTimestamps: stamps,
  }, state.spawn);
}

// ---------------------------------------------------------------------------
// The judge

test('the grader is a pure function of the position', () => {
  let state = newGame('99');
  for (let i = 0; i < 25 && state.status === 'playing'; i++) {
    const a = choose(state);
    const b = choose(state);
    assert.equal(a, b, `the grader gave two answers for one position at move ${i}`);
    assert.ok(candidates(state).includes(a));
    state = play(state, a).state;
  }
});

test('the grader ranks every candidate column exactly once', () => {
  let state = newGame('7');
  for (let i = 0; i < 12 && state.status === 'playing'; i++) {
    const ranked = rank(state);
    const cols = ranked.map((r) => r.col);
    assert.deepEqual([...cols].sort(), [...candidates(state)].sort());
    assert.equal(new Set(cols).size, cols.length);
    for (let k = 1; k < ranked.length; k++) {
      assert.ok(ranked[k - 1].total >= ranked[k].total, 'ranking is not sorted by value');
    }
    state = play(state, cols[0]).state;
  }
});

test('the grader never reads a draw a player cannot see', () => {
  // The engine has already drawn every future block; those draws live in the rng
  // state. Perturb only that. An honest judge cannot notice.
  let state = newGame('31337');
  for (let i = 0; i < 20 && state.status === 'playing'; i++) {
    const base = choose(state);
    for (let k = 1; k < 4; k++) {
      const alt = { ...state, rng: { state: state.rng.state ^ BigInt(k * 0x9e3779b9), inc: state.rng.inc } };
      assert.equal(alt.current, state.current);
      assert.equal(alt.nextValue, state.nextValue);
      assert.equal(choose(alt), base, `the judge changed its mind at move ${i} on rng stream ${k}`);
    }
    state = play(state, base).state;
  }
});

// ---------------------------------------------------------------------------
// Determinism of a whole grade

test('the same replay grades identically twice', async () => {
  const replay = humanish();
  const first = await assess(replay);
  const second = await assess(replay);
  assert.deepEqual(second, first);
  assert.equal(first.championId, CHAMPION_ID);
  assert.equal(first.graded, replay.moves.length);
  assert.ok(first.agreed >= 0 && first.agreed <= first.graded);
});

test('the chunk budget changes nothing about a grade', async () => {
  const replay = humanish();
  // A budget of zero yields to the event loop on every single move; a huge one
  // never yields. Same numbers either way, or the grade depends on the CPU.
  const patient = await gradeGame(replay, { now: () => 0 });
  let clock = 0;
  const impatient = await gradeGame(replay, { now: () => (clock += 1000) });
  assert.deepEqual(impatient, patient);
});

test('a replay without timings grades on accuracy and score alone', async () => {
  const replay = humanish();
  delete replay.meta.moveTimestamps;
  const verdict = await assess(replay);
  assert.equal(verdict.indices.pace, null);
  assert.equal(verdict.paceCounted, false);
  // Pace's weight is dropped and the other two renormalised, so the composite
  // stays on the same 0 to 100 scale rather than losing a fifth of itself.
  const expected = (P.weightAccuracy * verdict.indices.accuracy + P.weightScore * verdict.indices.score)
    / (P.weightAccuracy + P.weightScore);
  assert.ok(Math.abs(verdict.composite - expected) < 1e-9);
});

// ---------------------------------------------------------------------------
// The three indices and the composite

test('the composite weights sum to one and are the ones config states', () => {
  assert.equal(P.weightAccuracy + P.weightScore + P.weightPace, 1);
  const c = composite({ accuracy: 100, score: 0, pace: 0 });
  assert.ok(Math.abs(c.total - P.weightAccuracy * 100) < 1e-9);
  const d = composite({ accuracy: 40, score: 60, pace: 80 });
  const expected = P.weightAccuracy * 40 + P.weightScore * 60 + P.weightPace * 80;
  assert.ok(Math.abs(d.total - expected) < 1e-9);
});

test('scoreIndex is log-scaled between the floor and the champion median', () => {
  assert.equal(scoreIndex(0), 0);
  assert.equal(scoreIndex(P.scoreIndexFloor), 0);
  assert.equal(scoreIndex(P.scoreIndexCap), 100);
  assert.equal(scoreIndex(P.scoreIndexCap * 10), 100, 'the cap must cap');
  // Log-scaled means the geometric midpoint sits at 50, not the arithmetic one.
  const geometric = Math.sqrt(P.scoreIndexFloor * P.scoreIndexCap);
  assert.ok(Math.abs(scoreIndex(geometric) - 50) < 1e-6);
  // And the arithmetic midpoint sits well above 50, which is the point of the
  // log scale: most of the index's range is spent on the scores humans reach.
  assert.ok(scoreIndex((P.scoreIndexFloor + P.scoreIndexCap) / 2) > 80);
  // Monotone, which a score index had better be.
  let prev = -1;
  for (const s of [0, 500, 2000, 20000, 200000, 600000, 2000000]) {
    const v = scoreIndex(s);
    assert.ok(v >= prev, `scoreIndex fell at ${s}`);
    prev = v;
  }
});

test('paceIndex is 100 up to the fast threshold and 0 from the slow one', () => {
  assert.equal(paceIndex(0), 100);
  assert.equal(paceIndex(P.paceFastSeconds), 100);
  assert.equal(paceIndex(P.paceSlowSeconds), 0);
  assert.equal(paceIndex(P.paceSlowSeconds + 30), 0);
  const mid = (P.paceFastSeconds + P.paceSlowSeconds) / 2;
  assert.ok(Math.abs(paceIndex(mid) - 50) < 1e-9);
  assert.equal(paceIndex(null), null);
  assert.equal(paceIndex(undefined), null);
});

test('median seconds per move reads the cumulative stamps as gaps', () => {
  assert.equal(medianSecondsPerMove(null), null);
  assert.equal(medianSecondsPerMove([]), null);
  // Gaps 1, 2, 3, 4 seconds: median 2.5.
  assert.equal(medianSecondsPerMove([1000, 3000, 6000, 10000]), 2.5);
  // The first gap is measured from the start of the run.
  assert.equal(medianSecondsPerMove([5000]), 5);
  // Non-monotone stamps cannot make a negative gap.
  assert.ok(medianSecondsPerMove([2000, 1000]) >= 0);
});

test('a fast, accurate, high-scoring game scores near 100 and a bad one near 0', () => {
  const best = composite({ accuracy: 100, score: 100, pace: 100 });
  const worst = composite({ accuracy: 0, score: 0, pace: 0 });
  assert.equal(best.total, 100);
  assert.equal(worst.total, 0);
});
