// Setup adjacency: triples and quads banked and waiting for one more block.
//
// A group of n equal blocks merges into value times 2^(n-1) (RULES.md 4), so a
// quad is worth four times a pair of the same value and a quint sixteen times.
// The way to earn one is to arrange two or three equal blocks around a single
// open landing cell, so that one arriving block of that value closes the group
// at once.
//
// For every landing cell on the resulting board, look at its occupied
// orthogonal neighbours, group them by value, and take the largest group. A
// largest group of g means one arriving block would make a group of g+1, so
// g of 2 banks a triple and g of 3 banks a quad. A g of 1 is only a pair and
// scores nothing here (immediate-merge-value already rewards taking pairs).
// Normalised by the number of columns.

import { landingCells, occupiedNeighbours, COLS } from '../../board.js';

export default {
  name: 'setup-adjacency',
  version: 1,
  status: 'active',
  describe: 'banked triples and quads: equal blocks clustered around an open landing cell',
  score(ctx) {
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
};
