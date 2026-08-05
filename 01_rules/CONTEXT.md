# CONTEXT -- 01_rules/

## What this folder is
The game's rule spec home: the single source of truth for what the game IS. Layer 2 contract for
the stage; the spec it produces is what `02_build/` implements and `03_train/` scores against.
The stage is a stub at seeding: the structure is real, the rule content is not yet decided.

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
`output/rules-spec-v<N>.md`: the versioned rule spec. Empty at seeding. The spec is complete
when every TBD below has a decided value:

- TBD: board dimensions (open question: grid width and height, and whether the top row is a
  spawn buffer or playable).
- TBD: spawn distribution (open question: which values spawn and with what weights, and whether
  the distribution shifts as play progresses).
- TBD: exact merge rules (open question: pairwise equal-merge doubles, but what exactly does a
  three-or-more adjacent merge produce, which adjacency counts, and how do chained merges
  cascade and in what order).
- TBD: the scoring equation (open question: what is being maximised; per-merge points, survival
  time, both, and with what weights).
- TBD: the failure condition's precise form (open question: stranded low blocks are the failure
  mode, but what exact board state ends the game).

## Do not
- No code here; the spec is prose plus tables, and code homes live in `02_build/`.
- No invented rule values, ever; a needed-but-undecided value is a stop-and-ask.
- No duplicating the spec into other stages; they point at it or load the `_config/` extract.
