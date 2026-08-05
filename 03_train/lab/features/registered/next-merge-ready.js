// Next merge ready: does the board answer the block we can SEE coming.
//
// The preview is honest (RULES.md 3): `ctx.next` IS the next block, not a
// guess. Yet no v0 feature reads it; spawn-pressure prices the distribution
// of the draw after it, and the certain information sits unused. Found by
// the campaign's behaviour probe (2026-08-05): the flat agent never uses the
// preview at all.
//
// From the resulting board, count the in-board landing cells where an
// orthogonal occupied neighbour equals the previewed value, meaning the
// known next block could merge the moment it arrives. Share of columns, 0 to
// 1; a benefit, so it carries a positive weight. This is the cheap, honest
// fraction of depth-2 search: it knows WHAT is coming but not what the
// search would do with it.

import { landingCells, occupiedNeighbours, COLS } from '../../board.js';

export default {
  name: 'next-merge-ready',
  version: 1,
  status: 'active',
  describe: 'landing cells where the previewed block could merge on arrival, as a share of columns',
  score(ctx) {
    const board = ctx.after.board;
    const next = ctx.next;
    let ready = 0;
    for (const cell of landingCells(board)) {
      if (occupiedNeighbours(board, cell.c, cell.r).some((n) => n.value === next)) ready += 1;
    }
    return ready / COLS;
  },
};
