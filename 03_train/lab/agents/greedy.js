// greedy-v1 -- take any immediate merge, else the lowest column.
//
// The simplest agent that is not blind: it asks the engine what each column
// would do and takes the first one that merges anything at all, with no regard
// for what the board looks like afterwards. It exists to separate "sees a
// merge" from "plans a board": whatever the heuristic beats greedy by is the
// value of planning, and whatever greedy beats random by is the value of
// merely looking.
//
// Ties: leftmost merging column. "Any immediate merge" is the specification,
// so it does not rank merges by size; a version that did would be greedy-v2.

import { play } from '../engine-link.js';
import { openColumns, lowestColumn } from '../board.js';

export default {
  name: 'greedy',
  version: 'v1',
  describe: 'first column that merges anything, else the shortest column',
  create() {
    return {
      choose({ state }) {
        const open = openColumns(state.board);
        if (open.length === 0) return lowestColumn(state.board);
        for (const col of open) {
          const { events } = play(state, col);
          if (events.passes.length > 0) return col;
        }
        return lowestColumn(state.board);
      },
    };
  },
};
