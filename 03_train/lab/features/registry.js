// registry.js -- the feature registry.
//
// The point of this file: 03b must be able to ADD, VERSION and RETIRE features
// without touching the harness. So a feature is a self-contained module that
// declares itself, the registry discovers modules by reading a directory, and
// an agent is a weight vector over registered feature NAMES plus a pin of the
// VERSIONS it was built against. Nothing in the runner, the agents or the CLI
// knows the feature list.
//
// A feature module (one file in `features/registered/`) default-exports:
//
//   {
//     name: 'kebab-case-name',   // stable identity across versions
//     version: 1,                // bump when the maths changes meaning
//     status: 'active',          // or 'retired'; retired stay registered
//     describe: 'one line',      // what it measures, in plain English
//     score(ctx) -> number       // pure; higher magnitude = more of the thing
//   }
//
// Sign convention: a feature returns a MAGNITUDE of the thing it measures and
// never a preference. Cost features (height, unevenness, strand risk) return a
// positive number meaning "there is this much of this bad thing", and the
// AGENT'S WEIGHT carries the sign. This keeps a feature honest on its own terms
// and keeps every judgement in one readable place, the weight vector.
//
// The scoring context `ctx` handed to `score` is built by the agent, once per
// candidate placement, and described in `features/context.js`.

const byKey = new Map(); // "name@version" -> feature
const latestByName = new Map(); // name -> feature (highest registered version)

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function registerFeature(feature) {
  if (!feature || typeof feature !== 'object') {
    throw new Error('a feature module must default-export an object');
  }
  const { name, version, describe, score } = feature;
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    throw new Error(`feature name must be kebab-case, got ${JSON.stringify(name)}`);
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`feature ${name}: version must be a positive integer`);
  }
  if (typeof describe !== 'string' || describe.length === 0) {
    throw new Error(`feature ${name}: describe must be a non-empty string`);
  }
  if (typeof score !== 'function') {
    throw new Error(`feature ${name}: score must be a function`);
  }
  const status = feature.status ?? 'active';
  if (status !== 'active' && status !== 'retired') {
    throw new Error(`feature ${name}: status must be active or retired`);
  }
  const key = `${name}@${version}`;
  if (byKey.has(key)) throw new Error(`feature ${key} is already registered`);
  const entry = Object.freeze({ name, version, status, describe, score, key });
  byKey.set(key, entry);
  const current = latestByName.get(name);
  if (!current || version > current.version) latestByName.set(name, entry);
  return entry;
}

// Resolve a feature by name (latest registered version) or by "name@version".
export function getFeature(ref) {
  const entry = ref.includes('@') ? byKey.get(ref) : latestByName.get(ref);
  if (!entry) throw new Error(`no such feature: ${ref}`);
  return entry;
}

export function hasFeature(ref) {
  return ref.includes('@') ? byKey.has(ref) : latestByName.has(ref);
}

// Every registered feature, newest version per name, sorted by name.
export function listFeatures({ includeRetired = false } = {}) {
  return [...latestByName.values()]
    .filter((f) => includeRetired || f.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listAllVersions() {
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// Bind an agent's weight vector to actual feature modules.
//
// This is where agent versioning bites. An agent version pins the feature
// versions it was tuned against; if the registry has moved on, or a pinned
// feature has been retired, construction FAILS LOUDLY rather than quietly
// scoring different maths under an old agent's name. That is the whole point:
// results are recorded against an agent version, so an agent version must mean
// exactly one thing forever.
export function bindWeights(weights, pins, { agentLabel = 'agent' } = {}) {
  const names = Object.keys(weights);
  if (names.length === 0) throw new Error(`${agentLabel}: empty weight vector`);
  const bound = [];
  for (const name of names) {
    const pinned = pins?.[name];
    if (pinned === undefined) {
      throw new Error(`${agentLabel}: weight for ${name} has no pinned feature version`);
    }
    const entry = getFeature(`${name}@${pinned}`);
    if (entry.status === 'retired') {
      throw new Error(`${agentLabel}: feature ${entry.key} is retired; pin an active version`);
    }
    bound.push({ feature: entry, weight: weights[name] });
  }
  for (const name of Object.keys(pins ?? {})) {
    if (weights[name] === undefined) {
      throw new Error(`${agentLabel}: pinned feature ${name} has no weight`);
    }
  }
  return bound;
}

// Test seam only: the registry is process-global and loaded once.
export function _resetRegistry() {
  byKey.clear();
  latestByName.clear();
}
