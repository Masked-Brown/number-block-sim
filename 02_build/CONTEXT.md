# CONTEXT -- 02_build/

## What this folder is
The game and its simulation harness: the stage that turns the rule spec into something that
runs. Two consumers with one implementation: a playable game (for eyeballing behaviour) and a
headless simulation interface (what `03_train/` drives at scale). The playable game is built
and deployed (2026-08-05); the code's home is `docs/`, a declared divergence from the plain
stage shape, because GitHub Pages serves `main` `/docs` and push equals deploy. This folder
keeps the stage's intent (this contract), its records (`output/`), and its reference notes.

## Inputs
| Input | Layer | What it carries |
|---|---|---|
| `01_rules/output/RULES.md` | 4 (upstream) | The locked v1.0 rule spec this stage implements exactly. |
| `docs/js/config.js` | 3 | The single tunables file: every RULES.md section 8 constant. Rule constants are not tunables; they live in the engine as locked rules. |
| `references/` | 3 | Implementation notes, library evaluations, harness design notes. Empty so far. |

## Process
Implement the spec, never interpret it: a rule question found mid-build is a stop-and-ask
routed back to `01_rules/`, not a judgement call. Runnable code lives in `docs/` (engine, UI,
cinema mode, tests; the architecture record `output/BUILD.md` maps it), with intent markdown
staying at this root. Every build verifies against the spec's own examples before it closes;
determinism is a tested property (`node --test docs/test/`, plus `docs/test.html` for the
browser half of the cross-environment check).

- Language and framework: DECIDED (AB, 2026-08-05, carried by the build work order): vanilla
  JS ES modules, no framework, no bundler, no build step, no dependencies. The engine runs
  unchanged in the browser and in Node.
- The simulation interface contract: the engine's exported API is the contract's concrete
  base: `newGame(seed)`, `play(state, col)` returning `{state, events}`, `fromPosition(...)`
  for hypothetical positions, replay run and verify helpers, and `resultMetrics(state)`
  (`output/BUILD.md` records it). Anything further the first agent job needs (batch step
  semantics, observation encodings) is still co-owned with `03_train/` and decided before
  that job, recorded here and loaded from `references/` by both stages.

## Outputs
`output/`: per-build artefacts (build reports, spec-conformance verification transcripts).
First resident: `BUILD.md`, the 2026-08-05 architecture and verification record. The code
itself is not an `output/` artefact; it lives in `docs/` and its record is git history plus
the job's touchdown.

## Do not
- No rule values invented or hardcoded; the spec governs, and section 8 tuning loads from
  `docs/js/config.js`, never inline.
- No agent logic here; agents belong to `03_train/`, and this stage only exposes the interface.
- No further deployment surface beyond the existing Pages setup without AB naming it (the
  CLAUDE.md guardrail).
