// random-v1 -- the floor of the ladder: any legal column, uniformly.
//
// Deterministic-random. The exam is a frozen seed set, so every agent must
// reproduce its own games exactly; a real random number generator would break
// that. Instead the dice come from the engine's own canonical state hash, which
// changes every move (it covers the board and the generator's internal state).
// The choose function is therefore genuinely pure: same state in, same column
// out, forever.

import { hashState } from '../engine-link.js';
import { openColumns, lowestColumn } from '../board.js';

// One avalanche round over the 32-bit hash, so the low bits used by the modulo
// do not inherit any structure from the canonical string.
function mix(h) {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

export default {
  name: 'random',
  version: 'v1',
  describe: 'uniform choice among columns with headroom; the floor of the ladder',
  create() {
    return {
      choose({ state }) {
        const open = openColumns(state.board);
        if (open.length === 0) return lowestColumn(state.board);
        const r = mix(parseInt(hashState(state), 16));
        return open[r % open.length];
      },
    };
  },
};
