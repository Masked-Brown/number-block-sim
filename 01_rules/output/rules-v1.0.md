# RULES.md -- the locked rule specification, v1.0

Status: LOCKED by AB, 2026-08-05. Designed by nbs-[wor]-1.0-z with AB.
Home: `01_rules/output/RULES.md`. This file is the single source of truth for game
mechanics. The engine implements this file; the sim harness and the browser game share
that one engine. A change to sections 1 to 6 is a rule change: it needs AB's sign-off,
a version bump here, and a CHANGELOG entry. Section 8 constants are tuning, not rules,
and may change freely in `_config/`.

British English, no em-dashes, no exclamation marks.

---

## 1. Board and flow

- 5 columns, 7 rows. A column holds at most 7 blocks.
- One block falls at a time at a constant slow speed. No speed-up over time, ever.
  Time pressure lives in the human performance score (Phase 4), never in the mechanics.
- Preview shows the next 1 upcoming block. No hold, no swap, no discard.
- Every block value is a power of two, displayed as its number (2, 4, 8, ...).

## 2. Controls (human play)

- Z X C V B: send the falling block directly to columns 1 to 5.
- Left / Right arrows: nudge one column.
- Down arrow: soft drop (faster fall while held).
- Space: hard drop (instant lock).
- The AI does not use the interface at all; it calls the engine directly.

## 3. Spawning

- Deterministic seeded generator (PCG32). A replay of the same seed and the same moves
  reproduces the identical game, block for block.
- Spawn values are drawn uniformly from a window of 4 consecutive tiers.
- The window starts at floor 2: {2, 4, 8, 16}.
- Floor rise: after each full resolution, while the largest tile on the board is at
  least 128 times the current floor, the floor doubles. Example: first rise at max
  tile 256, giving window {4, 8, 16, 32}.
- NO PURGE. When the floor rises, blocks of retired tiers stay on the board. They can
  still merge with each other, but no new blocks of their tier will spawn. A stranded
  low block with no partner is permanent dead space. This is the game's central
  failure mode, by design.

## 4. Merging

- Adjacency is orthogonal only: up, down, left, right. No diagonals.
- On lock, and after every gravity settle, every connected group of n equal-value
  blocks (n >= 2) merges into one block of value x 2^(n-1):
  pair 2x, triple 4x, quad 8x, quintuple 16x.
- Merge landing cell: on the lock pass, the merged block sits in the just-locked
  block's cell. On cascade passes, it sits in the group's lowest cell, leftmost on a
  tie.
- All disjoint groups found in the same pass merge simultaneously.
- After merging: gravity settles everything down, then the board is re-checked. Chains
  continue until no group remains.

## 5. Scoring (the game score)

- Each merge scores: resulting value x chain index.
- Chain index is 1 on the lock-triggered pass and rises by 1 for each cascade pass.
  All merges within the same pass share that pass's index.
- Nothing else scores. Placement scores zero. Engineered cascades are the whole game.
- The human composite performance score (accuracy vs AI, speed, and so on) is a
  separate Phase 4 decision and is NOT part of this file.

## 6. Game over

- The player may direct a block into a full column: it locks above row 7 and
  resolution runs. If it merges its way down to legal height, that is a clutch rescue
  and play continues.
- If, after full resolution, any column still holds more than 7 blocks, the game ends.
- Final score is the game score at that moment.

## 7. What the engine must expose (for later phases, not negotiable in shape)

- Pure logic module, zero rendering, zero timing. Board state in, move in, new state
  and events out.
- Replay format: {seed, moves[]}. Enriched replay adds per-move reasoning when the AI
  plays. Determinism is a tested property, not an aspiration.
- Per-game metrics: final score, max tile, blocks placed, merge counts by group size,
  longest chain, duration and per-move timestamps (human play only).

## 8. Tuning constants (not rules; live in _config/, change freely)

- Fall speed: 1 cell per 1.0 s default. Soft drop 10x. Hard drop instant.
- Animation timings, colours, board render size.

## 9. Deliberately not in v1.0

- No purge mechanic (decided against, 2026-08-05).
- No hold/swap, no multi-block preview, no undo.
- No speed progression.
- No leaderboard database; personal best and screenshot sharing only.
