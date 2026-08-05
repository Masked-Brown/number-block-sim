# CONTEXT -- 03_train/

## What this folder is
Agent training and evaluation: many simulation runs plus iteration, not a single pass with one
review gate. That is this repo's first deliberate adaptation of plain ICM, and it gives the
stage a two-layer `output/`, lifted from youtube-pov's analysis funnel: `output/runs/<run-id>/`
is the investigation layer (raw results, allowed to accumulate), and `output/_FINDINGS.md` is
the verdict layer (the distilled current beliefs that `04_publish/` reads).

The simulation lab exists as of 2026-08-05 (job train-lab-and-baselines): a headless harness in
`lab/`, the frozen seed sets in `seeds/`, three baselines and the first heuristic agent, and one
measured run in `output/runs/`.

## Where the harness lives
`03_train/lab/`, a plain Node ES-module tree with no dependencies (`lab/package.json` carries
`"type": "module"` and nothing else, exactly as `docs/package.json` does).

| Path | What it is |
|---|---|
| `lab/engine-link.js` | The ONE place the lab reaches `docs/js/engine.js`. Re-exports only. |
| `lab/board.js` | Read-only derived views of a board (heights, landing cells, tiers). Measurements, never decisions. |
| `lab/agents/` | The players. `index.js` is the registry and states the agent interface. `weighted.js` and `expectimax.js` are FACTORIES for unregistered candidates (breeding, probes); only registered named versions produce headline rows. |
| `lab/features/` | `registry.js`, `context.js`, and `registered/` holding one module per feature. |
| `lab/runner.js` | Plays an agent on a seed set and writes the run record, serially. |
| `lab/parallel.js` | The worker-pool fan-out over seeds (worker_threads, no engine change). Bit-identical to the serial runner by construction and by standing test; `gameIdentity()` states the definition (the stopwatch field is excluded, nothing else). |
| `lab/train/cem.js` | Cross-entropy weight breeding: seeded, deterministic, reproducible from its recorded config. |
| `lab/metrics.js`, `lab/seeds.js`, `lab/manifest.js`, `lab/replay.js`, `lab/determinism.js` | Aggregation, frozen-set loading, provenance, replay export, the determinism proof. |
| `lab/cli/` | `campaign.js` (the four-agent smoke ladder), `run.js` / `run-parallel.js` (one agent, serial / pooled), `breed.js` (a CEM breed as a run folder), `throughput.js` / `throughput-parallel.js` (repeated timing, best/median/worst), `parallel-check.js` (the bit-identity proof), `probe-behaviour.js` (per-move diagnostics, train seeds only), `ladder-tables.js` (assemble ladder tables from named runs), `make-seeds.js` (run once, ever), `one-game.js`. |
| `lab/test/lab.test.js` | The harness's own suite: `node --test 03_train/lab/test/`. |

**The harness imports the engine and never reimplements it.** There is no copied, adapted or
re-implemented merge, spawn, scoring or game-over logic anywhere in this stage. Every candidate
placement an agent considers is evaluated by calling `play()` and reading the events it returns,
so the agent is scoring the truth rather than a model of it. If a future job finds an import
problem tempting a copy, that is a stop-and-report, not a workaround.

Run the ladder: `node 03_train/lab/cli/campaign.js --games 500`.

## The agent interface
One shape for every player in the experiment, stated in full in `lab/agents/index.js`:

    agent.create({ seed }) -> instance
    instance.choose(view)  -> column               REQUIRED, and pure
    instance.explain(view) -> {text, features}     OPTIONAL, for enriched replays

    view = { state, current, next, spawn }
      state    the engine state, read only; an agent never mutates what it is handed
      current  the falling block's value
      next     the previewed value that follows it (RULES.md 3)
      spawn    the live spawn distribution from this board, the exact numbers the UI
               shows (RULES.md 7)

`choose` is a pure function: the same view always returns the same column, with no hidden state
and no real randomness anywhere. That is what makes a frozen seed set an exam rather than a
lottery, and it is why the random baseline takes its dice from the engine's own state hash.
`create` exists so an agent can do one-off work once (heuristic-v0 binds its weight vector to
feature modules there); it never introduces per-move state.

## The feature registry
A feature is a self-contained module in `lab/features/registered/` declaring `{name, version,
status, describe, score(ctx)}`. The registry discovers modules by reading that directory, so
**adding, versioning or retiring a feature never touches the harness**: adding one is dropping a
file in, retiring one is setting `status: 'retired'` in its own module.

Sign convention: a feature returns a MAGNITUDE of the thing it measures and never a preference.
Cost features return a positive number and the agent's weight carries the sign, so every
judgement sits in one readable place, the weight vector.

## Seed and repetition policy (settled 2026-08-05, work order train-lab-and-baselines)
This closes the stage's seed-and-repetition TBD. The protocol came with the work order; it was
not invented by the job.

- **`seeds/eval-v1.json` is the exam: exactly 500 seeds, generated once, committed, FROZEN.**
  Never regenerated, never extended, never reordered. Every headline comparison in this
  experiment runs on it. It is loaded through `lab/seeds.js`, which verifies the file against its
  own checksum and refuses a set that has been edited, because a result is only comparable to
  another result if both sat the same paper.
- **`seeds/train-v1.json` is the practice pool**, 2,000 seeds, disjoint from eval-v1 by
  construction and checked at generation. Tuning and later training campaigns use it.
  **Training never touches eval-v1.**
- Repetition: an agent is deterministic, so repeating a seed adds nothing. The sample size IS the
  seed count, and the standing figure for a headline comparison is all 500 eval-v1 seeds.
- Seeds are derived, not random: sha256 over a fixed label and an index, first eight bytes as a
  uint64. `lab/cli/make-seeds.js` regenerates the identical list and refuses to overwrite.

## Agent and feature versioning
**The exam is frozen, versions are immutable, comparisons happen between named versions only.**

- An agent's identity is name plus version (`heuristic-v0`, `greedy-v1`). A results table names
  that id, so the id must mean exactly one thing forever. A changed weight, a changed feature
  list or a changed tie-break is a NEW version, never an edit to an existing one.
- An agent version pins the VERSION of every feature it weights. If a feature is re-versioned or
  retired, the agent fails loudly at construction rather than silently scoring different maths
  under an old name (`registry.js`, `bindWeights`).
- The manifest of every run records the agent id, the full feature list with versions and
  weights, the seed set id and checksum, the engine's git commit and sha256, and the spawn
  parameters the run used.

## Inputs
| Input | Layer | What it carries |
|---|---|---|
| `docs/js/engine.js` (via `lab/engine-link.js`) | upstream code | THE engine. The harness drives the same file the browser game does; this stage never reimplements it. |
| `docs/js/config.js` | upstream code | The spawn curve parameters and other RULES.md section 8 tunables a run records itself against. |
| `01_rules/output/RULES.md` | 4 (upstream) | Ground truth for scoring and legality. The engine implements it; this stage never re-derives it. |
| `02_build/output/BUILD.md` | 4 (upstream) | The engine's interface record and the decisions behind it. |
| `seeds/eval-v1.json`, `seeds/train-v1.json` | 3 | The frozen exam and the practice pool. |
| `_config/` | 3 | Shared constants extract. Carries a CONTEXT.md only; nothing to load yet. |
| `references/` | 3 | Agent design notes, evaluation methodology notes. Empty. |

## Process
A run lands in `output/runs/<run-id>/` carrying its raw results, its configuration (enough to
reproduce it) and a short summary doc. Run-id: `<YYYY-MM-DD>_<slug>`, suffixed `-b`, `-c` on
same-day collision (`lab/runner.js` allocates it). A completed run's folder is never edited
afterwards; a corrected run is a new run. The summary doc closes with a "Findings for the
register" section: candidate findings drafted in the register's six-field format, ID left blank.
**Promotion is deliberate and AB-gated**: AB reads the run, a promotion pass lifts accepted
findings into `output/_FINDINGS.md`, and the run's summary is marked processed. A CC job never
auto-writes the register; a finding does not earn an entry by existing.

**No manifest, no run.** Every run folder starts with `manifest.json`, written before the first
game rather than after the last, so a crashed run still says exactly what it was. A result whose
provenance is unknown is not a result.

**Campaign conventions (settled 2026-08-05, work order orchestrated-training-campaign).** A
training campaign is orchestrated as a sequence of run folders, three kinds distinguished by
the manifest's `kind`: agent series (the default), `breeding` (a CEM breed: config in the
manifest, one JSONL line per generation, `result.json` with the champion and its held-out
validation), and `measurement` (proofs and timings, no games recorded). The campaign's
judgement lives in two campaign-level files beside `_FINDINGS.md`: `output/DECISION_LOG.md`,
the dated append-only record of every campaign or feature idea tried, why, what it showed and
what was done (written as the campaign runs, quotable by Phase 4), and
`output/knowledge.json`, the machine-readable champion knowledge file (weights, feature list,
provenance, learning curves). Breeding discipline: fitness on a fixed train-v1 block (common
random numbers, median), champions validated on a held-out train-v1 block before naming;
eval-v1 is touched only by registered named versions producing headline rows, all 500 seeds.
Timing discipline: any quoted throughput comes from repeated passes (best, median, worst);
this machine's noise swamps single runs, and its measured worker-pool sweet spot is 6 workers.

Per-game metrics stream to `games.jsonl`, one line per game, carrying RULES.md section 7's list
(final score, max tile, blocks placed, merge counts by group size, longest chain, final hash)
plus the move list. Duration is deliberately not among them: RULES.md 7 scopes duration and
per-move timestamps to human play, so the harness's wall-clock figure is recorded separately as
a throughput measurement and never as a game metric.

Any harness game can be exported as a replay in the engine's own format v2, optionally with
`reasoning[]`: a plain-English line and the named feature scores per move. Cinema mode on the
live site plays it and verifies it, so an agent's game is watchable by anyone with no new viewer
to build. Every replay is verified through the engine before it is written.

- Settled 2026-08-05: the evaluation metric. RULES.md v1.1 locks the scoring equation (section 5)
  and the per-game metric list (section 7), so runs report the game score itself and the proxy
  caveat is retired. This TBD closed on upstream fact, not on a job's judgement.
- TBD: the agent approach (open question: heuristic baseline first, then search, then RL if the
  ceiling demands it, is the assumed ladder, but AB has not locked it; the CLAUDE.md guardrail
  holds the RL stack until a baseline's ceiling is measured. heuristic-v0 exists and is measured;
  its ceiling is not).

## Outputs
`output/runs/<run-id>/`: the raw, reproducible record of each run (Layer 4, immutable once
complete). `output/samples/`: enriched replays saved for watching in cinema mode, kept out of the
run folders because they are meant to be found and opened, not archived. `output/_FINDINGS.md`:
the verdict register, the one file `04_publish/` reads; current-state, edited in place by
promotion passes, never a log.

## Do not
- Do not conflate run records with touchdowns: the run's artefacts live here, the job's
  touchdown lives in `_chronicle/prompts/`, and neither substitutes for the other (root
  CONTEXT.md states the rule; it binds hardest in this stage).
- Do not write to `output/_FINDINGS.md` from a run job; promotion is its own AB-gated pass.
- Do not edit a completed run's folder; a correction is a new run.
- Do not regenerate, extend or reorder `seeds/eval-v1.json`, and do not tune against it.
- Do not edit an existing agent version's weights, feature list or tie-break; cut a new version.
- Do not reimplement any game logic here; import the engine and call it.
