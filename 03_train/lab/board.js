// board.js -- read-only derived views of a board.
//
// These are measurements, never decisions. Nothing here says what a move does,
// what merges, what scores or when a game ends: that is the engine's alone
// (RULES.md 4, 5, 6), and the lab always learns it by calling `play` and
// reading the returned events. What lives here is arithmetic over the board
// array that agents and features need in order to SCORE a position.
//
// Board shape (engine.js): `board[c]` is a column, bottom-up, so `board[c][r]`
// is the value at column c row r and `board[c].length` is that column's height.
// Gravity is always settled between moves, so an index is a row.

import { RULES } from './engine-link.js';

export const COLS = RULES.COLS;
export const ROWS = RULES.ROWS;

export function heights(board) {
  return board.map((col) => col.length);
}

// Columns with headroom under the legal height. NOTE this is a POLICY notion,
// not a legality one: the engine accepts any column 0 to 4, and RULES.md 6
// deliberately allows a block to be sent into a full column (the clutch
// rescue). "Open" here means "does not overflow on its own", which is what a
// baseline wants when it says "any legal column".
export function openColumns(board) {
  const out = [];
  for (let c = 0; c < COLS; c++) if (board[c].length < ROWS) out.push(c);
  return out;
}

// The shortest column, leftmost on a tie. Every baseline's fallback.
export function lowestColumn(board) {
  let best = 0;
  for (let c = 1; c < COLS; c++) if (board[c].length < board[best].length) best = c;
  return best;
}

// The cell a block would occupy if dropped in column c right now. Row may be
// ROWS (an overflow lock); callers that only want in-board cells filter first.
export function landingCell(board, c) {
  return { c, r: board[c].length };
}

// Every in-board landing cell, one per column with headroom.
export function landingCells(board) {
  return openColumns(board).map((c) => landingCell(board, c));
}

// The value at a cell, or undefined if the cell is empty or off the board.
export function valueAt(board, c, r) {
  if (c < 0 || c >= COLS || r < 0) return undefined;
  return board[c][r];
}

// Orthogonal neighbours of a cell as {c, r, value}, occupied ones only
// (RULES.md 4: adjacency is orthogonal, no diagonals).
export function occupiedNeighbours(board, c, r) {
  const out = [];
  for (const [nc, nr] of [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]]) {
    const v = valueAt(board, nc, nr);
    if (v !== undefined) out.push({ c: nc, r: nr, value: v });
  }
  return out;
}

// Tier of a value: tier t is the value 2^t (RULES.md 3). 0 for an empty cell.
export function tierOf(value) {
  return value ? Math.round(Math.log2(value)) : 0;
}

export function maxTileOf(board) {
  let max = 0;
  for (const col of board) for (const v of col) if (v > max) max = v;
  return max;
}

// Every occupied cell, as {c, r, value}.
export function cells(board) {
  const out = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < board[c].length; r++) out.push({ c, r, value: board[c][r] });
  }
  return out;
}

export function totalBlocks(board) {
  let n = 0;
  for (const col of board) n += col.length;
  return n;
}
