// engine.js -- the pure game engine for number-block-sim.
//
// Implements 01_rules/output/RULES.md v1.1 exactly. Pure logic module: no DOM,
// no timers, no rendering, no Math.random. Board state in, move in, new state
// and events out. Runs unchanged in the browser and in Node (the 03_train sim
// harness imports this same file).
//
// The constants below are RULES (sections 1 to 6), locked at v1.1; changing one
// is a rule change and is AB's decision, never tuning. The spawn curve's
// PARAMETERS are tuning (RULES.md section 8) and live in config.js; its FORMULA
// is a rule and lives here. Spawn maths is integer throughout, so every JS
// engine agrees to the bit (no Math.exp, no floats).

import { CONFIG } from './config.js';

export const RULES = Object.freeze({
  COLS: 5, // board width (RULES 1)
  ROWS: 6, // legal column height; a lock above this is an overflow (RULES 1, 6)
  PCG_SEQ: 54n, // fixed PCG32 stream; part of the deterministic spec (RULES 3)
});

// ---------------------------------------------------------------------------
// PCG32 (XSH RR 64/32), bit-identical in Node and browser via BigInt.
// Reference: O'Neill, pcg-random.org, the minimal C implementation.

const MASK64 = (1n << 64n) - 1n;
const MASK32 = 0xffffffffn;
const PCG_MUL = 6364136223846793005n;

function pcgNext(rng) {
  const old = rng.state;
  rng.state = (old * PCG_MUL + rng.inc) & MASK64;
  const xorshifted = Number((((old >> 18n) ^ old) >> 27n) & MASK32);
  const rot = Number(old >> 59n);
  return ((xorshifted >>> rot) | (xorshifted << (-rot & 31))) >>> 0;
}

function pcgInit(seed, seq) {
  const rng = { state: 0n, inc: (((seq << 1n) | 1n) & MASK64) };
  pcgNext(rng);
  rng.state = (rng.state + (seed & MASK64)) & MASK64;
  pcgNext(rng);
  return rng;
}

// Exported for the test suite's reference-vector check only.
export const _pcg = { init: pcgInit, next: pcgNext };

// ---------------------------------------------------------------------------
// The spawn distribution (RULES 3, v1.1)
//
// Tier t is the value 2^t. The curve peaks at a centre that drifts up with the
// board's largest tile and decays linearly either side; every live tier keeps
// the floor weight. All arithmetic is integer (RULES 3 states the formula with
// floor division), so the distribution is bit-identical everywhere.

const SPAWN_PARAM_NAMES = Object.freeze([
  'centreBase', 'centreGain', 'centreStart', 'ceilingMin', 'ceilingSpread',
  'peakWeight', 'slope', 'floorWeight',
]);

function checkSpawnParams(spawn) {
  for (const name of SPAWN_PARAM_NAMES) {
    if (!Number.isInteger(spawn[name])) {
      throw new Error(`spawn parameter ${name} missing or not an integer`);
    }
  }
  return spawn;
}

function boardMaxTier(board) {
  let max = 0;
  for (const col of board) for (const v of col) if (v > max) max = v;
  return max === 0 ? 0 : Math.round(Math.log2(max));
}

// The pure distribution function (RULES 7: the Phase 3 AI's lookahead needs
// the same numbers the UI shows). Returns the exact integer weights and the
// derived probabilities for the NEXT draw from this state's board.
export function spawnDistribution(state) {
  return distributionFor(state.board, state.spawn);
}

export function distributionFor(board, spawn) {
  const p = spawn;
  const M = boardMaxTier(board);
  const centreMilli = p.centreBase + p.centreGain * Math.max(0, M - p.centreStart);
  const ceiling = Math.max(p.ceilingMin, Math.ceil(centreMilli / 1000) + p.ceilingSpread);
  const entries = [];
  let total = 0;
  for (let t = 1; t <= ceiling; t++) {
    const d = Math.abs(1000 * t - centreMilli);
    const w = Math.max(p.peakWeight - Math.floor((p.slope * d) / 1000), p.floorWeight);
    total += w;
    entries.push({ tier: t, value: 2 ** t, weight: w });
  }
  for (const e of entries) e.probability = e.weight / total;
  return { centreMilli, ceiling, total, entries };
}

function drawValue(state) {
  const dist = distributionFor(state.board, state.spawn);
  const k = pcgNext(state.rng) % dist.total;
  let cum = 0;
  for (const e of dist.entries) {
    cum += e.weight;
    if (k < cum) return e.value;
  }
  // Unreachable: k < total and the cumulative sum ends at total.
  return dist.entries[dist.entries.length - 1].value;
}

// ---------------------------------------------------------------------------
// State
//
// board: 5 column arrays, bottom-up; board[c][r] is the value at column c,
// row r (row 0 is the floor of the board). Gravity is always settled between
// moves, so a value's index in its column array IS its row.
//
// Draw timing (RULES 3): the next block's value is drawn at the moment the
// current block enters play, from the board as it then stands. The preview
// (state.nextValue) is exactly the value that will spawn next.

export function newGame(seed, spawn = CONFIG.spawn) {
  const seedBig = BigInt(seed) & MASK64;
  const rng = pcgInit(seedBig, RULES.PCG_SEQ);
  const state = {
    seed: seedBig.toString(),
    rng,
    spawn: checkSpawnParams({ ...spawn }),
    board: Array.from({ length: RULES.COLS }, () => []),
    current: 0, // value of the falling block
    nextValue: 0, // the drawn value of the block after it (the preview)
    score: 0,
    blocksPlaced: 0,
    maxTile: 0,
    mergeCounts: {}, // group size -> count of merges of that size
    longestChain: 0,
    moveCount: 0,
    status: 'playing',
  };
  state.current = drawValue(state);
  state.nextValue = drawValue(state);
  return state;
}

// Construct a state from an arbitrary position (test suites and the later AI's
// search both need hypothetical positions). Overrides are optional; anything
// not given comes from the seeded generator as in newGame.
export function fromPosition({ seed = 1, board, current, nextValue, spawn }) {
  const state = newGame(seed, spawn ?? CONFIG.spawn);
  if (board !== undefined) {
    if (board.length !== RULES.COLS) throw new Error('board must have 5 columns');
    state.board = board.map((col) => col.slice());
    state.maxTile = Math.max(0, ...state.board.flat());
  }
  if (current !== undefined) state.current = current;
  if (nextValue !== undefined) state.nextValue = nextValue;
  return state;
}

export function cloneState(state) {
  return {
    ...state,
    rng: { state: state.rng.state, inc: state.rng.inc },
    spawn: { ...state.spawn },
    board: state.board.map((col) => col.slice()),
    mergeCounts: { ...state.mergeCounts },
  };
}

// The next block's value as drawn (honest preview; RULES 3).
export function previewValue(state) {
  return state.nextValue;
}

// ---------------------------------------------------------------------------
// Merging (RULES 4)

function findGroups(board) {
  const seen = Array.from({ length: RULES.COLS }, (_, c) => board[c].map(() => false));
  const groups = [];
  for (let c = 0; c < RULES.COLS; c++) {
    for (let r = 0; r < board[c].length; r++) {
      if (seen[c][r]) continue;
      const value = board[c][r];
      const cells = [];
      const stack = [[c, r]];
      seen[c][r] = true;
      while (stack.length) {
        const [cc, rr] = stack.pop();
        cells.push({ c: cc, r: rr });
        for (const [nc, nr] of [[cc - 1, rr], [cc + 1, rr], [cc, rr - 1], [cc, rr + 1]]) {
          if (nc < 0 || nc >= RULES.COLS || nr < 0 || nr >= board[nc].length) continue;
          if (seen[nc][nr] || board[nc][nr] !== value) continue;
          seen[nc][nr] = true;
          stack.push([nc, nr]);
        }
      }
      if (cells.length >= 2) groups.push({ value, cells });
    }
  }
  return groups;
}

function lowestLeftmost(cells) {
  return cells.reduce((best, cell) =>
    cell.r < best.r || (cell.r === best.r && cell.c < best.c) ? cell : best);
}

// Merge every group simultaneously, then settle gravity. Returns the pass
// record for the events list. lockedCell is non-null only on the lock pass:
// the group containing it lands there (RULES 4); cascade groups land on their
// lowest cell, leftmost on a tie.
function applyPass(state, groups, chain, lockedCell) {
  const merges = [];
  const remove = Array.from({ length: RULES.COLS }, (_, c) => state.board[c].map(() => false));
  const place = []; // {c, r, value} for merged blocks, at pre-gravity cells
  for (const group of groups) {
    const n = group.cells.length;
    const result = group.value * 2 ** (n - 1);
    const inGroup = lockedCell &&
      group.cells.some((cell) => cell.c === lockedCell.c && cell.r === lockedCell.r);
    const target = inGroup ? lockedCell : lowestLeftmost(group.cells);
    for (const cell of group.cells) remove[cell.c][cell.r] = true;
    place.push({ c: target.c, r: target.r, value: result });
    state.score += result * chain;
    state.maxTile = Math.max(state.maxTile, result);
    state.mergeCounts[n] = (state.mergeCounts[n] || 0) + 1;
    merges.push({ cells: group.cells, size: n, from: group.value, result, target });
  }
  // Rebuild each column: survivors keep their order, merged blocks slot in at
  // their target row, then everything compacts down (gravity).
  const gravity = [];
  for (let c = 0; c < RULES.COLS; c++) {
    const entries = [];
    for (let r = 0; r < state.board[c].length; r++) {
      if (!remove[c][r]) entries.push({ r, value: state.board[c][r], merged: false });
    }
    for (const p of place) {
      if (p.c === c) entries.push({ r: p.r, value: p.value, merged: true });
    }
    entries.sort((a, b) => a.r - b.r);
    state.board[c] = entries.map((e) => e.value);
    entries.forEach((e, newR) => {
      if (e.r !== newR) gravity.push({ from: { c, r: e.r }, to: { c, r: newR }, value: e.value });
    });
  }
  return { chain, merges, gravity };
}

// ---------------------------------------------------------------------------
// The move (RULES 4, 5, 6): lock the falling block in a column, resolve,
// check game over, spawn the next block.

export function play(prev, col) {
  if (prev.status !== 'playing') throw new Error('game is over');
  if (!Number.isInteger(col) || col < 0 || col >= RULES.COLS) {
    throw new Error(`illegal column ${col}`);
  }
  const state = cloneState(prev);
  const value = state.current;
  const lockedRow = state.board[col].length; // may be 6: the overflow lock (RULES 6)
  state.board[col].push(value);
  state.blocksPlaced += 1;
  state.maxTile = Math.max(state.maxTile, value);
  state.moveCount += 1;

  const events = {
    locked: { col, row: lockedRow, value },
    passes: [],
    gameOver: false,
    spawned: null,
  };

  // Resolution: lock pass at chain index 1, each cascade pass one higher; all
  // groups in a pass merge simultaneously and share its index (RULES 4, 5).
  let chain = 0;
  const lockedCell = { c: col, r: lockedRow };
  let groups = findGroups(state.board);
  while (groups.length) {
    chain += 1;
    events.passes.push(applyPass(state, groups, chain, chain === 1 ? lockedCell : null));
    groups = findGroups(state.board);
  }
  state.longestChain = Math.max(state.longestChain, chain);

  // Game over: a column still above legal height after full resolution (RULES 6).
  if (state.board.some((column) => column.length > RULES.ROWS)) {
    state.status = 'over';
    events.gameOver = true;
    return { state, events };
  }

  // Spawn (RULES 3 draw timing): the previewed value enters play, and the
  // block after it is drawn now, from the board as it now stands.
  state.current = state.nextValue;
  state.nextValue = drawValue(state);
  events.spawned = { value: state.current };
  return { state, events };
}

// ---------------------------------------------------------------------------
// Hashing and serialization (replay determinism is a tested property)

// FNV-1a 32-bit over the canonical state string; hex digest.
export function hashState(state) {
  const s = canonical(state);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function canonical(state) {
  return [
    state.seed,
    state.rng.state.toString(),
    state.rng.inc.toString(),
    SPAWN_PARAM_NAMES.map((name) => state.spawn[name]).join(','),
    state.board.map((col) => col.join(',')).join(';'),
    state.current,
    state.nextValue,
    state.score,
    state.blocksPlaced,
    state.moveCount,
    state.status,
  ].join('|');
}

// ---------------------------------------------------------------------------
// Replays. Schema v2 (v1 predates rules v1.1 and does not replay):
//   {version: 2, seed, spawn: {the eight curve parameters},
//    moves: [col, ...],
//    meta: {date, player, result: {score, maxTile, blocksPlaced,
//           mergeCounts, longestChain, finalHash, durationMs?, moveTimestamps?}},
//    reasoning?: [{text, features: {name: score, ...}}, ...]}  -- one entry per
// move; human replays omit reasoning[], the Phase 3 AI fills it. The embedded
// spawn parameters make a replay verify under its own tuning, whatever the
// config says later.

export const REPLAY_VERSION = 2;

export function resultMetrics(state) {
  return {
    score: state.score,
    maxTile: state.maxTile,
    blocksPlaced: state.blocksPlaced,
    mergeCounts: { ...state.mergeCounts },
    longestChain: state.longestChain,
    finalHash: hashState(state),
  };
}

export function makeReplay(seed, moves, meta = {}, spawn = CONFIG.spawn) {
  return {
    version: REPLAY_VERSION,
    seed: String(seed),
    spawn: { ...spawn },
    moves: moves.slice(),
    meta,
  };
}

// Re-run a replay through the engine. onMove, if given, is called with
// (index, move, state, events) after each move.
export function runReplay(replay, onMove) {
  if (replay.version === 1) {
    throw new Error('this is a format v1 replay from rules v1.0; the spawn '
      + 'model changed in v1.1 and v1 replays cannot be replayed correctly');
  }
  if (replay.version !== REPLAY_VERSION) {
    throw new Error(`unsupported replay version ${replay.version}`);
  }
  let state = newGame(replay.seed, replay.spawn ?? CONFIG.spawn);
  replay.moves.forEach((move, i) => {
    const out = play(state, move);
    state = out.state;
    if (onMove) onMove(i, move, state, out.events);
  });
  return state;
}

// Verify a replay against its own recorded result. Returns {ok, state,
// mismatches}; a replay without result metrics verifies structurally only.
export function verifyReplay(replay) {
  const state = runReplay(replay);
  const mismatches = [];
  const recorded = replay.meta && replay.meta.result;
  if (recorded) {
    if (recorded.score !== undefined && recorded.score !== state.score) {
      mismatches.push(`score: recorded ${recorded.score}, replayed ${state.score}`);
    }
    if (recorded.finalHash !== undefined && recorded.finalHash !== hashState(state)) {
      mismatches.push(`finalHash: recorded ${recorded.finalHash}, replayed ${hashState(state)}`);
    }
  }
  return { ok: mismatches.length === 0, state, mismatches };
}
