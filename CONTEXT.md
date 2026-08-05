# CONTEXT.md - the product zone's task routing (Layer 1)

You are at the root of the product zone. The stages sit at the repo root, so this file sits
beside `CLAUDE.md`: the two do not overlap. `CLAUDE.md` is Layer 0 (who may edit what, how to
close, what is off-limits); this file routes product work to its stage and states the rules that
bind across stages. It says nothing about the machinery folders; their rules live with them.

## The layer mapping

Per the ICM methodology, adapted for this repo: `CLAUDE.md` is Layer 0, the router. This file is
Layer 1, task routing. Each stage's `CONTEXT.md` is Layer 2, that stage's working contract,
carrying an Inputs / Process / Outputs table whose Inputs name the Layer 3 and Layer 4 files the
stage loads. `references/` (per stage) and `_config/` (shared across stages) are Layer 3, stable
across runs. `output/` (per stage) is Layer 4, per-run artefacts.

## Task routing

- **Deciding or recording what the game IS** (board, spawn distribution, merge rules, scoring):
  `01_rules/`. The rules spec is the single source the other stages implement against.
- **Building or changing the game or the simulation harness**: `02_build/`. Implements
  `01_rules/output/` exactly; never invents a rule.
- **Running simulations, training or evaluating agents, analysing runs**: `03_train/`. Raw
  results land in `output/runs/<run-id>/`; distilled beliefs land in `output/_FINDINGS.md`, the
  verdict register, by AB-gated promotion.
- **Writing up the experiment**: `04_publish/`. Reads `03_train/output/_FINDINGS.md`, never raw
  runs, never the touchdown record.
- **Reference material more than one stage loads**: `_config/`. Single-stage reference lives in
  that stage's own `references/`.

Read the stage's CONTEXT.md before touching its folder. Work that spans two stages is two
deliverables with a handoff through the upstream stage's `output/`, not one job editing both
freely.

## Touchdowns and stage outputs are two record systems

They are never merged, and no future job may conflate them. A **touchdown** is the per-job
logbook entry: immutable once landed, lives in `_chronicle/prompts/`, records what a job did and
how it went, whatever the job was about. A **stage output** is the artefact of the work itself:
lives in that stage's `output/`, versioned and editable per its stage's contract, and says
nothing about jobs. A simulation run's results go to `03_train/output/runs/`, and the job that
produced them still writes its touchdown to `_chronicle/prompts/pending/`; neither record
substitutes for the other, and neither folder ever holds the other's files.

## Do not

- Do not put a deliverable in `_tmp/` (norm B6) or a run result in `_chronicle/`.
- Do not duplicate a rule from `01_rules/` into another stage; point at it.
- Do not promote findings into `output/_FINDINGS.md` without AB's gate (`03_train/CONTEXT.md`
  carries the funnel rules).
- Do not resolve a TBD in any stage contract by inventing the value; TBDs are AB's to decide,
  and a job that needs one stops and asks.
