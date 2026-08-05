// weighted.js -- the weighted-sum agent factory.
//
// makeWeightedAgent builds an UNREGISTERED agent from an explicit weight
// vector: the same evaluate-choose-explain shape as heuristic-v0, with the
// weights passed in rather than hardcoded. Breeding evaluates hundreds of
// candidate vectors and a candidate is ephemeral by design; only a named,
// registered version may produce a headline number, and naming one means
// writing a module that pins its weights forever (heuristic-v0 is the
// pattern).
//
// The factory is verified against heuristic-v0 in the lab suite: given v0's
// exact weights and pins it must reproduce v0's games move for move, which
// proves the factory scores the same maths the registered versions do. The
// tie-break is therefore fixed and identical to v0: highest total, then the
// shorter column, then the lower index.

import { openColumns, lowestColumn } from '../board.js';
import { bindWeights, buildContext } from '../features/index.js';

export function makeWeightedAgent({ name = 'candidate', version = 'v0', weights, pins, describe, labels = {} }) {
  return {
    name,
    version,
    describe: describe ?? `weighted sum of ${Object.keys(weights).length} registered features`,
    weights,
    pins,

    create() {
      const bound = bindWeights(weights, pins, { agentLabel: `${name}-${version}` });

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
        ranked.sort((a, b) => (b.total - a.total)
          || (state.board[a.col].length - state.board[b.col].length)
          || (a.col - b.col));
        return ranked;
      }

      return {
        choose({ state }) {
          return evaluate(state)[0].col;
        },

        explain({ state }) {
          const ranked = evaluate(state);
          const best = ranked[0];
          const parts = Object.entries(best.contributions);
          const positives = parts.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
          const negatives = parts.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
          const gain = best.ctx.scoreGain;
          const chain = best.ctx.chainLen;

          const label = (feat) => labels[feat] ?? feat.replaceAll('-', ' ');
          const outcome = gain > 0
            ? `merged for ${gain} over ${chain} pass${chain === 1 ? '' : 'es'}`
            : 'no merge';
          const pull = positives.length ? `chosen for ${label(positives[0][0])}` : 'nothing in its favour';
          const drag = negatives.length ? `, against ${label(negatives[0][0])}` : '';
          const field = ranked.length > 1 ? ` Best of ${ranked.length} columns.` : '';

          return {
            text: `Column ${best.col} with a ${state.current}: ${outcome}. ${pull}${drag}.${field}`,
            features: best.contributions,
          };
        },
      };
    },

    manifest() {
      return {
        features: Object.keys(weights).map((n) => ({ name: n, version: pins[n], weight: weights[n] })),
        weights: { ...weights },
      };
    },
  };
}
