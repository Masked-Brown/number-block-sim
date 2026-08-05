// Chain potential: how much cascade the resulting board has loaded.
//
// A cascade happens when a merge result lands beside a block of its own new
// value (RULES.md 4: merge, settle, re-check). So the structure worth having
// is a DOUBLING LADDER: a cell of value v touching a cell of 2v touching a
// cell of 4v. Merge into the bottom of that ladder and the whole thing goes,
// each pass at a higher chain index and so worth more (RULES.md 5).
//
// Measured as the total ladder surplus on the board: for every occupied cell,
// the length of the longest ascending doubling path starting there, minus one
// (a lone cell scores nothing). Values strictly double along a path, so the
// walk cannot cycle and the memoised search terminates. Normalised by board
// capacity so the number stays comparable between an early and a late board.
//
// Written against a flat typed-array memo rather than a Map of string keys.
// This feature is evaluated five times a move and was the harness's single
// largest cost when it allocated; the maths is unchanged.

import { COLS, ROWS } from '../../board.js';

// A column can hold ROWS+1 blocks for the length of an overflow lock
// (RULES.md 6), so the memo is sized for the tallest board the engine can
// hand us rather than for the legal height.
const STRIDE = ROWS + 2;

function ladder(board, c, r, memo) {
  const idx = c * STRIDE + r;
  if (memo[idx] !== 0) return memo[idx];
  memo[idx] = 1; // guard; a strictly doubling path can never return here
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

export default {
  name: 'chain-potential',
  version: 1,
  status: 'active',
  describe: 'doubling ladders loaded on the resulting board, normalised by capacity',
  score(ctx) {
    const board = ctx.after.board;
    const memo = new Int8Array(COLS * STRIDE);
    let total = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < board[c].length; r++) total += ladder(board, c, r, memo) - 1;
    }
    return total / (COLS * ROWS);
  },
};
