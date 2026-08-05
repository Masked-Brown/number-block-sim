// Column flexibility: how many columns still leave a real choice.
//
// There is no hold and no discard (RULES.md 9), so the only freedom a player
// has is which column to use. A column with one row left is nearly spent: put
// a block there and it is full. Count the columns with at least two free rows
// and express it as a share of the board's five. High is good, so this one
// carries a positive weight.

import { heights, COLS, ROWS } from '../../board.js';

const ROOM = 2; // free rows a column needs before it counts as a real option

export default {
  name: 'column-flexibility',
  version: 1,
  status: 'active',
  describe: 'share of columns with at least two free rows left',
  score(ctx) {
    const h = heights(ctx.after.board);
    let open = 0;
    for (let c = 0; c < COLS; c++) if (h[c] <= ROWS - ROOM) open += 1;
    return open / COLS;
  },
};
