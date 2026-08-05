# CLAUDE.md -- number-block-sim

Layer 0 router. Where you are, where to go, who may edit what, what to check before you act, how
to close, what is off-limits. Auto-read by Claude Code at the start of every job. The
infrastructure front door is `_infrastructure/INFRASTRUCTURE.md`: the four-file index and the
generated snapshot (locations and counts, machine-written by the sweep). The live state is
`_orchestration/loop/STATUS.md` (newest line) and `_orchestration/views/open-errors.md`. Read
those next.

British English, no em-dashes, no exclamation marks.

## What this is

A falling number-block matching game, built from scratch, plus an AI agent trained to play it
optimally. The game mechanics (board and flow, spawning, merging, the game score, game over) are
decided and locked at v1.0 in `01_rules/output/RULES.md`; this router does not restate them. The
experiment is to find optimal play and write up the findings. This workspace holds the
coordination infrastructure (the portable ICM operating system, two-actor form) and the four-stage
product zone. The why behind the infrastructure is `_infrastructure/DESIGN.md`.

## The folders

The folder inventory is the generated snapshot in `_infrastructure/INFRASTRUCTURE.md`,
machine-written by the sweep on every run. Read it there; it is never duplicated here. The
machinery homes: `_orchestration/` (operating docs, maps, views, the loop), `_chronicle/` (all
records), `_infrastructure/` (the rulebook), `_prime/` (the assembled prime), `_tmp/` (scratch,
gitignored). The product zone is the ICM stages `01_rules/`, `02_build/`, `03_train/`,
`04_publish/` plus `_config/`; its task routing is the root `CONTEXT.md` (Layer 1), and each
stage's CONTEXT.md is that stage's working contract, read before touching the folder.

## Zones and edit rules

An index, not a restatement; the norms themselves live in `_infrastructure/NORMS.md`. Canon:
norm B7, human-gated. Records: B3, immutable. Generated files, views and generated maps
included: B4, never hand-edit. Semantic maps: B5, flag in the touchdown, never edit directly.
The product zone `01_rules/` to `04_publish/` plus `_config/`: product jobs edit it; the loop
never touches it. A cross-venture or shared file gets deliberate handling regardless of zone;
when a file's zone or editability is unclear, STOP and ask rather than analogising.

## Before you act: the work-order self-check

Read at job start; [issued] class. If a work order edits any canon file (NORMS.md, CLAUDE.md,
CC_OPERATIONS.md, OPERATIONS_BEE.md, CC_TOUCHDOWN.md, LOOP_PROMPT.md, TEST_MODE.md, the two
`_chronicle/` templates, the schema files), any loop code (sweep.py, deadman.py, commit_safe.py,
prime.py) or an operations doc, inspect it BEFORE acting for its three couplings: (a) the
design-pack (icm-final) companion, (b) the DESIGN.md co-edit, (c) the CHANGELOG.md entry. If any
is missing, raise it as a numbered question before acting; never patch the omission silently.
One stated boundary: a sweep.py change does NOT require a LOOP_PROMPT.md edit. LOOP_PROMPT.md is
operational, not descriptive (D60); it never restates sweep internals, and it is co-edited ONLY
when the window sequence or the desk-summary format changes.

## How every job closes

Every Claude Code job ends the same way, so a work order does not need to respell it. In order:

1. **Write your touchdown** to `_chronicle/prompts/pending/` with a literal `NNNN` placeholder
   in the filename, using the v2 template `_orchestration/CC_TOUCHDOWN.md`, and emit the
   attention flag in your closing output: `attention: green | amber | red -- <note>`.
2. **Commit and push your own work through the sanctioned save path**:
   `python _orchestration/loop/commit_safe.py -m "<message>" --pick-number <touchdown> <path> ...`
   It picks the touchdown number under the repo lock, stages exactly the named paths (never
   `git add -A` or `git add .`; norm B10), commits with the `Commit-Safe: yes` trailer, pushes,
   and releases.
3. **Run the sweep**: `python _orchestration/loop/sweep.py --apply`. Touchdown, then sweep, is
   the job's last act (norm B8); on a non-default branch, write the touchdown only and the sweep
   runs at merge.
4. **If the work order sets `test mode = true`**, also write a diagnostic journal to
   `_chronicle/mode-test/`, per `_orchestration/TEST_MODE.md`. This never replaces steps 1 to 3.

The binding contract for this close is `_orchestration/CC_OPERATIONS.md` (norm B8); this list is
the operative version you follow, kept in step with it by the co-edit protocol. If you forget to
close, the deadman nags the unswept touchdown within the hour, so a missed close does not stay
hidden.

## Routing

- **Build or change** anything in this repo: a **Claude Code job**. Read the in-scope
  `CONTEXT.md` first (the root `CONTEXT.md` routes product work to its stage), work
  diagnostic-first, then close as above.
- **Design or think** a piece of work through: a **worker bee** (a claude.ai web chat, blind).
  See `_orchestration/OPERATIONS_BEE.md`.
- A CC job's own fan-out routes recon (file reading, grepping, counting, inventories) to the
  built-in Explore agent. Subagents inherit the session model unless routed, so an unrouted
  fan-out silently multiplies the flagship price.
- The homes: operating docs and the loop in `_orchestration/`; records in `_chronicle/`; the
  rulebook in `_infrastructure/`; the prime in `_prime/`; scratch in `_tmp/`.

## Priming (the prime bundle, no Queen)

`python _prime/src/prime.py` assembles `_prime/PRIME_bee.md` (gitignored, stamped). AB pastes it
whole into a fresh worker bee at spawn; the sweep reassembles it at every run's end. Project
memory and project knowledge are empty and stay empty. Claude Code, being sighted, reads
everything off disk and gets no prime.

## What we are NOT building yet (the guardrail)

Hold the line until real friction earns it. Adding any of these is a deliberate decision, not a
friction patch.

- No maps. The tree is small enough to navigate bare; the first map enters only when AB names it.
- No database. Run results are files under `03_train/output/runs/`; JSON until it hurts.
- No RL training stack before a baseline agent exists and its ceiling is measured.
- No game UI polish, no deployment, no publishing infrastructure; the game exists for the
  experiment, and `04_publish/` is a write-up, not a product launch.
- No third actor. Two actors (the worker bee and the Claude Code job) and the loop, as routed
  above.
- Board dimensions, spawn distribution, merge rules and the scoring equation are no longer TBD:
  they are decided and locked in `01_rules/output/RULES.md` v1.0. Any further rule change is
  AB's decision, versioned there, never invented inline by a job.

## Changelog

2026-08-05 -- seeded: authored fresh at the blank-slate seeding (job seed-icm-infrastructure),
on the domain-wisdom-agent router's two-actor skeleton, with the close stated in the commit-safe
form from day one and the product zone's Layer 1 routing pointed at the root CONTEXT.md.
