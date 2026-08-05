// Tier gap cost: dead adjacency between mismatched neighbours.
//
// Found by inspecting how heuristic agents actually die (campaign job,
// 2026-08-05): the death boards are checkerboards of mismatched tiers, a 2
// beside a 256, an 8 under a 512, with almost no adjacent pair sharing a
// value. Nothing removes a block except a merge (RULES.md 9), merging needs
// EQUAL neighbours (RULES.md 4), and a doubling ladder needs a gap of exactly
// one tier, so any adjacency with a tier gap of two or more is board surface
// that can never help: it is fragmentation, and once the whole board is
// fragmentation, the game is over regardless of height. strand-risk sees only
// low-under-high within a column; this sees the lateral mess too.
//
// Cost per orthogonally adjacent occupied pair: the tier gap beyond one
// (gap 0 is a merge waiting, gap 1 is ladder-adjacent, both fine). Normalised
// by the board's adjacency count so early and late boards compare.

import { tierOf, COLS } from '../../board.js';

// Orthogonal adjacencies in a full 5 x 6 board: 4 x 6 horizontal + 5 x 5
// vertical. The board can exceed this during an overflow lock; the constant
// is a scale, not a bound.
const FULL_ADJACENCIES = 49;

export default {
  name: 'tier-gap-cost',
  version: 1,
  status: 'active',
  describe: 'summed tier gap beyond one across adjacent occupied pairs, normalised',
  score(ctx) {
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
};
