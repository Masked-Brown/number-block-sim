// manifest.js -- no manifest, no run.
//
// Every run folder starts with a manifest, and the runner writes it before the
// first game rather than after the last, so a crashed run still says exactly
// what it was. A result whose provenance is unknown is not a result: it is a
// number someone will later quote without being able to reproduce it.
//
// The manifest pins the code as well as the configuration. The engine's git
// commit answers "which engine", its sha256 answers "was the working tree
// clean when this ran", and the spawn parameters are copied in because they
// are tunables (RULES.md 8) that AB may retune tomorrow.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { CONFIG, ENGINE_PATH, CONFIG_PATH, RULES_VERSION } from './engine-link.js';
import { REPO_ROOT } from './paths.js';
import { createHash } from 'node:crypto';

export const HARNESS_VERSION = '1.0';

function git(args) {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function sha256File(relative) {
  const buf = readFileSync(path.join(REPO_ROOT, relative));
  return createHash('sha256').update(buf).digest('hex');
}

export function engineProvenance() {
  const engineCommit = git(['log', '-1', '--format=%H', '--', ENGINE_PATH]);
  const dirty = git(['status', '--porcelain', '--', ENGINE_PATH, CONFIG_PATH]);
  return {
    rulesVersion: RULES_VERSION,
    enginePath: ENGINE_PATH,
    engineCommit,
    engineSha256: sha256File(ENGINE_PATH),
    configPath: CONFIG_PATH,
    configSha256: sha256File(CONFIG_PATH),
    repoCommit: git(['rev-parse', 'HEAD']),
    // Empty string means clean; a non-empty listing means the engine or its
    // tunables had uncommitted edits when this run happened, and the commit
    // above does not fully describe what ran.
    workingTreeDirty: dirty === null ? null : dirty.length > 0,
  };
}

export function buildManifest({ runId, agent, seedSet, games, spawn, note }) {
  if (!runId) throw new Error('manifest: runId is required');
  if (!agent) throw new Error('manifest: agent is required');
  if (!seedSet) throw new Error('manifest: seedSet is required');
  if (!Number.isInteger(games) || games <= 0) throw new Error('manifest: games must be a positive integer');
  const agentManifest = typeof agent.manifest === 'function' ? agent.manifest() : null;
  return {
    runId,
    createdAt: new Date().toISOString(),
    harness: { name: 'nbs-lab', version: HARNESS_VERSION, node: process.version },
    agent: {
      id: agent.id ?? `${agent.name}-${agent.version}`,
      name: agent.name,
      version: agent.version,
      describe: agent.describe,
      features: agentManifest?.features ?? null,
      weights: agentManifest?.weights ?? null,
    },
    seedSet: {
      id: seedSet.id,
      file: seedSet.file,
      checksum: seedSet.checksum,
      available: seedSet.count,
      gamesPlayed: games,
    },
    engine: engineProvenance(),
    spawn: { ...(spawn ?? CONFIG.spawn) },
    note: note ?? null,
  };
}
