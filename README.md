# number-block-sim

A falling number-block matching game, built from scratch, plus an AI agent trained to play it
optimally. Blocks fall into a grid; equal numbers merge and double; three or more adjacent equal
blocks merge to a higher multiple; low-value blocks stranded at the bottom are the failure mode.
The experiment is to find optimal play and write up the findings.

This repo holds the coordination infrastructure (the portable ICM operating system, two-actor
form) and the four-stage product zone: `01_rules/` the game's spec, `02_build/` the game and
simulation harness, `03_train/` agent training and runs, `04_publish/` the write-up, with
`_config/` as shared reference. The game's rules and the agent are decided and built in later
sessions; the spec's open questions are marked TBD in `01_rules/`.

Read `CLAUDE.md` first (the router), then `_infrastructure/INFRASTRUCTURE.md` (the front door
and the generated snapshot). The live state is `_orchestration/loop/STATUS.md` (newest line).

British English, no em-dashes, no exclamation marks.
