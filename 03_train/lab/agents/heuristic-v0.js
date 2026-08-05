// heuristic-v0 -- a weight vector over registered features.
//
// The agent itself is almost nothing: for each candidate column it asks the
// engine what happens, hands the result to every registered feature it is
// pinned to, and takes the weighted sum. All the game knowledge lives in the
// feature modules, and all the judgement lives in the weight vector below.
// That split is the point: 03b tunes numbers and adds features without
// touching an agent, and every agent version means exactly one thing forever.
//
// v0 weights are HAND-SET, not learned. They are a starting position and a
// baseline to beat, not a claim about optimal play.

import { openColumns, lowestColumn } from '../board.js';
import { bindWeights, buildContext } from '../features/index.js';

// Feature versions this agent version was built against. If a feature is
// re-versioned or retired, construction fails loudly rather than silently
// scoring different maths under the name "heuristic-v0" (registry.js).
const PINS = Object.freeze({
  'immediate-merge-value': 1,
  'chain-potential': 1,
  'setup-adjacency': 1,
  'column-flexibility': 1,
  'height-cost': 1,
  'unevenness-cost': 1,
  'strand-risk': 1,
  'spawn-pressure': 1,
  'game-over-risk': 1,
});

// One line of reasoning per weight. Costs are positive magnitudes, so the sign
// here is the whole of the agent's opinion.
const WEIGHTS = Object.freeze({
  // Merging is the only thing that scores at all (RULES.md 5), and the feature
  // is log-scaled, so a full point of weight still cannot let one lucky
  // cascade outvote the whole board.
  'immediate-merge-value': 1.0,
  // Chain index is the multiplier (RULES.md 5), so a loaded ladder is worth
  // more than the pair in front of you; rated just above taking the merge.
  'chain-potential': 1.2,
  // A banked quad is four times the pair of the same value, so structure is
  // worth real weight, but less than the ladder that pays the multiplier.
  'setup-adjacency': 0.8,
  // No hold, no swap, no discard (RULES.md 9): choosing the column is the only
  // freedom there is, so keeping columns open is worth paying for.
  'column-flexibility': 0.6,
  // Nothing removes a block except a merge, so height is permanent debt
  // against 30 cells; the single largest ordinary cost.
  'height-cost': -2.0,
  // A jagged skyline breaks the sideways adjacency that triples and quads are
  // made of, but it is recoverable, so it is priced below height.
  'unevenness-cost': -0.8,
  // A low tile sealed under higher ones can only ever be freed sideways, and
  // in a 5 by 6 board that is dead weight for the rest of the game.
  'strand-risk': -1.0,
  // The distribution is live and knowable (RULES.md 3, 7), so a board that
  // cannot meet most of what is coming is being punished for a choice, not
  // for luck; priced just under height.
  'spawn-pressure': -1.5,
  // Ending the game is worse than every other consideration combined, but it
  // stays a weight rather than a hard filter so a forced loss is still a legal
  // choice when every column ends the game.
  'game-over-risk': -1000,
});

const LABELS = {
  'immediate-merge-value': 'the merge it scores now',
  'chain-potential': 'the cascade it loads',
  'setup-adjacency': 'the triple or quad it banks',
  'column-flexibility': 'the columns it keeps open',
  'height-cost': 'the height it adds',
  'unevenness-cost': 'the skyline it roughens',
  'strand-risk': 'the low tiles it buries',
  'spawn-pressure': 'what it cannot answer next',
  'game-over-risk': 'that it ends the game',
};

export default {
  name: 'heuristic',
  version: 'v0',
  describe: 'weighted sum of nine registered features over every candidate column',
  weights: WEIGHTS,
  pins: PINS,

  create() {
    const bound = bindWeights(WEIGHTS, PINS, { agentLabel: 'heuristic-v0' });

    // Score every candidate column. Returns the ranked list; both choose and
    // explain read it, so the reasoning attached to a replay is by construction
    // the reasoning the agent actually used.
    function evaluate(state) {
      const open = openColumns(state.board);
      const candidates = open.length > 0 ? open : [lowestColumn(state.board)];
      const ranked = [];
      for (const col of candidates) {
        const ctx = buildContext(state, col);
        const contributions = {};
        let total = 0;
        for (const { feature, weight } of bound) {
          const raw = feature.score(ctx);
          const contribution = weight * raw;
          contributions[feature.name] = contribution;
          total += contribution;
        }
        ranked.push({ col, total, contributions, ctx });
      }
      // Highest total wins. On an exact tie prefer the shorter column, then the
      // lower index, so the agent is fully deterministic.
      ranked.sort((a, b) => (b.total - a.total)
        || (state.board[a.col].length - state.board[b.col].length)
        || (a.col - b.col));
      return ranked;
    }

    return {
      choose({ state }) {
        return evaluate(state)[0].col;
      },

      // Optional enrichment, used only when a run is recording a replay.
      explain({ state }) {
        const ranked = evaluate(state);
        const best = ranked[0];
        const parts = Object.entries(best.contributions);
        const positives = parts.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        const negatives = parts.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
        const gain = best.ctx.scoreGain;
        const chain = best.ctx.chainLen;

        const outcome = gain > 0
          ? `merged for ${gain} over ${chain} pass${chain === 1 ? '' : 'es'}`
          : 'no merge';
        const pull = positives.length ? `chosen for ${LABELS[positives[0][0]]}` : 'nothing in its favour';
        const drag = negatives.length ? `, against ${LABELS[negatives[0][0]]}` : '';
        const field = ranked.length > 1 ? ` Best of ${ranked.length} columns.` : '';

        return {
          text: `Column ${best.col} with a ${state.current}: ${outcome}. ${pull}${drag}.${field}`,
          features: best.contributions,
        };
      },
    };
  },

  // What the manifest records: the exact feature list and weights this agent
  // version is, so a result can never be read against the wrong maths.
  manifest() {
    return {
      features: Object.keys(WEIGHTS).map((name) => ({
        name,
        version: PINS[name],
        weight: WEIGHTS[name],
      })),
      weights: { ...WEIGHTS },
    };
  },
};
