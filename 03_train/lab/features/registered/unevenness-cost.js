// Unevenness cost: the jaggedness of the resulting skyline.
//
// A block enters in the column where the previous one locked (RULES.md 2), and
// horizontal merges need neighbouring cells at the same row, so a jagged
// skyline both costs moves to travel and breaks the sideways adjacency that
// makes triples and quads possible. Sum of absolute step heights between
// neighbouring columns, normalised by the worst case (every step a full
// column).

import { heights, COLS, ROWS } from '../../board.js';

export default {
  name: 'unevenness-cost',
  version: 1,
  status: 'active',
  describe: 'summed step height between neighbouring columns, normalised',
  score(ctx) {
    const h = heights(ctx.after.board);
    let total = 0;
    for (let c = 0; c + 1 < COLS; c++) total += Math.abs(h[c] - h[c + 1]);
    return total / ((COLS - 1) * ROWS);
  },
};
