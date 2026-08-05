// stacker-v1 -- always the same column while it has room, else the shortest.
//
// This agent exists for one reason: to put a number on BUILD.md's observation
// that an unattended game (blocks dropping into one column with no steering)
// reached roughly 5,300 points through self-fed vertical merges. Under
// RULES.md 2 a new block enters where the previous one locked, so an unattended
// v1.1 game IS single-column stacking, and the strict variant below reproduces
// it exactly.
//
// Two variants, because the difference between them turns out to matter a great
// deal and conflating them would be the dishonest way to answer the question:
//
//   stacker-v1 (registered)  the work order's specification: the home column
//                            while it has room, ELSE the shortest column. Once
//                            the home column fills, this agent spills, and
//                            spilling is a real decision no unattended player
//                            makes.
//   strict variant           the home column always, including into overflow.
//                            This is literally what happens when nobody
//                            touches the keyboard, and it is the fair test of
//                            the BUILD.md observation.
//
// Home column defaults to the centre, which is where an unattended game starts
// (RULES.md 2: the first block enters in the centre column). The column is a
// parameter because the honest way to test a "the centre is special" claim is
// to be able to run the other four.

import { lowestColumn, COLS, ROWS } from '../board.js';

export function makeStacker(home) {
  assertColumn(home);
  return {
    name: 'stacker',
    version: 'v1',
    home,
    describe: `always column ${home} while it has room, else the shortest column`,
    create() {
      return {
        choose({ state }) {
          if (state.board[home].length < ROWS) return home;
          return lowestColumn(state.board);
        },
        explain({ state }) {
          const height = state.board[home].length;
          const spilling = height >= ROWS;
          const col = spilling ? lowestColumn(state.board) : home;
          return {
            text: spilling
              ? `Column ${home} is full at ${height} of ${ROWS}, so this ${state.current} spills to the shortest column, ${col}.`
              : `Column ${home}, the home column, at height ${height} of ${ROWS}. This ${state.current} goes on the pile whatever it is.`,
            features: {},
          };
        },
      };
    },
  };
}

// The literal unattended game: never steer, not even off a full column.
export function makeStrictStacker(home) {
  assertColumn(home);
  return {
    name: 'stacker-strict',
    version: 'v1',
    home,
    describe: `column ${home} always, including into overflow; the literal unattended game`,
    create() {
      return {
        choose() { return home; },
        explain({ state }) {
          return {
            text: `Column ${home}, always. Nobody is steering. Height ${state.board[home].length} of ${ROWS}.`,
            features: {},
          };
        },
      };
    },
  };
}

function assertColumn(home) {
  if (!Number.isInteger(home) || home < 0 || home >= COLS) {
    throw new Error(`stacker home column must be 0..${COLS - 1}, got ${home}`);
  }
}

export const CENTRE = Math.floor(COLS / 2);
export default makeStacker(CENTRE);
