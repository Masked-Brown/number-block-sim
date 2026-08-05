# CONTEXT -- 04_publish/

## What this folder is
The write-up stage: turning what the experiment established into a published account of optimal
play. The stage is a stub at seeding; it activates once `03_train/output/_FINDINGS.md` carries
enough supported findings to say something.

## Inputs
| Input | Layer | What it carries |
|---|---|---|
| `03_train/output/_FINDINGS.md` | 4 (upstream, verdict layer) | The distilled current beliefs, with confidence and evidence per finding. The ONLY analysis input this stage reads; never raw `runs/`. |
| `01_rules/output/rules-spec-v<N>.md` | 4 (upstream) | The game's definition, so the write-up states the rules it was played under. |
| `_config/` | 3 | Shared constants extract, for stated parameters. |
| `references/` | 3 | Venue notes, style references, prior write-ups worth imitating. Empty at seeding. |

## Process
Drafts are versioned in `output/` (`draft-v<N>.md`, prior versions kept). Every claim in a
draft cites its finding by register ID; a claim with no F-number is either the game's stated
definition or it does not go in. Publication decisions are AB's: what ships, where, and when.

- TBD: format and venue (open question: a long-form markdown write-up, a blog post, an
  interactive artefact, or several; AB decides when the findings warrant drafting).
- TBD: what "done" means for the experiment (open question: the stopping criterion for
  `03_train/` iteration, without which the write-up has no natural close; decided by AB as
  findings accumulate).

## Outputs
`output/`: the versioned drafts and the final write-up. Empty at seeding.

## Do not
- Do not read raw runs; if the register is too thin to write from, that is a `03_train/`
  promotion gap to flag, not a licence to mine `runs/` directly.
- Do not state a claim without its register ID.
- Do not publish anything; drafting is jobs' work, shipping is AB's.
