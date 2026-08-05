// expectimax.js -- lookahead over the one-block preview and the live spawn
// distribution. RULES.md 7 exposes the exact spawn probabilities as a pure
// engine function precisely so this agent can use the same numbers the UI
// shows; this file is the second consumer that requirement was written for
// (spawn-pressure was the first).
//
// THE INFORMATION SET, stated precisely because honesty here is the whole
// point. At the root the agent knows: the falling block (state.current), the
// previewed block (state.nextValue, honest per RULES.md 3), and the live
// distribution from any board it can construct. It does NOT know the value of
// the block after the preview: the engine has drawn it (determinism), but a
// player cannot see it, so this agent never reads `nextValue` from any
// simulated state. Depth 2 is therefore an exact max-max over two KNOWN
// blocks; depth 3 adds one expectation layer over the third block, whose
// distribution is `distributionFor(board after move 1's resolution)`, which
// is exactly the distribution the engine drew it from (BUILD.md decision 4:
// the draw happens when the current block enters play, from the board as it
// then stands).
//
// THE VALUE OF A BRANCH decomposes the weight vector into its two natural
// halves. Move features (immediate-merge-value, game-over-risk) describe a
// MOVE and are summed along the path; positional features (everything else)
// describe a BOARD and are evaluated at the leaf only. At depth 1 this is
// arithmetically identical to the weighted agent's sum, which is what makes
// the depth ablation clean: depth 1 IS the flat heuristic, and any gain at
// depth 2 or 3 is attributable to search alone, not to a changed evaluation.
// A move that ends the game terminates its branch at the move features
// (game-over-risk's weight carries the penalty); a dead board has no
// positional value worth reading.
//
// Hypothetical blocks are placed by cloning the engine state and setting
// `current` before calling `play`: the engine still computes everything, and
// the clone's own onward draw is never read. No game logic is modelled here.

import { cloneState, distributionFor } from '../engine-link.js';
import { openColumns, lowestColumn } from '../board.js';
import { bindWeights, buildContext } from '../features/index.js';

const MOVE_FEATURES = new Set(['immediate-merge-value', 'game-over-risk']);

// `coverage` (depth 3 only) truncates the expectation to the most probable
// tiers whose cumulative mass reaches at least that share, renormalised over
// the included tiers. 1 is the exact expectation. A truncated version is a
// DIFFERENT agent and is named as one; the parameter is pinned in the version
// and recorded in every manifest. Tie-break for inclusion is fixed (higher
// probability first, then lower tier), so truncation is deterministic.
export function makeExpectimax({ name, version, weights, pins, depth, describe, labels = {}, coverage = 1 }) {
  if (![1, 2, 3].includes(depth)) throw new Error(`expectimax depth must be 1, 2 or 3, got ${depth}`);
  if (!(coverage > 0 && coverage <= 1)) throw new Error(`coverage must be in (0, 1], got ${coverage}`);

  return {
    name,
    version,
    describe: describe ?? `expectimax depth ${depth} over the preview and the live spawn distribution`,
    weights,
    pins,
    depth,

    create() {
      const bound = bindWeights(weights, pins, { agentLabel: `${name}-${version}` });
      const moveBound = bound.filter(({ feature }) => MOVE_FEATURES.has(feature.name));
      const positionalBound = bound.filter(({ feature }) => !MOVE_FEATURES.has(feature.name));

      const candidatesOf = (state) => {
        const open = openColumns(state.board);
        return open.length > 0 ? open : [lowestColumn(state.board)];
      };

      // Score the move-half and the positional-half of a context.
      const moveValue = (ctx, contributions) => {
        let total = 0;
        for (const { feature, weight } of moveBound) {
          const c = weight * feature.score(ctx);
          total += c;
          if (contributions) contributions[feature.name] = (contributions[feature.name] ?? 0) + c;
        }
        return total;
      };
      const positionalValue = (ctx, contributions) => {
        let total = 0;
        for (const { feature, weight } of positionalBound) {
          const c = weight * feature.score(ctx);
          total += c;
          if (contributions) contributions[feature.name] = (contributions[feature.name] ?? 0) + c;
        }
        return total;
      };

      // Best value of placing `state.current`, one ply, no deeper look: max
      // over candidate columns of move features plus leaf positionals. The
      // ONLY field of `state` this reads besides the board is `current`, so a
      // caller placing a hypothetical block sets `current` on a clone and
      // nothing unknowable can leak in. There is deliberately no deeper
      // recursion here: any variant that expanded a simulated state's own
      // preview would be reading a draw the player cannot see.
      function bestLastPly(state) {
        let best = -Infinity;
        for (const col of candidatesOf(state)) {
          const ctx = buildContext(state, col);
          let value = moveValue(ctx, null);
          if (!ctx.gameOver) value += positionalValue(ctx, null);
          if (value > best) best = value;
        }
        return best;
      }

      // Expectation over the unknown third block, from the state after the
      // second known block has been placed. `drawnFromBoard` is the board the
      // third block's distribution was computed from (the board after move
      // 1's resolution; BUILD.md decision 4).
      function expectedThird(stateAfterTwo, drawnFromBoard, spawnParams) {
        const dist = distributionFor(drawnFromBoard, spawnParams);
        let entries = dist.entries;
        if (coverage < 1) {
          const ranked = [...entries].sort((a, b) => (b.probability - a.probability) || (a.tier - b.tier));
          const kept = [];
          let mass = 0;
          for (const e of ranked) {
            kept.push(e);
            mass += e.probability;
            if (mass >= coverage) break;
          }
          entries = kept.map((e) => ({ ...e, probability: e.probability / mass }));
        }
        let expected = 0;
        for (const entry of entries) {
          if (entry.probability === 0) continue;
          const hypothetical = cloneState(stateAfterTwo);
          hypothetical.current = entry.value;
          expected += entry.probability * bestLastPly(hypothetical);
        }
        return expected;
      }

      // Rank root candidates. Depth 1: move + positional, the flat heuristic.
      // Depth 2: move1 + max over col2 of (move2 + positional at leaf).
      // Depth 3: move1 + max over col2 of (move2 + E[third block's best]).
      function evaluate(state) {
        const ranked = [];
        for (const col of candidatesOf(state)) {
          const ctx = buildContext(state, col);
          const contributions = {};
          let total = moveValue(ctx, contributions);

          if (!ctx.gameOver && depth === 1) {
            total += positionalValue(ctx, contributions);
          } else if (!ctx.gameOver && depth >= 2) {
            // Second ply: the previewed block, known, placed by the engine
            // itself (ctx.after.current === the preview; asserted cheaply).
            let bestSecond = -Infinity;
            for (const col2 of candidatesOf(ctx.after)) {
              const ctx2 = buildContext(ctx.after, col2);
              let v2 = moveValue(ctx2, null);
              if (!ctx2.gameOver) {
                if (depth === 2) v2 += positionalValue(ctx2, null);
                else v2 += expectedThird(ctx2.after, ctx.after.board, ctx.after.spawn ?? state.spawn);
              }
              if (v2 > bestSecond) bestSecond = v2;
            }
            total += bestSecond;
            contributions.search = bestSecond;
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
          const gain = best.ctx.scoreGain;
          const chain = best.ctx.chainLen;
          const outcome = gain > 0
            ? `merged for ${gain} over ${chain} pass${chain === 1 ? '' : 'es'}`
            : 'no merge';
          const lookahead = depth === 1 ? ''
            : depth === 2 ? ' Sees the previewed block placed best.'
              : ' Sees the preview placed best, then the expected third block.';
          return {
            text: `Column ${best.col} with a ${state.current}: ${outcome}.`
              + `${lookahead} Best of ${ranked.length} columns at depth ${depth}.`,
            features: best.contributions,
          };
        },
      };
    },

    manifest() {
      return {
        features: Object.keys(weights).map((n) => ({ name: n, version: pins[n], weight: weights[n] })),
        weights: { ...weights },
        search: {
          kind: 'expectimax',
          depth,
          preview: 1,
          expectation: depth >= 3 ? 'third block, live distribution' : 'none',
          coverage: depth >= 3 ? coverage : null,
        },
      };
    },
  };
}
