# CONTEXT.md - local rules for `_orchestration/`

You are in the operating-docs folder. It is mixed on purpose: four kinds of file, four write
disciplines. The ways a fresh agent goes wrong here, in order of likelihood:

1. **Canon docs are human-gated** (`CC_OPERATIONS.md`, `OPERATIONS_BEE.md`, `CC_TOUCHDOWN.md`,
   `LOOP_PROMPT.md`, `TEST_MODE.md`; this repo carries no `ORCHESTRATOR_PROFILE.md`, and the
   sweep notes an absent canon file rather than failing). Edit only when the work order says so.
   A CC job may fix a plain factual error inline; a rule or convention change is flagged to AB,
   never made unilaterally. These docs condition every bee and every CC job, the sweep
   hash-guards the NORMS-B7-named set (canon-changed), and the prime assembler
   (`_prime/src/prime.py`) bundles the contracts into every bee spawn, so an edit here changes
   every future session.
2. **Maps (`maps/`) are never edited directly.** No maps yet: the folder holds only its
   `.gitkeep`, because maps are tier-gated and this tree is still small enough to navigate bare.
   No new map enters without AB naming it first, and never a wholesale rewrite. When one exists:
   a job flags the change in its touchdown (exact current text, exact replacement, path:line
   evidence); the review verifies it against disk; the sweep applies it under the lock (norm
   B5). A map whose first line is a generated stamp is a sweep view and never a flag target.
3. **Views (`views/`) are regenerated wholesale by the sweep.** Editing one is pointless: the
   next run overwrites it. Read them; never write them.
4. **Loop code (`loop/`) is fast-speed code.** `sweep.py` and `deadman.py` are their own
   description; change them by ordinary code work (under the human gate and the work-order
   self-check in `CLAUDE.md`), never by editing prose about them. `STATUS.md`, `ALARMS.md` and
   `state.json` are the loop's instruments, written only by their own tools; the one named
   exception is the standard B12 answer line a job appends to ALARMS.md when AB hands it a
   named clearance.

**Co-edit protocol [D34].** A job that edits a canon or operations file updates
`_infrastructure/DESIGN.md` to match and adds a `_infrastructure/CHANGELOG.md` entry in the
same act (norm B11). The CHANGELOG entry is the enforced half; the DESIGN.md update is
discipline, cheap to get wrong because nothing reads DESIGN.md as law. One non-authoritative
explanation is the whole duty.
