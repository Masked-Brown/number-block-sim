// Strand risk: low blocks buried under high ones, weighted by how deep.
//
// Gravity only ever settles blocks down and nothing removes a block except a
// merge (RULES.md 4, 9), so a small tile with larger tiles stacked on top can
// only ever be freed sideways. The deeper it is buried, the fewer the ways
// out, and a stranded low tile is dead weight in a 5 by 6 board for the rest
// of the game.
//
// Cost per cell: the number of blocks above it in its column, counted only
// when at least one of those blocks is strictly larger than it (a same-or-
// smaller stack above is not a burial, it is a merge waiting to happen).
// Normalised by the worst case, every column fully buried.

import { cells, COLS, ROWS } from '../../board.js';

const WORST = COLS * ((ROWS * (ROWS - 1)) / 2);

export default {
  name: 'strand-risk',
  version: 1,
  status: 'active',
  describe: 'depth-weighted count of low blocks buried under higher ones',
  score(ctx) {
    const board = ctx.after.board;
    let total = 0;
    for (const cell of cells(board)) {
      const column = board[cell.c];
      const above = column.length - 1 - cell.r;
      if (above === 0) continue;
      let maxAbove = 0;
      for (let r = cell.r + 1; r < column.length; r++) {
        if (column[r] > maxAbove) maxAbove = column[r];
      }
      if (maxAbove > cell.value) total += above;
    }
    return total / WORST;
  },
};
