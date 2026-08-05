# CONTEXT -- 01_rules/

## What this folder is
The game's rule spec home: the single source of truth for what the game IS. Layer 2 contract for
the stage; the spec it produces is what `02_build/` implements and `03_train/` scores against.
The rule content is decided and locked at v1.1 in `output/RULES.md` (AB, 2026-08-05; the prior
version is preserved as `output/rules-v1.0.md`).

## Inputs
| Input | Layer | What it carries |
|---|---|---|
| `references/` | 3 | Design notes, prior-art notes on merge-game mechanics, AB's decision notes as they accumulate. Empty at seeding. |
| `_config/` | 3 | Nothing yet; once the spec lands, its machine-readable constants extract lives there (see `_config/CONTEXT.md`). |

This stage has no upstream; it is the only stage whose substance arrives by AB's decisions, not
by another stage's output.

## Process
AB decides the rule questions; a CC job records each decision into the versioned spec in
`output/`, citing the session or work order that carried the decision. The spec lists its own
open questions as TBD lines; a job never resolves a TBD by inventing the value (root
CONTEXT.md's rule). New spec version = new file, prior versions kept.

## Outputs
`output/RULES.md`: the rule specification. Locked at v1.1 by AB, 2026-08-05 (v1.0 locked
earlier the same day, preserved as `output/rules-v1.0.md` per the new-version-new-file rule):
board and flow, spawning, merging, the game score and the game-over condition are DECIDED, and
this file is the single source of truth `02_build/` implements and `03_train/` scores against.
A change to its sections 1 to 6 is a rule change: it needs AB's sign-off, a version bump there,
and a CHANGELOG entry. Section 8 constants are tuning, not rules, and change freely in the
tunables file RULES.md section 8 names.

What stays open in this stage: nothing from the original open-question list remains undecided.
The human composite performance score (accuracy vs AI, speed, and so on) is explicitly out of
this file's scope (its section 5) and is a Phase 4 decision when that stage is reached. Anything
RULES.md lists as "deliberately not in v1.1" (its section 9) is a deferred decision, not an open
question here.

## Do not
- No code here; the spec is prose plus tables, and code homes live in `02_build/`.
- No invented rule values, ever; a needed-but-undecided value is a stop-and-ask.
- No duplicating the spec into other stages; they point at it or load the `_config/` extract.
