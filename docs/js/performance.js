// performance.js -- grading a finished human game, and the composite score.
//
// Three indices, each 0 to 100, and one weighted total. `grader.js` is the judge
// (a faithful browser copy of the pinned leak-free champion); this file is the
// product side: it walks a recorded game past the judge, turns score and pace
// into indices, and combines them. Every constant it uses is a named tunable in
// config.js (RULES.md 8): none of this is a rule, and all of it is arguable.
//
// DETERMINISM. A grade is a pure function of (seed, spawn parameters, moves).
// Grading is chunked across frames so the page keeps painting, but the chunk
// boundaries touch nothing: the same replay graded twice returns identical
// numbers, which the game asserts in `docs/test.html` and the lab suite pins for
// the judge itself.
//
// The pace half is the one part that is NOT reproducible from a replay's moves
// alone, because it comes from the recorded per-move timestamps. A replay
// without them grades with accuracy and score only, and says so.

import { newGame, play } from './engine.js';
import { CONFIG } from './config.js';
import { choose, candidates, CHAMPION_ID } from './grader.js';

const P = CONFIG.performance;

const WEIGHT_SUM = P.weightAccuracy + P.weightScore + P.weightPace;
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`CONFIG.performance composite weights must sum to 1, got ${WEIGHT_SUM}`);
}

const clamp01 = (x) => (x < 0 ? 0 : (x > 1 ? 1 : x));

// Hand the event loop back without being throttled.
//
// The obvious `setTimeout(resolve, 0)` is wrong here, measurably: Chrome clamps
// timers in a hidden or backgrounded tab to roughly one call a second, so a grade
// that takes half a second in the foreground took over forty in a tab that had
// lost focus (measured 2026-08-05 while verifying v1.2). A MessageChannel message
// is a macrotask and is not throttled, which is why schedulers use it.
//
// The channel is created per grade and CLOSED when the grade ends, not held open
// for the module's lifetime. An open port with a listener is a live handle: in the
// browser it is a small leak, and in Node it keeps the event loop alive, which
// hung `node --test docs/test/` after the last grading test had passed. Hence the
// dispose, and hence the try/finally around the loop that uses it.
function makeYielder() {
  if (typeof MessageChannel !== 'function') {
    return { hand: () => new Promise((resolve) => setTimeout(resolve, 0)), dispose() {} };
  }
  const waiting = [];
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    const resolve = waiting.shift();
    if (resolve) resolve();
  };
  return {
    hand: () => new Promise((resolve) => {
      waiting.push(resolve);
      channel.port2.postMessage(0);
    }),
    dispose() {
      channel.port1.onmessage = null;
      channel.port1.close();
      channel.port2.close();
    },
  };
}

// ---------------------------------------------------------------------------
// The three indices

// Agreement with the champion, as a percentage of graded moves.
export function accuracyIndex({ agreed, graded }) {
  return graded > 0 ? (agreed / graded) * 100 : 0;
}

// Game score, log-scaled between the floor and the champion's eval median.
export function scoreIndex(score) {
  const floor = Math.log(Math.max(1, P.scoreIndexFloor));
  const cap = Math.log(Math.max(P.scoreIndexFloor + 1, P.scoreIndexCap));
  const here = Math.log(Math.max(1, score));
  return clamp01((here - floor) / (cap - floor)) * 100;
}

// Speed of play: full marks at or under the fast threshold, nothing at or over
// the slow one. Null when the game carries no timings.
export function paceIndex(medianSecondsPerMove) {
  if (medianSecondsPerMove === null || medianSecondsPerMove === undefined) return null;
  const fast = P.paceFastSeconds;
  const slow = P.paceSlowSeconds;
  return clamp01((slow - medianSecondsPerMove) / (slow - fast)) * 100;
}

// The composite. When pace is missing its weight is dropped and the remaining
// two are renormalised, so a replay without timings still gets a comparable
// number rather than a silently deflated one; `paceCounted` says which happened.
export function composite({ accuracy, score, pace }) {
  const parts = [
    { key: 'accuracy', value: accuracy, weight: P.weightAccuracy },
    { key: 'score', value: score, weight: P.weightScore },
    { key: 'pace', value: pace, weight: P.weightPace },
  ].filter((p) => p.value !== null && p.value !== undefined);
  const weight = parts.reduce((a, p) => a + p.weight, 0);
  const total = parts.reduce((a, p) => a + p.weight * p.value, 0) / weight;
  return { total, paceCounted: pace !== null && pace !== undefined };
}

// ---------------------------------------------------------------------------
// Timing

// Median seconds per move from a replay's cumulative move timestamps. The gaps
// between consecutive stamps are the per-move times; the first gap is measured
// from the start of the run, which is honest (the first block does have to be
// steered) and matches what the game records.
export function medianSecondsPerMove(moveTimestamps) {
  if (!Array.isArray(moveTimestamps) || moveTimestamps.length === 0) return null;
  const gaps = [];
  let prev = 0;
  for (const stamp of moveTimestamps) {
    gaps.push(Math.max(0, stamp - prev) / 1000);
    prev = stamp;
  }
  gaps.sort((a, b) => a - b);
  const n = gaps.length;
  return n % 2 === 1 ? gaps[(n - 1) / 2] : (gaps[n / 2 - 1] + gaps[n / 2]) / 2;
}

// ---------------------------------------------------------------------------
// Grading a game

// Walk the recorded moves, asking the champion for its column at every position
// and comparing. Yields to the event loop whenever the frame budget is spent, so
// a long game grades without freezing the page.
//
// A move into a column the champion would not even consider (a clutch lock into
// a full column, RULES.md 6) counts as a disagreement and is tallied separately,
// because "the champion cannot choose this" is worth saying out loud rather than
// hiding inside an accuracy percentage.
export async function gradeGame({ seed, spawn, moves }, { onProgress, now = () => performance.now() } = {}) {
  let state = newGame(seed, spawn);
  let agreed = 0;
  let graded = 0;
  let clutch = 0;
  let sliceStart = now();
  const yielder = makeYielder();

  try {
    for (const move of moves) {
      if (state.status !== 'playing') break;
      const wanted = choose(state);
      if (wanted === move) agreed += 1;
      else if (!candidates(state).includes(move)) clutch += 1;
      graded += 1;
      state = play(state, move).state;

      if (now() - sliceStart >= P.gradeChunkMs) {
        if (onProgress) onProgress(graded, moves.length);
        await yielder.hand();
        sliceStart = now();
      }
    }
  } finally {
    yielder.dispose();
  }
  if (onProgress) onProgress(graded, moves.length);

  return {
    championId: CHAMPION_ID,
    graded,
    agreed,
    clutchMoves: clutch,
    accuracy: accuracyIndex({ agreed, graded }),
  };
}

// The whole post-game verdict from a replay: grade it, index it, combine it.
export async function assess(replay, options = {}) {
  const timings = replay.meta?.moveTimestamps ?? null;
  const perMove = medianSecondsPerMove(timings);
  const grade = await gradeGame(
    { seed: replay.seed, spawn: replay.spawn, moves: replay.moves },
    options,
  );
  const result = replay.meta?.result ?? {};
  const indices = {
    accuracy: grade.accuracy,
    score: scoreIndex(result.score ?? 0),
    pace: paceIndex(perMove),
  };
  const { total, paceCounted } = composite(indices);
  return {
    ...grade,
    medianSecondsPerMove: perMove,
    indices,
    composite: total,
    paceCounted,
    weights: {
      accuracy: P.weightAccuracy,
      score: P.weightScore,
      pace: P.weightPace,
    },
    scoreIndexCap: P.scoreIndexCap,
  };
}
