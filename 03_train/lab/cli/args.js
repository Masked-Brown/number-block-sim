// args.js -- the smallest argument parser that does the job. No dependencies
// anywhere in this lab, by constraint and by preference.

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) { out._.push(token); continue; }
    const eq = token.indexOf('=');
    if (eq !== -1) { out[token.slice(2, eq)] = token.slice(eq + 1); continue; }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { out[key] = true; continue; }
    out[key] = next;
    i += 1;
  }
  return out;
}

export function intArg(args, name, fallback) {
  if (args[name] === undefined) return fallback;
  const n = Number(args[name]);
  if (!Number.isInteger(n)) throw new Error(`--${name} must be an integer, got ${args[name]}`);
  return n;
}
