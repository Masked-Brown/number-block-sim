# lab/ -- the simulation harness

The working contract for this stage is `03_train/CONTEXT.md`: what the agent interface is, how
the feature registry works, the seed discipline and the versioning rule all live there and are
not repeated here. This file is the shortest path to running something.

    node --test 03_train/lab/test/                          the harness's own suite
    node 03_train/lab/cli/campaign.js --games 500           the four-agent ladder on eval-v1
    node 03_train/lab/cli/run.js --agent heuristic-v0 --games 500 --replay-best
    node 03_train/lab/cli/throughput.js --games 200 --reps 5
    node 03_train/lab/cli/one-game.js --agent greedy-v1 --seed 12345

Node 18 or later, no dependencies, nothing to install. The engine comes from `docs/js/engine.js`
through `engine-link.js` and is never reimplemented here.

To add a feature: drop a module in `features/registered/` default-exporting
`{name, version, status, describe, score(ctx)}`. Nothing else changes. To use it, cut a new agent
version that weights it and pins its version.

To add an agent: a module in `agents/` exporting `{name, version, describe, create}`, registered
in `agents/index.js`. Existing agent versions are immutable.
