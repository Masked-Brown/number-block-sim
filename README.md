# number-block-sim

A falling number-block matching game, built from scratch, plus an AI agent trained to play it
optimally. The game mechanics (board and flow, spawning, merging, the game score, game over) are
decided and locked at v1.0 in `01_rules/output/RULES.md`. The experiment is to find optimal play
and write up the findings.

This repo holds the coordination infrastructure (the portable ICM operating system, two-actor
form) and the four-stage product zone: `01_rules/` the game's spec, `02_build/` the game and
simulation harness, `03_train/` agent training and runs, `04_publish/` the write-up, with
`_config/` as shared reference. The rules are locked; the game and the agent are built in later
sessions.

Read `CLAUDE.md` first (the router), then `_infrastructure/INFRASTRUCTURE.md` (the front door
and the generated snapshot). The live state is `_orchestration/loop/STATUS.md` (newest line).

British English, no em-dashes, no exclamation marks.
