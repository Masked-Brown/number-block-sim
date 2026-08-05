// grader.js -- the browser's move grader: how close was a human game to the
// best honest judgement we have?
//
// WHAT THIS IS. A faithful browser implementation of ONE pinned lab agent,
// `expectimax-d2-v2` (03_train/lab/agents/expectimax-d2-v2.js): heuristic-v2's
// bred weights over eleven features, a depth-2 max-max over the falling block
// and the honest preview, and the LEAK-FREE leaf, meaning a leaf never reads the
// engine's real third block (which the engine has drawn, because it is
// deterministic, and which no player could see). Audit 0019 found the depth-2
// and depth-3 versions doing exactly that through the feature layer; grading a
// human against a peeking judge would mark them down for not knowing the
// unknowable, so the grader uses the fixed version and only the fixed version.
//
// WHY IT IS A SECOND IMPLEMENTATION, and what keeps it honest. The lab lives in
// `03_train/`, which GitHub Pages does not serve, and the whole point of this
// feature is that grading happens in the browser with no network. So the code
// exists twice. Duplicated judgement is exactly the kind of thing this repo
// refuses to leave unguarded, so it is bound down by a standing test: the lab
// suite imports THIS file, plays positions from real games, and fails if this
// grader and `expectimax-d2-v2` disagree about a single column
// (`03_train/lab/test/lab.test.js`, "the browser grader matches the pinned
// champion"). If a feature or a weight is ever re-versioned in the lab, that
// test goes red rather than this file going quietly stale.
//
// The engine is NOT duplicated: like everything else here, this file learns what
// a move does by calling `play` and reading the events it returns.
//
// Two deliberate consequences of grading against this champion, stated so the
// number is not over-read:
//   - The champion only ever considers columns that do not overflow on their own
//     (like every lab agent), so a clutch lock into a full column (RULES.md 6)
//     always grades as a disagreement. It is rare and it is honest: nothing here
//     has ever measured whether a clutch lock is good play.
//   - Agreement is exact-column agreement. A move that is second-best by a hair
//     scores the same as one that is catastrophic. Accuracy is a measure of
//     agreement with one strong judge, not a measure of truth.

import { play, distributionFor, RULES } from './engine.js';

const COLS = RULES.COLS;
const ROWS = RULES.ROWS;

// The agent this grader mirrors. Not a free choice: it names the lab version
// whose numbers the standing test holds this file to.
export const CHAMPION_ID = 'expectimax-d2-v2';

// heuristic-v2's bred weight vector, in ITS key order. The order is load
// bearing: floating-point addition is not associative, so summing the same
// weights in a different order can move a total by an ulp and flip a tie. Copied
// from the immutable lab module (run 2026-08-05_breed-h1-features).
const WEIGHTS = [
  ['immediate-merge-value', 1.6205247526845243],
  ['chain-potential', 1.5925632347250156],
  ['setup-adjacency', 0.20130692737178923],
  ['column-flexibility', 0.7835496418108241],
  ['height-cost', -2.309065683937778],
  ['unevenness-cost', -1.21208090038321],
  ['strand-risk', -4.926508042429592],
  ['spawn-pressure', -4.370925782077923],
  ['tier-gap-cost', -1.698705892238784],
  ['next-merge-ready', 1.123835523100817],
  ['game-over-risk', -1000],
];

// Features that describe a MOVE and are summed along the search path, as against
// positional features, which describe a BOARD and are read at the leaf only.
const MOVE_FEATURES = new Set(['immediate-merge-value', 'game-over-risk']);

// The one feature that reads the preview, and so the one that cannot be scored
// honestly at a leaf without integrating over the live distribution.
const NEXT_DEPENDENT = new Set(['next-merge-ready']);

// ---------------------------------------------------------------------------
// Board measurements. Read-only derived views, never decisions: what a move
// does is the engine's business alone.

function heights(board) {
  const h = new Array(COLS);
  for (let c = 0; c < COLS; c++) h[c] = board[c].length;
  return h;
}

function openColumns(board) {
  const out = [];
  for (let c = 0; c < COLS; c++) if (board[c].length < ROWS) out.push(c);
  return out;
}

function lowestColumn(board) {
  let best = 0;
  for (let c = 1; c < COLS; c++) if (board[c].length < board[best].length) best = c;
  return best;
}

function landingCells(board) {
  return openColumns(board).map((c) => ({ c, r: board[c].length }));
}

function valueAt(board, c, r) {
  if (c < 0 || c >= COLS || r < 0) return undefined;
  return board[c][r];
}

function occupiedNeighbours(board, c, r) {
  const out = [];
  const around = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]];
  for (const [nc, nr] of around) {
    const v = valueAt(board, nc, nr);
    if (v !== undefined) out.push({ c: nc, r: nr, value: v });
  }
  return out;
}

function tierOf(value) {
  return value ? Math.round(Math.log2(value)) : 0;
}

function totalBlocks(board) {
  let n = 0;
  for (const col of board) n += col.length;
  return n;
}

// ---------------------------------------------------------------------------
// The eleven features. Each returns a MAGNITUDE of the thing it measures; the
// weight above carries the sign. Every one mirrors a pinned lab module at
// version 1; the comments there carry the reasoning and are not repeated.

const LADDER_STRIDE = ROWS + 2;

function ladder(board, c, r, memo) {
  const idx = c * LADDER_STRIDE + r;
  if (memo[idx] !== 0) return memo[idx];
  memo[idx] = 1;
  const target = board[c][r] * 2;
  let best = 1;
  if (c > 0 && board[c - 1][r] === target) {
    const len = 1 + ladder(board, c - 1, r, memo);
    if (len > best) best = len;
  }
  if (c + 1 < COLS && board[c + 1][r] === target) {
    const len = 1 + ladder(board, c + 1, r, memo);
    if (len > best) best = len;
  }
  if (r > 0 && board[c][r - 1] === target) {
    const len = 1 + ladder(board, c, r - 1, memo);
    if (len > best) best = len;
  }
  if (r + 1 < board[c].length && board[c][r + 1] === target) {
    const len = 1 + ladder(board, c, r + 1, memo);
    if (len > best) best = len;
  }
  memo[idx] = best;
  return best;
}

const STRAND_WORST = COLS * ((ROWS * (ROWS - 1)) / 2);
const FULL_ADJACENCIES = 49;
const FLEX_ROOM = 2;

const SCORERS = {
  'immediate-merge-value': (ctx) => Math.log2(1 + ctx.scoreGain),

  'game-over-risk': (ctx) => (ctx.gameOver ? 1 : 0),

  'chain-potential': (ctx) => {
    const board = ctx.after.board;
    const memo = new Int8Array(COLS * LADDER_STRIDE);
    let total = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < board[c].length; r++) total += ladder(board, c, r, memo) - 1;
    }
    return total / (COLS * ROWS);
  },

  'setup-adjacency': (ctx) => {
    const board = ctx.after.board;
    let total = 0;
    for (const cell of landingCells(board)) {
      const byValue = new Map();
      for (const n of occupiedNeighbours(board, cell.c, cell.r)) {
        byValue.set(n.value, (byValue.get(n.value) ?? 0) + 1);
      }
      let best = 0;
      for (const count of byValue.values()) if (count > best) best = count;
      if (best >= 2) total += best;
    }
    return total / COLS;
  },

  'column-flexibility': (ctx) => {
    const h = heights(ctx.after.board);
    let open = 0;
    for (let c = 0; c < COLS; c++) if (h[c] <= ROWS - FLEX_ROOM) open += 1;
    return open / COLS;
  },

  'height-cost': (ctx) => totalBlocks(ctx.after.board) / (COLS * ROWS),

  'unevenness-cost': (ctx) => {
    const h = heights(ctx.after.board);
    let total = 0;
    for (let c = 0; c + 1 < COLS; c++) total += Math.abs(h[c] - h[c + 1]);
    return total / ((COLS - 1) * ROWS);
  },

  'strand-risk': (ctx) => {
    const board = ctx.after.board;
    let total = 0;
    for (let c = 0; c < COLS; c++) {
      const column = board[c];
      for (let r = 0; r < column.length; r++) {
        const above = column.length - 1 - r;
        if (above === 0) continue;
        let maxAbove = 0;
        for (let rr = r + 1; rr < column.length; rr++) {
          if (column[rr] > maxAbove) maxAbove = column[rr];
        }
        if (maxAbove > column[r]) total += above;
      }
    }
    return total / STRAND_WORST;
  },

  'spawn-pressure': (ctx) => {
    const board = ctx.after.board;
    const met = new Set();
    for (const cell of landingCells(board)) {
      for (const n of occupiedNeighbours(board, cell.c, cell.r)) met.add(n.value);
    }
    let unmet = 0;
    for (const entry of ctx.spawnNext.entries) {
      if (!met.has(entry.value)) unmet += entry.probability;
    }
    return unmet;
  },

  'tier-gap-cost': (ctx) => {
    const board = ctx.after.board;
    let total = 0;
    for (let c = 0; c < COLS; c++) {
      const col = board[c];
      for (let r = 0; r < col.length; r++) {
        const t = tierOf(col[r]);
        if (r + 1 < col.length) {
          const gap = Math.abs(t - tierOf(col[r + 1]));
          if (gap > 1) total += gap - 1;
        }
        if (c + 1 < COLS && r < board[c + 1].length) {
          const gap = Math.abs(t - tierOf(board[c + 1][r]));
          if (gap > 1) total += gap - 1;
        }
      }
    }
    return total / FULL_ADJACENCIES;
  },

  'next-merge-ready': (ctx) => {
    const board = ctx.after.board;
    const next = ctx.next;
    let ready = 0;
    for (const cell of landingCells(board)) {
      if (occupiedNeighbours(board, cell.c, cell.r).some((n) => n.value === next)) ready += 1;
    }
    return ready / COLS;
  },
};

// The three bound lists, built once, each in the weight vector's own order.
const MOVE_BOUND = WEIGHTS
  .filter(([name]) => MOVE_FEATURES.has(name))
  .map(([name, weight]) => ({ name, weight, score: SCORERS[name] }));
const LEAF_PLAIN = WEIGHTS
  .filter(([name]) => !MOVE_FEATURES.has(name) && !NEXT_DEPENDENT.has(name))
  .map(([name, weight]) => ({ name, weight, score: SCORERS[name] }));
const LEAF_NEXT = WEIGHTS
  .filter(([name]) => !MOVE_FEATURES.has(name) && NEXT_DEPENDENT.has(name))
  .map(([name, weight]) => ({ name, weight, score: SCORERS[name] }));

for (const [name] of WEIGHTS) {
  if (typeof SCORERS[name] !== 'function') throw new Error(`grader: no scorer for ${name}`);
}

// ---------------------------------------------------------------------------
// The search

// One candidate placement, measured by asking the engine what it does.
function buildContext(state, col) {
  const { state: after, events } = play(state, col);
  let nextDist = null;
  return {
    col,
    before: state,
    after,
    events,
    gameOver: events.gameOver === true,
    current: state.current,
    next: state.nextValue,
    get spawnNext() {
      if (nextDist === null) nextDist = distributionFor(after.board, after.spawn);
      return nextDist;
    },
    scoreGain: after.score - state.score,
    chainLen: events.passes.length,
  };
}

function candidatesOf(state) {
  const open = openColumns(state.board);
  return open.length > 0 ? open : [lowestColumn(state.board)];
}

function moveValue(ctx) {
  let total = 0;
  for (const f of MOVE_BOUND) total += f.weight * f.score(ctx);
  return total;
}

// The leak-free leaf. `leafDist` is the distribution the block AFTER this leaf's
// block will be drawn from: the draw happens when that block enters play, from
// the board as it then stands, which is the board this leaf was built from. Every
// candidate column at a leaf shares it, so the caller computes it once.
function leafPositionalValue(ctx, leafDist) {
  let total = 0;
  for (const f of LEAF_PLAIN) total += f.weight * f.score(ctx);
  const realNext = ctx.next;
  for (const entry of leafDist.entries) {
    if (entry.probability === 0) continue;
    ctx.next = entry.value;
    for (const f of LEAF_NEXT) total += entry.probability * f.weight * f.score(ctx);
  }
  ctx.next = realNext;
  return total;
}

// Rank every candidate column from this state, best first. Tie-break, exactly the
// lab agent's: higher total, then the shorter column, then the leftmost.
export function rank(state) {
  const ranked = [];
  for (const col of candidatesOf(state)) {
    const ctx = buildContext(state, col);
    let total = moveValue(ctx);
    if (!ctx.gameOver) {
      const leafDist = ctx.spawnNext;
      let bestSecond = -Infinity;
      for (const col2 of candidatesOf(ctx.after)) {
        const ctx2 = buildContext(ctx.after, col2);
        let v2 = moveValue(ctx2);
        if (!ctx2.gameOver) v2 += leafPositionalValue(ctx2, leafDist);
        if (v2 > bestSecond) bestSecond = v2;
      }
      total += bestSecond;
    }
    ranked.push({ col, total });
  }
  ranked.sort((a, b) => (b.total - a.total)
    || (state.board[a.col].length - state.board[b.col].length)
    || (a.col - b.col));
  return ranked;
}

// The champion's column from this position. Pure: same state, same answer.
export function choose(state) {
  return rank(state)[0].col;
}

// The columns the champion will even consider: the ones that do not overflow on
// their own, or the shortest column when every column is full. Exposed so the
// grader's blind spot can be reported rather than absorbed: a clutch lock into a
// full column (RULES.md 6) is a move this judge has no opinion about.
export function candidates(state) {
  return candidatesOf(state);
}
