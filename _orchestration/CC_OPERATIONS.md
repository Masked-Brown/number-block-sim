# CC_OPERATIONS.md

The work order a worker bee hands to Claude Code. Self-documenting, ends with the touchdown
(`_orchestration/CC_TOUCHDOWN.md`) and the commit-and-push close.

The bee fills in the slug, the scope, and its own title. The job does the work, writes its
touchdown, and commits and pushes its own work to close.

British English, no em-dashes, no exclamation marks.

---

```markdown
# Claude Code work order -- <slug>

Slug naming rule: <job-description>
  - 2-5 words, hyphenated, describing what the job does
  - Examples: rules-spec-v0, sim-harness-build, heuristic-agent-v0
  - Used in the chat title and the touchdown: nbs-[cc]-1.0-<slug>

From worker bee: nbs-[wor]-1.0-<slug>
Model: <sonnet | opus | haiku | fable> | Effort: <standard | extended thinking | maximum extended thinking> | Rationale: <one line>
The touchdown records the exact model id that actually ran; this line is a recommendation only.

## Task
<what to build or change, one or two lines>

## In scope
- <path> -- <why>
## Out of scope
- <path / area> -- do not touch

## CONTEXT to read
- <path>/CONTEXT.md -- <the folder this job works in>
- <path>/CONTEXT.md -- <any other in-scope folder>
- _orchestration/CONTEXT.md and _chronicle/prompts/CONTEXT.md ride this list whenever the job
  touches those folders; CLAUDE.md's folder table is the navigation surface for the rest.

## Constraints
- Standing rules bind from their homes (CLAUDE.md, the in-scope CONTEXT.md files); they are not
  restated here. Add a constraint below ONLY where this job needs one the standing rules do not
  already give.
- A canon or operations edit co-updates `_infrastructure/DESIGN.md` and
  `_infrastructure/CHANGELOG.md` in the same act (norm B11; the protocol is stated in
  `_orchestration/CONTEXT.md`).
- A job facing an error greps `_orchestration/views/open-errors.md` before starting its own
  diagnosis (norm B9).
- A stated count of touchdowns is a count of filenames in `_chronicle/prompts/`, never the highest
  sequence number and never the count of distinct numbers (norm G1). If your work order or your
  pre-flight states one, check it against the machine-written `touchdowns:` line of the generated
  snapshot block in `_infrastructure/INFRASTRUCTURE.md` before relying on it, and report a mismatch
  as a stop-and-explain rather than working from the stated figure.
- Zones and who may edit: canon (norm B7, human-gated), records (B3, immutable), generated files
  incl. views and generated maps (B4, never hand-edit), semantic maps (B5, flag in the touchdown,
  never edit directly), the product zone 01_rules to 04_publish plus _config (product jobs edit it;
  the loop never touches it). A cross-venture or shared file gets deliberate handling regardless of zone;
  when a file's zone or editability is unclear, STOP and ask rather than analogising.
- Diagnostic-first binds from CLAUDE.md's routing. Kept here because they bind nowhere else for a
  job: verify before any destructive operation (until AB's git history holds a file, a deletion is
  unrecoverable; even after, confirm before deleting or overwriting); flag a contradiction rather
  than resolving it unilaterally; for deep traces, trace one level deep and cite the entry point
  for inner calls.
- <task-specific constraint, or none>

## Do
<the work, ordered if ordering matters>

## Verify (before you close)
- Confirm the work does what the task said before closing (run code, check output, spot-check data
  by eye). The rule that is not obvious: verify counts and pointers against disk, and prefer "as
  verified on disk" to a hard number, because a stale number becomes a lie the next job trusts.

## Touchdown (the last record you author)
Write your touchdown to `_chronicle/prompts/pending/NNNN_<slug>_<date>.md` (literal `NNNN`: the
number is picked under the repo lock by the close step's `--pick-number`, applying
CC_TOUCHDOWN.md's numbering rule; never pick it yourself) per
`_orchestration/CC_TOUCHDOWN.md`, schema-stamped (`schema: 2`, `actor: job`). Stamp the worker-bee
title into the `bee:` field. Fill How it went and Any errors at depth. Flag any verified-class map
change in Map flags (exact current text, exact replacement, path:line evidence); no map is edited
directly, and if no flag is warranted the touchdown says so explicitly. Do not pre-judge flags in
the work order; let the diagnostic set them. Alongside the touchdown, emit the one-line attention
flag in your closing output: `attention: green | amber | red -- <one-to-two-sentence note>`.
Then run the sweep: `python _orchestration/loop/sweep.py --apply`; on a non-default branch write
the touchdown only and the sweep runs at merge. Touchdown, then sweep, is the job's last act
(norm B8).
If the work order sets `test mode = true`, additionally write a diagnostic journal to
`_chronicle/mode-test/` per `_orchestration/TEST_MODE.md`; this never replaces the touchdown or
the sweep.

- _tmp clearance (carried in the touchdown's `## _tmp outputs` section): for anything left in `_tmp/`,
  state whether it is discardable (safe to delete) or a real output needing a home (flag for
  promotion). Promote before delete, never both in one step. A diagnostic (a data-state check, a
  coverage sweep, a health check) is a working document: it lives in `_tmp/` and is discardable once
  acted on. A deliverable never lives in `_tmp/`.
- Record any CONTEXT.md gap you hit in the touchdown: as a `gap-fact:` in Gaps where the fix is an
  individually verifiable substitution, as a `gap:` otherwise, and narratively in How it went.

## Close: commit and push through commit-safe (the closing act)
After the touchdown is written, commit and push your own work as the final act, so no uncommitted
state is left behind, and route every record write through the sanctioned save path:
`python _orchestration/loop/commit_safe.py -m "<message>" [--pick-number <pending-touchdown>]
<path> [<path> ...]`. In one held operation it acquires the repo lock (with stale-lock recovery
and a loud wait timeout), picks the touchdown number where asked (name your `NNNN_`-placeholder
touchdown in `--pick-number` and in the path list), stages exactly the named file paths (it
refuses `-A`, `.`, globs and directories), commits with the `Commit-Safe: yes` trailer, pushes,
and releases. The sweep's trailer audit raises any commit that touches `_chronicle/` without the
trailer, so a bare `git commit` to the record is a detected anomaly, not a shortcut.
Exclusive ownership (the invariant the lock does not give you): the lock guards the index, not
the files, so stage only paths this job exclusively owns. Shared surfaces that multiple actors
touch (the common maps in `_orchestration/maps/`, the views in `_orchestration/views/`, the
loop's own instruments) are sweep-owned and never job-staged.
Commit with a clear message naming what the job did; confirm `git status` shows a clean working
tree after. If `git status` shows modified files you did not touch, stage and commit only your
own and name the untouched ones in the touchdown, so nothing unrelated is swept in. Secrets are
gitignored (`.gitignore`): never stage a secret, and if you find one tracked, stop and flag it
for AB rather than pushing.
Git discipline (norm B10): explicit-path staging only, never `git add -A` or `git add .`; every
git return code checked; never `git mv` where the source may be untracked. commit-safe enforces
the staging half of this mechanically; the norm still binds any git you run outside it.
```

---

## Changelog

2026-08-05 -- seeded into number-block-sim from domain-wisdom-agent's copy (the estate's most
mature: the commit-safe close of its 2026-07-22 commit-discipline entry). Titles and slug
examples re-prefixed to nbs-, the zone index repointed to this repo's product zone (01_rules to
04_publish plus _config), the secrets sentence trimmed to the .gitignore fact (this repo carries
no secrets inventory yet). The sweep-checked B8, B9, B10, B11 and G1 contract lines carried
byte-verbatim.
