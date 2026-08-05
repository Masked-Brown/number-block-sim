---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: lock-rules-reconcile-canon
job: 0005
date: 2026-08-05
model: claude-sonnet-5
effort: standard
---

## Aim
Commit AB's dropped rule spec as the locked `01_rules/output/RULES.md` deliverable, and
reconcile every file that contradicted or overstated it, per validation touchdown 0003's
findings (MAJOR 1: CLAUDE.md/README.md/DESIGN.md A5 asserting mechanics as decided while
01_rules/CONTEXT.md and CLAUDE.md's own guardrail called them TBD; MINOR 5: two TBD lines in
01_rules/CONTEXT.md smuggling settled-sounding premises; MINOR 6: undefined Scout/Queen
vocabulary in CLAUDE.md's guardrail). Also record AB's ruling on quarantine self-clearance
(MAJOR 2).

## What it was told
Verify `01_rules/output/RULES.md` is on disk (AB-locked, do not alter); reconcile
`01_rules/CONTEXT.md`, `CLAUDE.md`, `README.md`, `_infrastructure/DESIGN.md` A5 and
`_infrastructure/CHANGELOG.md` to point at the locked file instead of restating or contradicting
it; append AB's verbatim quarantine-self-clearance ruling to `_chronicle/prompts/CONTEXT.md`;
grep the repo for any other statement of merge mechanics, spawn behaviour or scoring outside
RULES.md and align or point each at it. `02_build/` through `04_publish/`, `_config/` and
NORMS.md explicitly out of scope.

## What it did
Files changed: `01_rules/CONTEXT.md`, `CLAUDE.md`, `README.md`, `_infrastructure/DESIGN.md`,
`_infrastructure/CHANGELOG.md`, `_chronicle/prompts/CONTEXT.md`; new file
`01_rules/output/RULES.md` (AB-authored, verified on disk, committed byte-unaltered). Ran a
repo-wide grep for `merge|spawn distribution|scoring equation|stranded|board dimensions|TBD`
across every `.md` file to find remaining contradictions. Tests/build: n/a, no product code
exists yet.
Delegation: none

## Deliverables
- 01_rules/output/RULES.md -- the locked v1.0 rule specification, AB-authored and committed
  unaltered.
- 01_rules/CONTEXT.md -- "What this folder is" and Outputs sections reworded: mechanics DECIDED
  and pointed at RULES.md; the two settled-sounding TBD lines (merge, failure condition) removed.
- CLAUDE.md -- "What this is" paragraph and the guardrail bullet reworded to point at
  `01_rules/output/RULES.md` instead of restating or contradicting mechanics; "no Scout, no
  Queen" reworded to the two actors already named in this router (MINOR 6).
- README.md -- same MAJOR 1 alignment as CLAUDE.md, opening paragraphs reworded.
- _infrastructure/DESIGN.md -- A5 reworded to match; this is the B11 co-edit for this job's own
  canon edit to CLAUDE.md.
- _infrastructure/CHANGELOG.md -- entry 0002 (rules locked at v1.0, doubling as the B11 co-edit
  record for the CLAUDE.md canon change) and entry 0003 (AB's quarantine-self-clearance ruling).
- _chronicle/prompts/CONTEXT.md -- AB's ruling appended verbatim, unedited from the work order.

## How it went
Read touchdown 0003 in full to source the MAJOR/MINOR findings: its "How it went" section states
both in prose (the mechanics-decided-vs-TBD contradiction across CLAUDE.md, README.md, DESIGN.md
A5 and 01_rules/CONTEXT.md; the unilateral quarantine self-clearance). Neither the touchdown nor
any other file on disk carries the literal "MAJOR 1 / MINOR 5 / MINOR 6 / MAJOR 2" labels the
work order used, since touchdown 0003 recorded its deliverable (the severity-ranked report) as
its own closing chat output, never a repo file; the work order's own text supplied enough detail
to identify each finding unambiguously against 0003's prose, so nothing was invented.

Work-order self-check (CLAUDE.md's "Before you act"): this job edits a canon file (CLAUDE.md).
Of its three couplings, (a) the design-pack (icm-final) companion does not apply -- CLAUDE.md is
project-authored with no icm-final counterpart, exactly as the work order's own Constraints
section states, recorded here rather than silently skipped; (b) the DESIGN.md co-edit is done
(A5, this touchdown's deliverables); (c) the CHANGELOG.md entry is done (entry 0002, which names
the CLAUDE.md change and is dated today, so it is a CURRENT entry per the co-edit protocol's own
rule, not a historical mention).

RULES.md v1.0 turned out to resolve all five of 01_rules/CONTEXT.md's original TBD lines, not
just the two MINOR-5 lines: board, spawn, merge and the game score (section 5) and the game-over
condition (section 6) are all decided. The Outputs section was rewritten accordingly rather than
patched line-by-line, since patching two lines while leaving three adjacent "TBD" lines
technically-still-true-but-now-redundant would have left a worse contradiction than it fixed.
What genuinely stays open (the human composite performance score, RULES.md's own section 5
carve-out for Phase 4) is kept named as open, per the constraint not to change what RULES.md
itself leaves undecided.

Two things found by the grep sweep were deliberately NOT touched, per the explicit out-of-scope
list, and are recorded as gaps below instead of fixed: `03_train/CONTEXT.md` still calls the
scoring equation TBD, and `01_rules/CONTEXT.md`'s own Process section describes a versioning
scheme in tension with RULES.md's stated one. Flagging beats resolving where the work order draws
an explicit boundary.
Grade: 4
Prompt quality: strong. The work order was followed as written; its one gap is that the
MAJOR/MINOR labels it cites were never persisted to disk by the job that raised them, which cost
a cross-read of touchdown 0003's prose to resolve rather than a direct lookup.

## Correction passes
none

## Any errors
none

## Map flags
none -- this repo carries no maps.

## Gaps
gap: `03_train/CONTEXT.md` lines 32 and 48 still describe the scoring equation as blocked on
`01_rules/`'s TBD ("blocked on `01_rules/`' scoring equation TBD"; "Do not tune against an
invented scoring equation; scoring is `01_rules/`' TBD to close first"), which RULES.md section 5
now resolves (game score: value x chain index per merge). Out of this job's explicit scope
(02_build through 04_publish, _config excluded); a future 03_train-scoped job or the review
should reconcile it.

gap: `01_rules/CONTEXT.md`'s Process section still reads "New spec version = new file, prior
versions kept", while RULES.md's own header states a rule change to sections 1-6 gets "a version
bump here" (in place, same file, per its Status line). The two describe different versioning
schemes for the same file. Not resolved here: the work order's in-scope list for this file named
only the Outputs TBD lines, and inventing a resolution to a process question is exactly what
"flag rather than resolve" exists to prevent.

## Resolutions
none -- the findings this job closes (MAJOR 1, MINOR 5, MINOR 6, MAJOR 2) were narrative prose in
touchdown 0003's "How it went", never routed to the gap-queue or open-errors views as ids, so
there is nothing to resolve by id; they are closed by the file changes themselves.

## Proposals
none

## _tmp outputs
- none

## Work order verbatim
```
# Claude Code work order -- lock-rules-reconcile-canon

From worker bee: nbs-[wor]-1.0-z
Model: sonnet | Effort: standard | Rationale: precise small edits against
named findings, no open design.

## Task
Commit AB's dropped rule spec as the locked 01_rules deliverable, and
reconcile every file that currently contradicts it or overstates it,
per validation touchdown 0003's findings MAJOR 1, MINOR 5 and MINOR 6.
Also record AB's approved ruling on quarantine self-clearance (MAJOR 2).

## In scope
- 01_rules/output/RULES.md -- AB dropped this by hand; verify it exists,
  read it, commit it. Its content is AB-locked: do not alter it.
- 01_rules/CONTEXT.md -- update: board, spawn, merge and game-score rules
  are now DECIDED and live in output/RULES.md. Remove or reword the two
  TBD lines that smuggle in settled-sounding premises (MINOR 5). What
  genuinely remains open in this stage, keep listed as open.
- CLAUDE.md -- the "What this is" paragraph and the guardrail bullet
  currently assert merge mechanics as decided while calling them TBD
  lower down (MAJOR 1). Reword both to: the mechanics are decided and
  live in 01_rules/output/RULES.md. Also reword "No third actor: no
  Scout, no Queen" to drop vocabulary undefined in this repo (MINOR 6).
- README.md -- same MAJOR 1 alignment, one line.
- _infrastructure/DESIGN.md -- A5's project description: same alignment.
  Plus the B11 co-edit for the canon changes this job makes.
- _infrastructure/CHANGELOG.md -- two entries: (1) rules locked at v1.0,
  decided by AB with the bee, pointing at the file; (2) AB's ruling on
  quarantine self-clearance, text below.
- _chronicle/prompts/CONTEXT.md -- append AB's ruling verbatim:
  "Ruling (AB, 2026-08-05): a job may recover its own touchdown from
  quarantine during its own close, before the job ends, with the
  round-trip recorded in the touchdown. Anything still in quarantine
  when a job ends is human-gated, no exceptions. This resolves the
  B6/B12 tension surfaced by touchdown 0003 in favour of the recovery
  the seeding job made."

## Out of scope
- 02_build/ through 04_publish/, _config/ -- no stage content yet.
- NORMS.md -- the ruling lands in prompts/CONTEXT.md, not the shared
  base layer. Do not fork estate canon.
- The open review queue items -- the standing window owns those.

## CONTEXT to read
- 01_rules/CONTEXT.md
- CONTEXT.md (root, Layer 1)
- _orchestration/CONTEXT.md and _chronicle/prompts/CONTEXT.md (both are
  touched by this job)
- _infrastructure/CONTEXT.md

## Constraints
- If 01_rules/output/RULES.md is absent on disk, stop and report; do not
  author it yourself.
- Canon edits here (CLAUDE.md) are project-authored files with no
  icm-final design-pack companion; state that in the touchdown rather
  than silently skipping the coupling check.
- Change no meaning while rewording: what RULES.md decides is decided,
  what it leaves to later phases (composite human score, publish format)
  stays open.

## Do
1. Verify RULES.md is on disk in 01_rules/output/ and internally
   consistent with 01_rules/CONTEXT.md's open-question list once you
   have updated it. Flag any contradiction rather than resolving it.
2. Make the edits above, smallest diff that removes every contradiction.
3. Grep the whole repo for any remaining statement of merge mechanics,
   spawn behaviour or scoring outside RULES.md; align or point each at
   the rules file.

## Verify (before you close)
- A fresh agent reading CLAUDE.md, then 01_rules/CONTEXT.md, then
  RULES.md meets zero contradictions about what is decided.
- The CHANGELOG entries parse against the sweep's entry format, so the
  canon change is recognised rather than raised as an anomaly.
```
