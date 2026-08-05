---
schema: 2
actor: job
bee: nbs-[wor]-1.0-z
slug: fix-picknumber-and-corrections
job: 0014
date: 2026-08-05
model: claude-sonnet-5
effort: extended thinking
---

## Aim
Fix the touchdown-number placeholder trap in `commit_safe.py` that quarantined two touchdowns
(0011, 0013) the same day; append a dated correction to `BUILD.md` retracting the false
same-column-stacking signal; record the 03a gate verdict. AB approved all three 2026-08-05.

## What it was told
Diagnose then fix `commit_safe.py`'s `--pick-number` placeholder trap (touch `CC_TOUCHDOWN.md`
only if the diagnosis names the template half); append an append-only dated correction to
`02_build/output/BUILD.md`; record the B11 co-edit for the loop-code change plus a CHANGELOG
decision entry for the 03a gate, in `DESIGN.md` and `CHANGELOG.md`. Read the sibling repos
(domain-wisdom-agent, youtube-pov) read-only and state whether they carry the same trap. No
`03_train/` work, no other loop code, no schema changes, no game retuning.

## What it did
Files changed: `_orchestration/loop/commit_safe.py` (the fix), `02_build/output/BUILD.md`
(append-only correction), `_infrastructure/CHANGELOG.md` (entries 0006, 0007),
`_infrastructure/DESIGN.md` (project appendix A8). Tests/build: `python -m py_compile
commit_safe.py` green; `--help` runs; the fix proven by a scripted dry-run in an isolated
throwaway git clone (full detail below) -- picked number landed in both the filename and the
frontmatter `job:` field, and the real `sweep.py --apply` validated the resulting touchdown
first time with `quarantined=0`, moving it to `completed/`. No game code touched, so the engine
test suite was not re-run (out of scope; nothing in `docs/` changed).
Delegation: none.

## Deliverables
- _orchestration/loop/commit_safe.py -- `--pick-number` now syncs the frontmatter `job:` field
  to the picked number in the same held rename operation.
- 02_build/output/BUILD.md -- dated append-only correction retracting the stacking observation.
- _infrastructure/CHANGELOG.md -- entry 0006 (the B11 loop-code co-edit) and entry 0007 (the
  03a gate decision).
- _infrastructure/DESIGN.md -- project appendix A8, the fix's local status and estate check.

## How it went
**The trap, in plain English.** `CC_TOUCHDOWN.md`'s numbering rule has a job write its
touchdown to `pending/` with a literal `NNNN` placeholder in the FILENAME, then run
`commit_safe.py --pick-number FILE` to have the real number picked and the file renamed under
the lock. The frontmatter template also carries `job: <NNNN>`, and nothing in the numbering
rule or the tool's own documentation told a job the two placeholders needed different handling
-- so a job following the template literally typed the same literal `NNNN` text in both places.
`commit_safe.py`'s pick-number step (old lines 410-422) renamed only the file; nothing touched
the frontmatter. The schema (`td_v2.json`) requires `job:` to match `^\d{4}$`, which the literal
string `NNNN` fails, so the sweep quarantined the touchdown on its own first close every time.

**Which two components disagreed.** The numbering rule (CC_TOUCHDOWN.md, human-authored prose)
assumes one placeholder that gets filled in "somehow" at pick time; the tool
(`commit_safe.py`, code) only ever implemented the filename half of that fill. Two owners for
one fact (the assigned number), only one of them wired up.

**Why it fired here first.** Read-only history check of domain-wisdom-agent (commit_safe.py's
proven source, per this repo's DESIGN.md A6): its own two `--pick-number` touchdowns
(f633f2a, `job: 0118`, filename picked 0118; c2e46d7, `job: 0119`, filename picked 0119) both
show the frontmatter number matching the picked filename number exactly, and every sweep run in
that repo's log since 2026-07-21 shows `quarantined=0`. That is not the tool being safe: it is
the job in each case pre-guessing the correct number itself (commit_safe.py's own docstring
there allows "a provisional number" in the filename as an alternative to the literal `NNNN`) and
writing that same guessed number into the frontmatter too, so the rename never actually changed
anything and the mismatch never had a chance to surface. This repo's jobs instead followed the
numbering rule's literal-`NNNN` convention as written, in both places, and hit the fork for real
-- twice the same day (0011, then 0013 ninety seconds after its own close). The trap was always
live in the tool; this repo is simply the first place a job followed the documented convention
literally enough to trigger it.

**Whether it is latent in the estate.** Confirmed yes in domain-wisdom-agent: its
`commit_safe.py` (read-only check, this job) still has the unpatched rename
(`os.replace(old_abs, new_abs)` with nothing touching frontmatter after it). It has simply not
been hit there yet, for the convention reason above, not because it is fixed. youtube-pov
carries no `commit_safe.py` and no `--pick-number` mechanism at all: its `CC_OPERATIONS.md` has
the job compute its own next number and write the touchdown directly with that number in both
places at authoring time, so this specific two-owners-one-field trap does not apply to it in
the same form (a different, unexamined risk -- no lock around the job's own scan -- exists
there instead, out of scope to raise as more than a note).

**The fix.** `job_field_synced_text()` (new, `commit_safe.py`) reads FILE, locates the
frontmatter block by its `---` delimiters, and rewrites ONLY the `job:` line to the picked
number, computed and returned as text BEFORE any disk mutation. `main()` calls it before
`os.replace`, so a malformed touchdown (missing delimiters, missing `job:` field -- both should
be impossible for a template-conformant file, but checked anyway) refuses loudly and leaves the
original file completely untouched rather than landing half-renamed. After the rename, the
synced text is written to the new path in the same held lock. Scoped strictly to that one line;
the rest of the frontmatter and the entire body are never touched.

**`CC_TOUCHDOWN.md`: not changed.** The diagnosis showed the trap is entirely in the tool, not
the template: the template's `job: <NNNN>` is already generic placeholder notation consistent
with every other angle-bracketed field in it (`<job slug>`, `<YYYY-MM-DD>`, etc.), and a job
that writes the literal text the numbering rule actually asks for (`NNNN` in the filename) now
gets it correctly synced everywhere. No template edit was needed or made.

**The design-pack coupling.** `commit_safe.py` is estate-shared loop code (copied
SHA-256-verified from domain-wisdom-agent per this repo's DESIGN.md A6), so the self-check's
design-pack companion applies. Per this repo's own precedent (AB's ruling on touchdown 0008,
carried in CLAUDE.md), the design-pack itself (icm-final, outside the repos) is acknowledged
out of date and not touched by ordinary jobs; the living companion for this specific coupling is
the estate check recorded here and in DESIGN.md A8 -- domain-wisdom-agent confirmed still
carrying the trap, youtube-pov confirmed carrying a different mechanism entirely, and porting
the fix back to domain-wisdom-agent left as AB's deliberate later act, not done as a side effect
of this job (out of scope: it is a different repo).

**The dry-run proof.** Built in `_tmp`-equivalent scratch, never in this repo's own record
tree (CC_TOUCHDOWN.md's rule against a scratch file taking a touchdown-pattern name in this
repo's `pending/`/`completed/` was honoured by using an entirely separate throwaway clone
instead): `git clone --local` this repo into an isolated scratch directory, removed its `origin`
remote (so no push could ever reach the real repo or any other), copied the fixed
`commit_safe.py` over the clone's checked-out copy (the fix exists only in this job's working
tree, uncommitted, until the close below), authored a schema-conformant scratch touchdown
(`slug: dryrun-proof`) with the literal `job: NNNN` placeholder in both the filename and the
frontmatter, exactly as the trap requires to reproduce. Ran `commit_safe.py --pick-number` on it
inside the clone: output confirmed `picked touchdown number 0014 (0014_dryrun-proof_2026-08-05.md,
frontmatter job: field synced)`, and the resulting file's frontmatter read `job: 0014` matching
the filename. Then ran the REAL `sweep.py --apply` inside the same clone (not a stub validator):
`valid against td_v2`, `Quarantine: none`, moved to `completed/`, `quarantined=0 applied=0` in
the digest (the "applied=0" counts verified map edits and gap-facts, unrelated to this touchdown
landing; the move to completed/ is the commit the sweep made). The clone was then deleted. This
is the "validating first time" proof the work order asked for, run before touching the real
repo at all.

**No CONTEXT.md gap hit.** The three CONTEXT.md files named in the work order
(`_orchestration/CONTEXT.md`, `_chronicle/prompts/CONTEXT.md`, `02_build/CONTEXT.md`) were
sufficient; the co-edit protocol and the zone rules for loop code and for `02_build/output/`
were both stated plainly.

Grade: 5
Prompt quality: yes, unaided. The work order named the exact verify bar (own close must land
first time, no quarantine) and pre-supplied the fix direction implicitly by pointing at the
diagnosis touchdown 0013 already carries its own proposal; nothing had to be invented.

## Correction passes
none

## Any errors
none

## Map flags
none

## Gaps
none

## Resolutions
- resolves: 8c40103042c8 -- `02_build/output/BUILD.md`'s v1.1 stacking observation gap: closed
  by the dated append-only correction added this job (evidence: `03_train/output/runs/
  2026-08-05_smoke-ladder/supplementary/stacker-sweep.json` and that run's `SUMMARY.md`, as
  already cited by the raising touchdown 0013); `CHANGELOG.md` 0007 records the gate decision
  that no retuning follows.
- resolves: fadcdf4fcb7a -- the same underlying BUILD.md stacking observation, raised earlier by
  touchdown 0011 and reclassified product-zone by 0012; closed by the same correction as
  8c40103042c8 above (both name the identical fact).
- resolves: 1f5e810ceed8 -- touchdown 0013's proposal to close the touchdown-number trap: folded
  as option (a) from that proposal, implemented in `commit_safe.py` this job; `CHANGELOG.md`
  0006 is the co-edit record.

## Proposals
```
Port the same fix (a `--pick-number`-time frontmatter job: sync) back to
domain-wisdom-agent's commit_safe.py. Confirmed still latent there this job (read-only check):
the unpatched rename exists unchanged, and it has only avoided firing because that repo's jobs
have, by convention rather than by any enforced rule, always pre-guessed the correct number for
both the filename and the frontmatter rather than using the literal NNNN placeholder the
numbering-rule prose describes. A job there that follows the documented convention literally,
the way this repo's 0011 and 0013 did, will hit the identical quarantine. This is AB's call
(cross-repo, out of this job's scope) and the design-pack (icm-final) is the natural place to
record the port once made.
```

## _tmp outputs
- none

## Work order verbatim
```
Model: sonnet | Effort: extended thinking | Rationale: small surface,
but it edits estate-shared loop code and must diagnose before fixing.

## Task
Fix the touchdown-number placeholder trap in the closing tool, append
the dated correction to BUILD.md killing the false stacking signal,
and record the 03a gate verdict. AB approved all three on 2026-08-05.

## In scope
- _orchestration/loop/commit_safe.py -- the fix.
- _orchestration/CC_TOUchDOWN.md ONLY if the diagnosis shows the
  template half should change instead of or as well as the tool.
- 02_build/output/BUILD.md -- append-only dated correction.
- _infrastructure/DESIGN.md, _infrastructure/CHANGELOG.md -- the B11
  co-edits for the loop-code change, plus a decision entry recording
  the gate verdict.

## Out of scope
- 03_train/ -- nothing; no retuning anywhere (that IS the gate verdict).
- No other loop code, no schema changes.

## CONTEXT to read
- _orchestration/CONTEXT.md
- _chronicle/prompts/CONTEXT.md
- 02_build/CONTEXT.md

## Constraints
- Diagnose before fixing: reproduce the trap (dry-run, not a real
  record), identify exactly which placeholder field(s) survive the
  rename, and only then patch. The fix: when --pick-number assigns
  the number, rewrite the placeholder in the file's frontmatter in
  the same held operation as the rename. Scope the replacement to
  the frontmatter field(s) the diagnosis names, never a blind
  whole-body find-and-replace.
- Estate check: read the sibling copies in
  C:\Users\alexa\github_repos\domain-wisdom-agent and
  C:\Users\alexa\github_repos\youtube-pov (read-only, out of repo
  scope to edit). State in the touchdown whether they carry the same
  latent trap, so AB can port the fix back deliberately.
- The touchdown must carry, in plain English, for AB's future
  reading: what the trap was, why it existed (which two components
  disagreed), why it fired in this repo first, whether it is latent
  in the estate, and what the fix changes. This reasoning is a
  deliverable, not a nicety.
- commit_safe.py is estate-shared loop code: per the self-check,
  state in the touchdown how the design-pack coupling was handled
  (icm-final is acknowledged out of date; the port-back note is the
  living companion), rather than silently skipping it.

## Do
1. Reproduce, diagnose, fix commit_safe.py as above.
2. Prove it: a scripted dry-run close where the picked number lands
   in BOTH filename and frontmatter, validating first time.
3. Append to BUILD.md, dated: the ~5,300 same-column stacking
   observation did not survive measurement (03a, touchdown 0013:
   strict stacking median 24, spill median 1,626, the 5,300 game was
   steered); no retuning follows from it.
4. CHANGELOG decision entry: 03a gate passed 2026-08-05, ladder
   healthy, stacking resolved as false signal, throughput accepted at
   820 games/min serial, no game retuning; training proceeds on the
   game as it stands.

## Verify (before you close)
- The dry-run proof ran and is described in the touchdown.
- Your OWN close lands without quarantine, first time. That is the
  live proof of the fix.
- BUILD.md correction is append-only; the original text stands above
  it untouched.
```
