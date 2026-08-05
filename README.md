# number-block-sim

Drop falling power-of-two blocks, merge equal neighbours, engineer the cascade.

## [▶ PLAY NOW](https://masked-brown.github.io/number-block-sim/)

No install, no account, no build step. Keyboard only: arrows steer, space drops.

## What it is

- A 5x6 falling-block game where every block is a power of two and equal orthogonal
  neighbours merge on lock: a pair doubles, a triple 4x, a quad 8x, a quintuple 16x.
- Scoring is cascades: each merge scores its result times the chain index. Placement scores
  nothing; engineered chain reactions are the whole game.
- The spawn curve drifts upward as your best tile grows: low values become rare (never
  impossible), high values arrive more often, and the game shows you every possible next
  value with its live odds. A stranded low block with no partner left is permanent dead
  space; that is the central failure mode, by design.
- Deterministic to the bit: a seeded PCG32 generator, so a replay of the same seed and moves
  reproduces the identical game in any browser or in Node.
- Every game auto-saves a replay. [Cinema mode](https://masked-brown.github.io/number-block-sim/cinema.html)
  verifies any replay through the engine and plays it back with step, speed and, when an AI
  recorded them, its move-by-move reasoning.
- Personal best and a shareable score card; no leaderboard, no analytics, no database.

## The experiment

The game is the apparatus, not the product. The plan: build the game from scratch (done,
this repo), train an AI agent to play it optimally, then measure human play against the
agent and write up what optimal play actually looks like. The AI will drive the same pure
engine file the browser runs, and its games will land as replays whose reasoning cinema mode
shows move by move.

The full locked rule specification is [RULES.md](01_rules/output/RULES.md); the build's
architecture record is [BUILD.md](02_build/output/BUILD.md).

## The workspace

This repo is also the experiment's working environment: `CLAUDE.md` routes the work,
`_infrastructure/` carries the operating rulebook, and the product moves through numbered
stages (`01_rules/` the spec, `02_build/` the game, `03_train/` the agent, `04_publish/` the
write-up). The game itself lives in `docs/`, served by GitHub Pages; push equals deploy.

British English, no em-dashes, no exclamation marks.
