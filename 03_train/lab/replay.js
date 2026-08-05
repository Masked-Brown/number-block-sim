// replay.js -- enriched replay export.
//
// A harness game and a browser game produce the SAME artefact: replay format
// v2, the schema the engine and cinema mode already speak (BUILD.md decision
// 6). The only difference is the optional `reasoning[]` array, one entry per
// move, which cinema renders as a plain-English line and a bar per named
// feature. That is the whole point of building the export here rather than a
// bespoke log format: an agent's game is watchable on the live site by anyone,
// with no new viewer to build and no second format to keep in step.
//
// Every replay is verified through the engine BEFORE it is written. A replay
// that does not reproduce its own recorded score and hash is not saved, it is
// an error, because a broken sample replay would waste AB's time in the worst
// possible way, by looking fine.

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { makeReplay, verifyReplay, resultMetrics, CONFIG } from './engine-link.js';

export function buildReplay({ agent, seed, moves, reasoning, finalState, spawn = CONFIG.spawn, note }) {
  const replay = makeReplay(seed, moves, {
    date: new Date().toISOString(),
    player: `${agent.id ?? `${agent.name}-${agent.version}`} (harness)`,
    note: note ?? null,
    result: resultMetrics(finalState),
  }, spawn);
  if (reasoning) {
    if (reasoning.length !== moves.length) {
      throw new Error(`reasoning has ${reasoning.length} entries for ${moves.length} moves`);
    }
    replay.reasoning = reasoning;
  }
  return replay;
}

export function writeReplay(replay, file) {
  const verdict = verifyReplay(replay);
  if (!verdict.ok) {
    throw new Error(`refusing to write a replay that does not verify: ${verdict.mismatches.join('; ')}`);
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(replay, null, 2)}\n`);
  return { file, verdict };
}
