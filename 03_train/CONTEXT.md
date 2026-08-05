# CONTEXT -- 03_train/

## What this folder is
Agent training and evaluation: many simulation runs plus iteration, not a single pass with one
review gate. That is this repo's first deliberate adaptation of plain ICM, and it gives the
stage a two-layer `output/`, lifted from youtube-pov's analysis funnel: `output/runs/<run-id>/`
is the investigation layer (raw results, allowed to accumulate), and `output/_FINDINGS.md` is
the verdict layer (the distilled current beliefs that `04_publish/` reads). The stage is a stub
at seeding: no agent, no runs.

## Inputs
| Input | Layer | What it carries |
|---|---|---|
| `02_build/src/` (via the simulation interface) | upstream code | The headless harness this stage drives. Does not exist yet. |
| `01_rules/output/rules-spec-v<N>.md` | 4 (upstream) | Ground truth for scoring and legality; the harness implements it, this stage never re-derives it. |
| `_config/` | 3 | Shared constants extract, once it exists. |
| `references/` | 3 | Agent design notes, evaluation methodology notes. Empty at seeding. |

## Process
A run lands in `output/runs/<run-id>/` carrying its raw results, its configuration (enough to
reproduce it) and a short summary doc. Run-id: `<YYYY-MM-DD>_<slug>`, suffixed `-b`, `-c` on
same-day collision. A completed run's folder is never edited afterwards; a corrected run is a
new run. The summary doc closes with a "Findings for the register" section: candidate findings
drafted in the register's six-field format, ID left blank. **Promotion is deliberate and
AB-gated**: AB reads the run, a promotion pass lifts accepted findings into
`output/_FINDINGS.md`, and the run's summary is marked processed. A CC job never auto-writes
the register; a finding does not earn an entry by existing.

- TBD: the agent approach (open question: heuristic baseline first, then search, then RL if the
  ceiling demands it, is the assumed ladder, but AB has not locked it; the CLAUDE.md guardrail
  holds the RL stack until a baseline's ceiling is measured).
- TBD: the evaluation metric (open question: blocked on `01_rules/`' scoring equation TBD;
  until scoring is decided, runs can only report proxy metrics and must name them as proxies).
- TBD: seed and repetition policy (open question: how many episodes per configuration and how
  seeds are fixed for comparability; decided with the first real run design).

## Outputs
`output/runs/<run-id>/`: the raw, reproducible record of each run (Layer 4, immutable once
complete). `output/_FINDINGS.md`: the verdict register, the one file `04_publish/` reads;
current-state, edited in place by promotion passes, never a log.

## Do not
- Do not conflate run records with touchdowns: the run's artefacts live here, the job's
  touchdown lives in `_chronicle/prompts/`, and neither substitutes for the other (root
  CONTEXT.md states the rule; it binds hardest in this stage).
- Do not write to `output/_FINDINGS.md` from a run job; promotion is its own AB-gated pass.
- Do not edit a completed run's folder; a correction is a new run.
- Do not tune against an invented scoring equation; scoring is `01_rules/`' TBD to close first.
