# DESIGN.md - how and why the infrastructure works (non-authoritative)

Nothing in this file is law. It is the onboarding answer: read it to understand how this system is
shaped and why, then work from the enforced surfaces. Where anything here disagrees with NORMS.md,
the schema or the code, they win and this file is simply stale [brief §4; D33]. That is the whole
point of it being here: one non-authoritative explanation is allowed to lag, because its being wrong
costs a tidy-up, never a lie. This replaces the old maintained-and-authoritative INFRASTRUCTURE.md
whose 582 lines rotted precisely because everything read it as truth [D33].

**This copy is the shared, canonical DESIGN.md** carried in the generic starter. It states only what
is true of every project on this system. Anything project-specific (a project's own maps, its grown
norms, its retired surfaces, its product identifiers, its migration history) is deliberately NOT
here; it lands in that project's own DESIGN.md at migration. What is out of this file is listed at
the end.

Currency: this file is kept fresh at edit time by the co-edit protocol (any canon or operations edit
updates DESIGN.md in the same act [D34]) and its drift is hunted by the deliberately-fired
adversarial audit, never by the loop, which cannot judge whether prose still describes the system
[D35]. So it can lag between those, cheaply and on purpose.

---

## 1. The one rule

A thing stays true only if something checks it. Every choice below is that rule applied somewhere.
"Cannot drift" means "cannot drift silently": a value is either **regenerated** (no independent state
to rot), **checked** (fails loud if wrong), **append-only** (a dated fact that never claims to be
current), or **explicitly non-authoritative** (its being wrong costs nothing). Stop grading, start
checking: a grade is an opinion, a check is a fact [brief §0].

## 2. The two real things

**Touchdowns** (`_chronicle/prompts/`) are the logbook: one immutable file per Claude Code job,
stating facts, doing no thinking, each carrying its verbatim prompt. They are the single source of
truth; everything else is printed from them or is a small tool. Since 2026-07-21 the template
implements the verbatim-prompt record: a final Work order verbatim section carries the full order,
fenced (CC_TOUCHDOWN.md).

**The `_infrastructure/` folder** is the rulebook: what the system is and the rules it enforces. This
is what you copy to a new project to hand it the system.

Everything else is a **view** (derived, disposable), an **instrument** (the loop's own tools), or a
**record** (append-only history) [brief §1].

## 3. The five folders

Underscore-prefixed to sort to the top; everything outside them is project-specific [D24]:

- **`_infrastructure/`** - the rulebook (§5).
- **`_orchestration/`** - operating docs and maps: the work-order and bee contracts, the
  standing-window contract, the loop's code, `maps/` and `views/`. This merge kills the old
  canonical/coordination CONTEXT.md confusion.
- **`_chronicle/`** - all records, one subfolder per actor: `sessions/` (chat journals, hand-dragged),
  `prompts/` (touchdowns, auto-numbered), `traces/` (the loop's own frozen log) [D25].
- **`_prime/`** - everything prime: the assembler in `_prime/src/` and the single generated
  `PRIME_bee.md` bundle, stamped so the bundle cannot drift from its sources [D59]; the sweep
  reassembles it at each run's end, so a stale bundle self-heals [D68].
- **`_tmp/`** - scratch, gitignored, never a home for a deliverable.

CONTEXT.md is placed per folder ONLY where a fresh sub-agent would err without local rules; each one
is a surface that could rot, so each must earn itself [brief §2]. The generic starter has three, plus
the root CLAUDE.md router (FOLDER_TREE.md §3).

## 4. Traces are frozen photographs

A trace is written once per loop run and never touched again [D27]. It records what that run saw and
did and may embed snapshots of views as they stood. Traces are the one licensed place for "store
whatever, quality optional", because they are frozen and read only as training data. No generator
ever parses a trace as an input; the loop's live baselines live in an owned state file, not the trace
[D43]. This is the home for depth and accumulation; the rulebook is not.

## 5. The four infrastructure files, four disciplines

Deliberately thin. Thin is the win. The pressure to add a big store-everything file is the exact
pressure that built the 582-line INFRASTRUCTURE.md that rotted and the 132 KB performance log nothing
ever read. Depth belongs in `traces/` (frozen, safe) and in the loop's own code (behaviour cannot
drift from itself), never here [brief §4].

- **INFRASTRUCTURE.md** - the front door: a small hand index plus an auto-generated current-state
  snapshot (locations, counts, canon hashes). The snapshot block is machine-written by the sweep;
  never hand-edit inside its markers.
- **NORMS.md** - the enforced rules, and only those. A rule lives here only with its check; if it
  cannot be checked it is a comment, and comments go here in DESIGN.md. NORMS grows only by
  promotion from the record, never by authorship from outside [D28].
- **CHANGELOG.md** - a dated, append-only list of what changed. The one maintained file that cannot
  rot, because it only grows.
- **DESIGN.md** (this file) - the why and the how. Explicitly non-authoritative; allowed to lag.

No foundation.md, no harness.md (a prose copy of code drifts from the code; the code is the
description), no store-everything file.

## 6. The loop (the sweep, the review, the deadman)

One umbrella, three parts, two clocks [brief §5; D41]. Full mechanics are in the loop's own code and
in the design-time LOOP_SPEC; the shape:

- **The sweep** is a deterministic script that fires at every job close and never thinks. It
  validates each touchdown against its versioned schema (malformed goes to quarantine, never
  dropped), routes the facts, applies the verifiable factual gaps and the review's verified map
  edits under a single-writer lock, regenerates every view wholesale, writes one frozen trace, moves
  the touchdown to `completed/` (the commit point), stages any new session journal dropped into
  `_chronicle/sessions/` into the same commit [D69], records whether a review is warranted, and
  reassembles the gitignored prime bundle last, so the on-disk bundle always stamps current state
  [D68]. It never fires the review [D41].
- **The review** is a strong-model call that runs in a standing window every ~30 minutes when a
  review is warranted, or on a direct ask. It is a third party: fresh context, no stake in the work
  it grades, reading and checking against disk [D42]. It is deliberately narrow: it touches only
  what it is handed (the queued errors, flags, gaps and candidates), and it never edits a file,
  because the sweep writes the bytes of every verified edit [D45]. It resolves errors, verifies map
  flags and writes the verified edit as a fact, and drafts norm candidates, each with its check and
  a demonstrated failing case. Quarantine is human-facing, not review-facing: leaving quarantine is
  a human act, and no tool, the review included, empties it. It PROPOSES; canon changes stop at the
  human gate.
- **The deadman** is a dumb clock that runs each standing-window cycle. Silent when healthy, it nags
  to its own alarm file on breach (unswept touchdown, silent loop, quarantine, stale queue, stale
  lock, stale liveness). It detects silence; it never judges [D52].

The standing window itself runs from one operational contract, `_orchestration/LOOP_PROMPT.md`: it
carries the window sequence (the deadman checks, then the review when warranted, then the desk
summary) and the review's standing work order in full. It is operational, not a description of the
sweep or deadman internals, which would only drift from the code, and it is the design-time
LOOP_SPEC's shipping counterpart, authored at migration [D60].

The loop's own bookkeeping (map and canon hashes, the last-review and outstanding-handoff markers)
lives in one owned state file, written only by the sweep under the lock: an instrument, not a view,
a trace or canon [D43]. On a non-default branch the sweep runs dry only, and touchdowns commit to the
default branch, so branches never fight the loop [D55]. The open-errors view renders each open
error's plain-English detail body under its summary line, so a stale error reads cold from the view
alone: the display half of the error legibility contract, whose writing half is the touchdown's Any
errors rule [D83, D87].

**Commit discipline** (the airtight save, B1, 2026-07-22): every write to the record happens
through one sanctioned path, `_orchestration/loop/commit_safe.py`, in one held operation: acquire
the repo lock, pick the next touchdown number where asked, stage the caller's explicitly named
paths only (broad stages, `-A`, `.`, globs and directories, are refused loudly), commit with the
`Commit-Safe: yes` trailer, push, release. The lock is repo-local and single: the sweep imports
the same acquire and release, so one lockfile format and one recovery pattern exist (PID and
timestamp in the lockfile; a dead holder's lock stolen loudly; a five-minute TTL backstop because
PIDs recycle; a trap releasing on ordinary crashes; the waiting side timing out loudly rather
than freezing silently). Work stays parallel and only the seconds of the save serialise: lock the
save, never the work. The ownership invariant rides with the path, because the lock guards the
index, not the files: a job stages only paths it exclusively owns, and shared surfaces (the
common maps, the views, the loop's instruments) are sweep-owned, never job-staged. Enforcement is
detection over prevention: the wrapper makes bypass rare, and the sweep's trailer audit
(canon-changed's sibling) scans every commit new since its state-recorded baseline that touches
`_chronicle/` and raises `untrailed-record-commit` for any lacking the trailer, so a bare commit
to the record is a visible event, never a silent one. The sweep's own commit and push sit inside
the same held lock. Worktrees, branch-per-job and accept-the-race were rejected for this
(the pack ledger records why, D92-D95); GitHub branch protection on the record branch is the
rollout-time server-side complement.

**Queued vs handed** (B2, 2026-07-22): the gap queue separates what the review can close
from what it can only witness. Every queued gap item carries a route class, review-closable,
human-gated or product-zone, classified mechanically where a path is derivable from the
entry (a canon, norm-B7-hashed, file: human-gated; a product-zone path, 01_ to 04_ or `_config/`:
product-zone; anything else review-closable, the safe default), with the review licensed to
reclassify by a recorded `reroutes:` fact whose reasoning is rendered in the queue entry,
never silent. Only review-closable items count toward the review-warranted verdict;
human-gated and product-zone items ride the handoff and gap-queue.md as a clearly separated
listed-not-counted section, nothing hidden, nothing re-counted, and the deadman's gap-queue
staleness clock runs on that listed section (the view stamp's `oldest-listed:` token), the
backlog only AB can drain. This closes the observed non-convergence where items the review
could never close held the verdict red every cycle and buried genuinely new arrivals in
known noise (the pack ledger records the decision, D96).

**Open-error ageing** (B2, 2026-07-22): an open error older than the ageing threshold
(7 days, a named tunable in sweep.py, between the deadman's 3-day queue nag and the 18-day
breach observed live) routes itself onto the review handoff with its age stated, so stale
errors are re-examined on a rhythm instead of never. The review re-verifies against disk
and either closes the error with evidence or re-states it: a resolution closing the old id
plus a fresh entry naming the current blocker, whose date restarts the clock from the
re-statement, so a re-stated error does not re-route every cycle. Aged errors are
review-closable for re-examination even where the underlying fix is human-gated (the
re-statement is the review's work, the fix is not), and error entries are not gap items,
so the queued-vs-handed split above is untouched. No new state is kept; the mechanism is
entirely the existing corpus facts (the pack ledger records the decision, D97).

**Maintenance absorption** (norm B12): quarantine's clearance stays a human decision, and its
execution is absorbed by the next job. When AB states he has judged a named quarantined file safe
to clear (or hands over a similar small chore: a stray-file removal, an ALARMS answer), the next
job executes the clearing for the named file(s) only, appends the standard answer line to
ALARMS.md, and records it in its touchdown's Maintenance section; AB never performs the file
operations or edits ALARMS.md by hand. The hard boundary rides with the pattern: a job never
inspects quarantine and clears on its own judgement, acts only on a file AB has explicitly named
and given a reason for, and leaves a non-empty quarantine AB has said nothing about untouched, the
deadman nagging as normal, so the human checkpoint quarantine exists for is not weakened [D89].
Migrator steps, because the pack carries no template for either file: at migration the project's
CC_TOUCHDOWN.md gains the optional Maintenance section (template-only, riding the schema's
allow_extra) and its OPERATIONS_BEE.md the awareness pointer in its work-order authoring rules.

The **adversarial audit** is separate from the loop: summoned, expensive, fresh eyes, told to break
the system including the "passes every check, still wrong" class [D30]. The alarm stays cheap, the
auditor stays deep.

## 7. Maps - a verified cache

A map is a claim about the live tree whose truth comes from the disk, verified by a deliberate act:
not regenerable from touchdowns, not maintained prose [D31]. Two classes. **Generated-class** maps
(the folder tree and the like) are regenerated by the sweep as views, stamped, and are never flag
targets [D53]. **Semantic-class** maps (data, storage, features) change only by flag-then-verify: a
job flags a line (current text, replacement, path:line evidence), the review verifies against disk
and writes the verified edit, the sweep applies it under the lock [D45]. The run that applies a
verified edit re-baselines that map's hash in the owned state file to the post-apply bytes in the
same locked run, so the provenance check never false-fires on a legitimately applied edit, while a
map changed with no verified-edit record in any run still raises its anomaly [D86]. Maps are
tier-gated: a map is added only when a part of the tree is too big to navigate without one, so some
projects have five and some have none, correctly.

## 8. Errors, in four classes by who can catch them

The design does not try to make a model spot its own mistakes; it sorts errors by who can actually
catch each and grows the catchable pile [brief §7]:

1. **Script-catchable** (test failed, malformed, check failed): caught mechanically, instantly. The
   strategy is to move as much as possible into this pile by turning rules into checks.
2. **Job-observed** (a runtime error, a confusion): only the job saw it, so it records the plain
   observation (fact) and its guess at why (opinion, kept separate because that is where a model
   confabulates). Trust the fact.
3. **Cross-record** (a gap flagged twice, a rule that never fires): visible only across many
   touchdowns; the loop finds these.
4. **Uncatchable** (looks reasonable, passes every check, is wrong): no automated detector exists.
   Mitigated, not detected: keep the pile small, stop it spreading (nothing wrong enters the rulebook
   without a check or the human), and route it to the human gate and the adversarial audit.

An error travels as fact-plus-opinion, marked open; the sweep files it into the open-errors view; a
later job greps that view before diagnosing; the review resolves it with disk-checked evidence,
appended as a new fact. Nothing is ever erased; a fixed error leaves the open list only because a
later record records the fix.

**Error legibility.** An error entry states, in plain English, what was being attempted, what
actually happened, and what it blocks or why it matters, never a bare symptom line, with the
observation core kept as fact and the causal reading as testimony, kept apart. The reason is part
of the rule: an error must be legible to someone who was not there and returns to it cold, because
the open-errors view shows these entries to the operator [D83].

## 9. Context and navigation

Inbound, in order: the prime bundle (assembled at spawn; replaces the Queen [D23]); CLAUDE.md (root
router: identity, standing rules, known traps); the working folder's CONTEXT.md; the maps and the
open-errors view. The prime ends with "here is the folder CONTEXT.md; ask for anything else you
need", so an agent starts with essentials and pulls the rest on demand [brief §8].

Outbound: a `gap` note written inline as it happens. A declared `gap-fact:` whose every substitution
the sweep can verify is applied immediately (to a CONTEXT.md only); everything else is a `gap:` that
queues for the review [D46]. What one job emits becomes what the next finds, and no file in that loop
is kept true by hand.

Handover: when a bee's context fills and it hands off to the next bee, it writes two distinct things.
Its journal is dragged into `_chronicle/sessions/` like any session record; the sweep adopts the
new file into its next run's commit, staged by explicit path [D69]. The handover itself is
copied and pasted straight to the next bee; it is never a file committed to the repo, so it is never
an estate record, and there is no `HANDOVER.md` in the tree [D61]. The only handover-related file is
the reusable template that shapes the handover, project-specific canon at the `_chronicle` root
beside its record subfolders [D62], indexed by the front door.

## 10. The tier ladder

Machinery arrives only when its absence hurts [brief §9]. Tier 0: CLAUDE.md and CONTEXT.md,
navigation only. Tier 1: touchdowns and the validator (git becomes a floor here). Tier 2: the sweep
at job close, the views, the trace, the deadman. Tier 3: the review on triggers. Maps and the primes
are added per need, not by default. A project given machinery it has not needed rots; a project that
climbs as pain arrives stays clean. New projects are seeded by copying this starter into an existing
active project's neighbourhood and building a bespoke copy; there is no fleet layer [D37].

## 11. Why it is shaped this way

**Why the rulebook is thin.** See §5: depth rots when it is maintained and authoritative. It is safe
only where it is frozen (traces) or is itself the behaviour (code).

**Why promotion, not authorship.** Norms grow from what the system has already learned: a trap is
hit, jobs flag it, the review proposes the rule with its check and a demonstrated failing case, the
human approves [D28, D49]. A rule written from outside authority, without a trap behind it and a
check beside it, is exactly the kind that never fires and quietly rots. The estate's history has a
14-candidate queue that was never drained because draining depended on someone remembering; the
promotion queue's age is now a watched metric, and a candidate is not closed until its rule is
actually present in NORMS.md [D49].

**Why checks, not grades.** A grade is an opinion and opinions rot; a check is a fact and facts hold.
Every anti-drift mechanism here is a check somewhere, or it is honestly labelled non-authoritative.

**Why nothing is authoritative twice.** The old co-edit protocol kept several authoritative copies in
step with each other and failed. This design keeps one non-authoritative explanation (this file) in
step with one reality, and its failure is cheap [D34, D35].

## 12. Where the canon lives, and the co-edit protocol

The enforced rules are in NORMS.md, each with its check. Facts about what changed are in CHANGELOG.md,
append-only. Per-project reasoning lives in this DESIGN.md; there is no per-project decisions ledger,
because future decisions are CHANGELOG entries [D36]. The estate-level "why the system is shaped this
way" reference is the design pack, continuing append-only outside the repos [D36].

The operations canon (the work-order and bee contracts, the standing-window contract LOOP_PROMPT.md,
and the project's other operating docs) lives in `_orchestration/`, human-gated and
CHANGELOG-entried like the rulebook [D60, B7]. The two record-shaping templates, the handover
template and the session-journal template, live at the `_chronicle` root beside its record
subfolders, human-gated and CHANGELOG-entried the same way [D62]. The prime assembler is code, in
`_prime/src/`, beside its generated bundle [D59].

Named rather than left to "other operating docs", because a classification a reader has to infer is
one a job will get wrong: the four templates `_orchestration/ORCHESTRATOR_PROFILE.md`,
`_orchestration/TEST_MODE.md`, `_chronicle/HANDOVER_PROMPT.md` and `_chronicle/LOG_PROMPT.md` are
human-gated canon, named in NORMS B7 and hash-guarded by the canon-changed tripwire alongside the
contracts [D85, D62]. A project that carries none of a given file simply has no such file to guard.
Each takes the human gate and a CHANGELOG.md entry in the same act like the rest of the canon list,
and a per-job zone ruling that licenses an ungated edit to one of them is a one-off for that job,
never a standing reclassification [D88].

The co-edit protocol: any work order that edits a canon or operations file must, in the same act,
update DESIGN.md to match and add a CHANGELOG.md entry (NORMS B11, D34). The CHANGELOG line is the
enforced half (NORMS B7 raises an anomaly on a canon change with no matching entry); the DESIGN.md
update is discipline, and its failure is cheap. "Matching entry" means a CURRENT entry: the sweep
matches the changed canon file against CHANGELOG lines added since its state-recorded baseline
(an entry dated the run's date when no usable baseline exists), never against a historical
mention, so the B7 tripwire cannot be satisfied by old history [D71]. The entry-header
recognition covers both live formats, the dashed dated line and the numbered
`## NNNN - YYYY-MM-DD -` header, so a compliant change recorded in the CHANGELOG's own format
is never raised as a false anomaly when the fallback runs [D91].

**Zones and edit rules, as an index.** The actor-facing surfaces (each project's CLAUDE.md router
and its work-order template's Constraints) carry a compact index of who may edit what, pointing at
the norms by number rather than restating them: canon (B7, human-gated), records (B3, immutable),
generated files including views and generated maps (B4, never hand-edited), semantic maps (B5,
flagged in the touchdown, never edited directly), and the product zone (product jobs edit it; the
loop never touches it). A cross-venture or shared file gets deliberate handling regardless of
zone, and an unclear zone means stop and ask rather than analogise. The index exists because zone
confusion strikes at runtime, when a job meets a file its work order never classified [D84].

**The close ritual and its homes.** Every Claude Code job closes the same way: deliverables
committed by explicit path, the touchdown written to `_chronicle/prompts/pending/`, the sweep run.
The operative statement of this ritual is the root CLAUDE.md's "How every job closes" section,
which every job auto-reads, so work orders do not respell it; the binding contract remains
`_orchestration/CC_OPERATIONS.md`, kept in step by the co-edit protocol, and the deadman backstops
a missed close [D66].

**The work-order self-check.** The close ritual's job-start counterpart: before acting, a job
inspects its own work order, and if the order edits any canon file, any loop code or an operations
doc, it confirms the order also carries its design-pack companion, its DESIGN.md co-edit and its
CHANGELOG.md entry, raising a missing coupling as a numbered question rather than patching the
omission silently. The check lives as a "Before you act" section of the root CLAUDE.md router,
which every job auto-reads; [issued] class, existing precisely for the couplings no script
verifies, the CHANGELOG half being already caught mechanically by canon-changed (B7). Its stated
boundary teaches the right reflex: a sweep.py change needs no LOOP_PROMPT.md edit, LOOP_PROMPT.md
being operational-not-descriptive [D60] and co-edited only when the window sequence or the
desk-summary format changes. Routers are morphed per project, so each project's CLAUDE.md gains
the section at migration [D75].

**Test mode.** A per-job diagnostic switch, defined in `_orchestration/TEST_MODE.md`: a work order
may set `test mode = true`, and the job then additionally writes a verbose diagnostic journal to
the gitignored `_chronicle/mode-test/`. Off by default, and always additive: it never substitutes
for the touchdown or the sweep. The journal is diagnostic scratch, not an estate record, which is
why its folder is ignored rather than tracked [D65].

## 13. What is deliberately NOT in this shared file

This starter DESIGN.md holds only the canonical design shared by every project. The following are
project-specific and land in a project's own DESIGN.md at migration, never here:

- a project's actual maps, and which tier it sits at;
- its grown NORMS layer (promoted traps particular to it);
- its retired surfaces and their histories (a Queen, a LIVE_STATE, per-doc changelogs, an
  AUTONOMY-TEST-LOG, and the like);
- its product-critical identifiers and where they are homed;
- its divergent operating docs (extra actors, an orchestrator profile, a scout, a handover template);
- its credential, backup and push policies;
- its own migration record.

If you are reading a project's DESIGN.md and want one of these, it is in that project's copy, appended
below this canonical content at migration. If you want the estate-level history and reasoning, it is
in the design pack outside the repos [D36].

---

# Project appendix -- number-block-sim

Landed at seeding (job seed-icm-infrastructure, 2026-08-05). Everything below is project-specific,
per section 13 of the shared layer above. This repo is a blank-slate seeding, not a migration:
there was no corpus to move, no legacy shell to dissolve and no retirements, so unlike its
siblings this appendix records no retired surfaces. Nothing here describes current state; the
generated snapshot in `_infrastructure/INFRASTRUCTURE.md` regenerates that. Like everything in
this file, this appendix is non-authoritative and allowed to lag.

## A1. Tier

Tier 3 from day one: touchdowns and the validator, the sweep with its views and traces, the
deadman, and the review triggers all landed together at seeding, copied from the proven siblings
rather than grown rung by rung. The third repo onto the frozen five-folder design, after
domain-wisdom-agent (first) and youtube-pov (second). The tier ladder's copy-in-rungs rule was
consciously set aside on AB's instruction: the machinery is proven, and seeding it whole costs
less than re-earning each rung.

## A2. The maps

None. Maps are tier-gated: one is added only when a part of the tree is too big to navigate
without one, named by AB first, and this repo starts small enough to navigate bare. The
snapshot's maps line stays empty until that changes; the prime assembler prints "none yet".

## A3. The grown NORMS layer

Two entries at seeding, both inherited estate promotions whose checks arrived inside the copied
loop code, so each norm and its check landed together (the youtube-pov G1 precedent): G1, a
stated touchdown count is a count of filenames (promoted in domain-wisdom-agent, 2026-07-21),
and G2, the canon-changed fallback recognises the live CHANGELOG's entry-header format (promoted
in youtube-pov, 2026-07-23). The layer grows further only by this repo's own trap-hit promotions;
a number-block-shaped candidate stays a candidate until its trap-hit path completes.

## A4. The cast

Two actors and the loop, no Queen, no Scout. The **worker bee** (a claude.ai web chat, blind, no
filesystem access) designs work and writes the Claude Code work orders. The **Claude Code job**
(local, sighted) is the actor that writes files. AB is the coordinator and the human gate. The
loop (sweep, standing-window review, deadman) is machinery, not a third actor. Naming:
`nbs-[<role>]-1.0-<slug>`, roles `[wor]` and `[cc]`. The Scout is youtube-pov's divergence, not
carried here; domain-wisdom-agent is the two-actor precedent this repo follows.

## A5. What this system is

A falling number-block matching game, built from scratch, plus an AI agent trained to play it
optimally. Blocks fall into a grid; equal numbers merge and double; three or more adjacent equal
blocks merge to a higher multiple; low-value blocks stranded at the bottom are the failure mode.
The experiment is to find optimal play and write up the findings. Board dimensions, spawn
distribution, exact merge rules and the scoring equation are all TBD, decided in a later session
and recorded in `01_rules/` when they land.

The product zone is ICM-shaped: numbered stages `01_rules/` (the game's rule spec), `02_build/`
(the game and simulation harness), `03_train/` (agent training and simulation runs), `04_publish/`
(the write-up), plus `_config/` (shared reference material across stages). The layer mapping:
`CLAUDE.md` is Layer 0, the router; the root `CONTEXT.md` is Layer 1, task routing across the
zone; each stage's CONTEXT.md is Layer 2, an Inputs / Process / Outputs contract; `references/`
and `_config/` are Layer 3, stable across runs; `output/` is Layer 4, per-run artefacts.

Two deliberate adaptations to plain ICM. First, `03_train/` is not a single pass with one review
gate: it is many simulation runs plus iteration, so its `output/` carries `runs/<run-id>/` for
raw results (the investigation layer, allowed to accumulate) and `_FINDINGS.md` as the verdict
layer that `04_publish/` reads, lifted from youtube-pov's analysis funnel (`data/analysis/` and
its `_FINDINGS.md` register there). Second, touchdowns and stage outputs are two separate record
systems and are never merged: a touchdown is the per-job logbook entry, immutable, in
`_chronicle/prompts/`; a stage output is the artefact of the work, in that stage's `output/`.
The root CONTEXT.md states this so no future job conflates them.

## A6. The seeding record

Seeded 2026-08-05 by the job seed-icm-infrastructure (bee nbs-wor-1.0-z), in staged acts, each
its own commit by explicit path; CHANGELOG.md entry 0001 names the acts and commits. The loop
code and schemas were copied from domain-wisdom-agent's proven build, the estate's most mature
(commit-safe save path, the queued-vs-handed gap split D96, open-error ageing D97), with one
recorded adaptation: `PRODUCT_ZONE_RE` and its comment repointed from that repo's `01_` to `06_`
zones to this repo's `01_` to `04_` plus `_config/`. The operating docs were chosen per file for
maturity across the two siblings where they disagreed; the shared DESIGN.md body above is
youtube-pov's newer pack baseline with domain-wisdom-agent's three post-migration loop passages
(commit discipline, queued vs handed, open-error ageing) merged in, since they describe the loop
this repo actually ships. Not carried: OPERATIONS_SCOUT.md (no Scout here),
ORCHESTRATOR_PROFILE.md (project-authored divergent content; norm B7 tolerates the absent canon
file per D85, and porting one is a later deliberate act), the siblings' maps, grown norms beyond
the two estate promotions, migration appendices and product zones.

## A7. What is deliberately not built yet

The standing guardrail list lives in `CLAUDE.md` ("What we are NOT building yet"), not here; one
home, no duplicate to rot.
