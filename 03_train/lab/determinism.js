// determinism.js -- the proof, not the hope.
//
// RULES.md 3 makes the game deterministic under a seed, BUILD.md decision 5
// makes determinism a tested property of the engine, and this stage adds the
// claim the training phase actually depends on: an AGENT'S game is reproducible
// too. If it is not, a frozen seed set is not an exam and no comparison in this
// experiment means anything.
//
// Three legs, and they have to be three genuinely different runs:
//   1. this process, a fresh agent instance
//   2. this process, a second fresh agent instance
//   3. a separate Node process, so no module-level cache can be hiding
// plus the browser leg, which is the exported replay opened in cinema mode on
// the live site: cinema re-runs the replay through the same engine and
// verifies the recorded score and final hash, and shows a verified badge when
// they match. Four environments, one hash.

import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { getAgent } from './agents/index.js';
import { playGame } from './runner.js';
import { buildReplay } from './replay.js';
import { LAB_DIR, REPO_ROOT } from './paths.js';

export function proveDeterminism({ agentId, seed }) {
  const agent = getAgent(agentId);

  const legs = [];
  const a = playGame(agent.create({}), seed);
  legs.push({ leg: 'node-run-1', ...pick(a) });
  const b = playGame(agent.create({}), seed);
  legs.push({ leg: 'node-run-2', ...pick(b) });

  const child = JSON.parse(execFileSync(process.execPath, [
    path.join(LAB_DIR, 'cli', 'one-game.js'), '--agent', agent.id, '--seed', String(seed),
  ], { cwd: REPO_ROOT, encoding: 'utf8' }));
  legs.push({
    leg: 'node-separate-process',
    score: child.score,
    finalHash: child.finalHash,
    maxTile: child.maxTile,
    moveCount: child.moveCount,
  });

  const identical = legs.every((l) => l.finalHash === legs[0].finalHash && l.score === legs[0].score);

  // The move lists must match too, not just the outcome: two different games
  // could in principle land on the same score, and the claim is about the game.
  const movesIdentical = a.moves.join(',') === b.moves.join(',');

  const withReasoning = playGame(agent.create({}), seed, { explain: true });
  const replay = buildReplay({
    agent,
    seed,
    moves: withReasoning.moves,
    reasoning: withReasoning.reasoning,
    finalState: withReasoning.finalState,
    note: 'determinism proof: the browser leg. Open in cinema mode on the live site; '
      + 'the verified badge means the browser engine reproduced this score and hash.',
  });

  return {
    agent: agent.id,
    seed: String(seed),
    legs,
    identical,
    movesIdentical,
    expected: { score: legs[0].score, finalHash: legs[0].finalHash },
    replay,
    // Filled in by hand after the browser leg is actually watched. Left null
    // rather than assumed: an unverified claim of verification is worse than
    // no claim.
    browserLeg: null,
  };
}

function pick(game) {
  return {
    score: game.metrics.score,
    finalHash: game.metrics.finalHash,
    maxTile: game.metrics.maxTile,
    moveCount: game.metrics.moveCount,
  };
}
