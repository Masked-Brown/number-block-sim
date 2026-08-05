// Height cost: how full the board is after this placement.
//
// Nothing removes a block except a merge (RULES.md 9), so every block placed
// without merging is permanent debt against a 5 by 6 board. Aggregate height
// normalised by capacity, which is the fill ratio. Can exceed 1 on a move that
// overflows a column; that is honest, and game-over-risk carries the real
// penalty for it.

import { totalBlocks, COLS, ROWS } from '../../board.js';

export default {
  name: 'height-cost',
  version: 1,
  status: 'active',
  describe: 'fill ratio of the resulting board: blocks placed over board capacity',
  score(ctx) {
    return totalBlocks(ctx.after.board) / (COLS * ROWS);
  },
};
