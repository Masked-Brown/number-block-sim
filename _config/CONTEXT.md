# CONTEXT -- _config/

## What this folder is
Shared reference material across stages: Layer 3, stable across runs. The boundary that decides
what lands here: material MORE THAN ONE stage loads lives here; single-stage reference lives in
that stage's own `references/`. Empty at seeding except this file.

## Working rules
- The intended first resident: once `01_rules/` lands its spec, a machine-readable constants
  extract (board dimensions, spawn distribution, merge and scoring parameters) lives here, so
  `02_build/` code and `03_train/` run configs load values instead of hardcoding them.
- The extract is derived, never authoritative: `01_rules/output/`'s spec governs, and a
  disagreement between the two is a bug in the extract, fixed by regenerating it from the spec.
- TBD: the extract's format (open question: JSON, TOML or Python constants; decided by the
  `02_build/` language choice, which is itself TBD).

## Do not
- No per-stage material; that is what each stage's `references/` is for.
- No run artefacts or drafts; Layer 4 lives in the stages' `output/` folders.
- No values that contradict the rules spec; regenerate, never patch by hand in place.
