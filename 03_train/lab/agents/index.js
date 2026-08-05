// index.js -- the agent registry.
//
// THE AGENT INTERFACE, one shape for every player in the experiment:
//
//   agent.create({ seed }) -> instance
//   instance.choose(view)  -> column          REQUIRED, and pure
//   instance.explain(view) -> {text, features} OPTIONAL, for enriched replays
//
//   view = { state, current, next, spawn }
//     state    the engine state (read only; the engine's play is pure and the
//              agent must never mutate what it is handed)
//     current  the falling block's value
//     next     the previewed value that follows it (RULES.md 3)
//     spawn    the live spawn distribution from this board, the exact numbers
//              the UI shows (RULES.md 7)
//
// `choose` is a pure function: the same view always returns the same column,
// with no hidden state and no real randomness anywhere. That is what makes a
// frozen seed set an exam rather than a lottery, and it is why the random
// baseline takes its dice from the engine's own state hash.
//
// `create` exists so an agent can do its one-off work once (heuristic-v0 binds
// its weight vector to feature modules there, and fails loudly if the registry
// has moved under it). It never introduces per-move state.
//
// An agent's IDENTITY is name plus version, and the id below is that pair.
// Versions are immutable: results are recorded against an id, so an id must
// mean exactly one thing forever. A changed weight, a changed feature list or
// a changed tie-break is a new version, never an edit to an old one.

import random from './random.js';
import greedy from './greedy.js';
import stacker, { makeStacker, makeStrictStacker, CENTRE } from './stacker.js';
import heuristicV0 from './heuristic-v0.js';
import heuristicV1 from './heuristic-v1.js';
import heuristicV2 from './heuristic-v2.js';
import expectimaxD2V1 from './expectimax-d2-v1.js';
import expectimaxD3V1 from './expectimax-d3-v1.js';

export const AGENTS = new Map();

function register(agent) {
  const id = `${agent.name}-${agent.version}`;
  if (AGENTS.has(id)) throw new Error(`agent ${id} is already registered`);
  if (typeof agent.create !== 'function') throw new Error(`agent ${id}: create must be a function`);
  AGENTS.set(id, Object.freeze({ ...agent, id }));
  return AGENTS.get(id);
}

register(random);
register(greedy);
register(stacker);
register(heuristicV0);
register(heuristicV1);
register(heuristicV2);
register(expectimaxD2V1);
register(expectimaxD3V1);

export function getAgent(ref) {
  if (AGENTS.has(ref)) return AGENTS.get(ref);
  // Bare name, when exactly one version is registered under it.
  const matches = [...AGENTS.values()].filter((a) => a.name === ref);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`agent ${ref} is ambiguous: ${matches.map((a) => a.id).join(', ')}`);
  }
  throw new Error(`no such agent: ${ref} (have ${[...AGENTS.keys()].join(', ')})`);
}

export function listAgents() {
  return [...AGENTS.values()];
}

// Stackers on a named column, and the strict never-steer variant. Not
// registered by default: the four-agent ladder runs the centre stacker only,
// and these exist for the supplementary measurements that answer the
// centre-stacking question properly (see stacker.js).
export { makeStacker, makeStrictStacker, CENTRE };
