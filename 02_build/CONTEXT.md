# CONTEXT -- 02_build/

## What this folder is
The game and its simulation harness: the stage that turns the rule spec into something that
runs. Two consumers with one implementation: a playable game (for eyeballing behaviour) and a
headless simulation interface (what `03_train/` drives at scale). The stage is a stub at
seeding: no code exists yet.

## Inputs
| Input | Layer | What it carries |
|---|---|---|
| `01_rules/output/rules-spec-v<N>.md` | 4 (upstream) | The rule spec this stage implements exactly. Does not exist yet; nothing can be built until it lands. |
| `_config/` | 3 | The spec's machine-readable constants extract, once it exists; code loads values from there, never hardcodes them. |
| `references/` | 3 | Implementation notes, library evaluations, harness design notes. Empty at seeding. |

## Process
Implement the spec, never interpret it: a rule question found mid-build is a stop-and-ask
routed back to `01_rules/`, not a judgement call. When the build starts, runnable code lands in
`02_build/src/` (the estate's stage pattern; the folder is created by the first build job),
with intent markdown staying at this root. Every build verifies against the spec's own examples
before it closes.

- TBD: language and framework (open question: what the game and harness are written in;
  nothing downstream constrains it yet, and AB decides at build time).
- TBD: the simulation interface contract (open question: the state representation, action
  space and step semantics `03_train/` will drive; co-owned with `03_train/` and decided
  before the first agent job, recorded here and loaded from `references/` by both stages).

## Outputs
`output/`: per-build artefacts (build reports, spec-conformance verification transcripts).
Empty at seeding. The code itself is not an `output/` artefact; it lives in `src/` and its
record is git history plus the job's touchdown.

## Do not
- No rule values invented or hardcoded; the spec and its `_config/` extract are the source.
- No agent logic here; agents belong to `03_train/`, and this stage only exposes the interface.
- No UI polish or deployment work (the CLAUDE.md guardrail).
