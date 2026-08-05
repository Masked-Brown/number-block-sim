// engine.js -- the pure game engine for number-block-sim.
//
// Implements 01_rules/output/RULES.md v1.0 exactly. Pure logic module: no DOM,
// no timers, no rendering, no Math.random. Board state in, move in, new state
// and events out. Runs unchanged in the browser and in Node (the 03_train sim
// harness imports this same file).
//
// The constants below are RULES (sections 1 to 6), locked at v1.0; changing one
// is a rule change and is AB's decision, never tuning. Tuning constants
// (RULES.md section 8) live in config.js and never here.

export const RULES = Object.freeze({
  COLS: 5, // board width (RULES 1)
  ROWS: 7, // legal column height; a lock above this is an overflow (RULES 1, 6)
  WINDOW_SIZE: 4, // spawn window: 4 consecutive tiers (RULES 3)
  FLOOR_START: 2, // the window starts at floor 2: {2,4,8,16} (RULES 3)
  RISE_RATIO: 128, // floor doubles while max tile >= 128 x floor (RULES 3)
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
// State
//
// board: 5 column arrays, bottom-up; board[c][r] is the value at column c,
// row r (row 0 is the floor of the board). Gravity is always settled between
// moves, so a value's index in its column array IS its row.
//
// Spawning: one uniform tier-offset draw (0..3) per block, in fixed order, one
// draw per block. The offset binds to a value at the block's own spawn time
// (value = floor * 2^offset with the floor as it stands then), so a floor rise
// during the previous resolution shifts the previewed value with it and a
// retired tier can never spawn (RULES 3, "no new blocks of their tier will
// spawn"). The preview is always honest: it shows floor * 2^nextOffset.

function drawOffset(rng) {
  // 2^32 is divisible by WINDOW_SIZE, so the modulo is exactly uniform.
  return pcgNext(rng) % RULES.WINDOW_SIZE;
}

export function newGame(seed) {
  const seedBig = BigInt(seed) & MASK64;
  const rng = pcgInit(seedBig, RULES.PCG_SEQ);
  const state = {
    seed: seedBig.toString(),
    rng,
    floor: RULES.FLOOR_START,
    board: Array.from({ length: RULES.COLS }, () => []),
    current: 0, // value of the falling block
    nextOffset: 0, // tier offset drawn for the block after it
    score: 0,
    blocksPlaced: 0,
    maxTile: 0,
    mergeCounts: {}, // group size -> count of merges of that size
    longestChain: 0,
    moveCount: 0,
    status: 'playing',
  };
  state.current = state.floor * 2 ** drawOffset(rng);
  state.nextOffset = drawOffset(rng);
  return state;
}

// Construct a state from an arbitrary position (test suites and the later AI's
// search both need hypothetical positions). Overrides are optional; anything
// not given comes from the seeded generator as in newGame.
export function fromPosition({ seed = 1, board, floor, current, nextOffset }) {
  const state = newGame(seed);
  if (floor !== undefined) state.floor = floor;
  if (board !== undefined) {
    if (board.length !== RULES.COLS) throw new Error('board must have 5 columns');
    state.board = board.map((col) => col.slice());
    state.maxTile = Math.max(0, ...state.board.flat());
  }
  if (current !== undefined) state.current = current;
  if (nextOffset !== undefined) state.nextOffset = nextOffset;
  return state;
}

export function cloneState(state) {
  return {
    ...state,
    rng: { state: state.rng.state, inc: state.rng.inc },
    board: state.board.map((col) => col.slice()),
    mergeCounts: { ...state.mergeCounts },
  };
}

// The current spawn window, lowest tier first (RULES 3).
export function spawnWindow(state) {
  return Array.from({ length: RULES.WINDOW_SIZE }, (_, i) => state.floor * 2 ** i);
}

// The next block's value as it stands now (honest preview; rebinds on rise).
export function previewValue(state) {
  return state.floor * 2 ** state.nextOffset;
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
// rise the floor, check game over, spawn the next block.

export function play(prev, col) {
  if (prev.status !== 'playing') throw new Error('game is over');
  if (!Number.isInteger(col) || col < 0 || col >= RULES.COLS) {
    throw new Error(`illegal column ${col}`);
  }
  const state = cloneState(prev);
  const value = state.current;
  const lockedRow = state.board[col].length; // may be 7: the overflow lock (RULES 6)
  state.board[col].push(value);
  state.blocksPlaced += 1;
  state.maxTile = Math.max(state.maxTile, value);
  state.moveCount += 1;

  const events = {
    locked: { col, row: lockedRow, value },
    passes: [],
    floorRose: null,
    gameOver: false,
    spawned: null,
  };

  // Resolution: lock pass at chain index 1, each cascade pass one higher; all
  // groups in a pass merge simultaneously and share its index (RULES 4, 5).
  let chain = 0;
  let lockedCell = { c: col, r: lockedRow };
  let groups = findGroups(state.board);
  while (groups.length) {
    chain += 1;
    events.passes.push(applyPass(state, groups, chain, chain === 1 ? lockedCell : null));
    groups = findGroups(state.board);
  }
  state.longestChain = Math.max(state.longestChain, chain);

  // Floor rise, after full resolution, no purge (RULES 3).
  const boardMax = Math.max(0, ...state.board.flat());
  const floorBefore = state.floor;
  while (boardMax >= RULES.RISE_RATIO * state.floor) state.floor *= 2;
  if (state.floor !== floorBefore) events.floorRose = { from: floorBefore, to: state.floor };

  // Game over: a column still above legal height after full resolution (RULES 6).
  if (state.board.some((column) => column.length > RULES.ROWS)) {
    state.status = 'over';
    events.gameOver = true;
    return { state, events };
  }

  // Spawn: the queued offset binds to a value now, under the current floor.
  state.current = state.floor * 2 ** state.nextOffset;
  state.nextOffset = drawOffset(state.rng);
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
    state.floor,
    state.board.map((col) => col.join(',')).join(';'),
    state.current,
    state.nextOffset,
    state.score,
    state.blocksPlaced,
    state.moveCount,
    state.status,
  ].join('|');
}

// ---------------------------------------------------------------------------
// Replays. Schema v1, versioned from day one:
//   {version: 1, seed, moves: [col, ...],
//    meta: {date, player, result: {score, maxTile, blocksPlaced,
//           mergeCounts, longestChain, finalHash, durationMs?, moveTimestamps?}},
//    reasoning?: [{text, features: {name: score, ...}}, ...]}  -- one entry per
// move; human replays omit reasoning[], the Phase 3 AI fills it.

export const REPLAY_VERSION = 1;

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

export function makeReplay(seed, moves, meta = {}) {
  return { version: REPLAY_VERSION, seed: String(seed), moves: moves.slice(), meta };
}

// Re-run a replay through the engine. onMove, if given, is called with
// (index, move, state, events) after each move.
export function runReplay(replay, onMove) {
  if (replay.version !== REPLAY_VERSION) {
    throw new Error(`unsupported replay version ${replay.version}`);
  }
  let state = newGame(replay.seed);
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
