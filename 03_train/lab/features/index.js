// index.js -- feature discovery.
//
// Every `.js` file in `registered/` is a feature module and is loaded at
// import time. Adding a feature is dropping a file in that directory; nothing
// in the runner, the agents or the CLI is edited. Retiring one is setting its
// `status` to 'retired' in its own module, which keeps the record and makes
// every agent pinned to it refuse to construct (see registry.js bindWeights).
//
// Load order is alphabetical by filename, so the registry's contents do not
// depend on the filesystem's whims.

import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { registerFeature } from './registry.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'registered');

const files = readdirSync(DIR).filter((f) => f.endsWith('.js')).sort();
for (const file of files) {
  const mod = await import(pathToFileURL(path.join(DIR, file)).href);
  if (!mod.default) throw new Error(`feature module ${file} has no default export`);
  registerFeature(mod.default);
}

export const FEATURE_DIR = DIR;
export {
  registerFeature,
  getFeature,
  hasFeature,
  listFeatures,
  listAllVersions,
  bindWeights,
} from './registry.js';
export { buildContext } from './context.js';
