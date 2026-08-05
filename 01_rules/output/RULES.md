# RULES.md -- the locked rule specification, v1.1

Status: LOCKED by AB, v1.1 on 2026-08-05 (v1.0 locked earlier the same day; the prior version
is preserved as `rules-v1.0.md` beside this file). Designed by nbs-[wor]-1.0-z with AB; the
v1.1 revision is AB's playtest decision, carried by the work order game-revision-v1.1.
Home: `01_rules/output/RULES.md`. This file is the single source of truth for game mechanics.
The engine implements this file; the sim harness and the browser game share that one engine.
A change to sections 1 to 6 is a rule change: it needs AB's sign-off, a version bump here, and
a CHANGELOG entry. Section 8 constants are tuning, not rules, and may change freely in the
tunables file (section 8).

Change note, v1.0 to v1.1 (2026-08-05): board height 7 to 6; controls cut to arrows plus
space, soft drop and the direct-send keys removed; the new block enters in the column where
the previous block locked; section 3's hard four-tier window with floor rise replaced by a
drifting probability distribution over all live tiers. Merge maths, chain scoring and the
game-over rule are unchanged.

British English, no em-dashes, no exclamation marks.

---

## 1. Board and flow

- 5 columns, 6 rows. A column holds at most 6 blocks.
- One block falls at a time at a constant slow speed. No speed-up over time, ever.
  Time pressure lives in the human performance score (Phase 4), never in the mechanics.
- Preview shows the next 1 upcoming block. No hold, no swap, no discard.
- Every block value is a power of two, displayed as its number (2, 4, 8, ...).

## 2. Controls (human play)

- Left / Right arrows: move the falling block one column.
- Space: drop (instant lock).
- Nothing else. There are no direct-send keys and no soft drop (both removed in v1.1).
- A new block enters play in the column where the previous block locked; the first block of a
  game enters in the centre column.
- The AI does not use the interface at all; it calls the engine directly.

## 3. Spawning

- Deterministic seeded generator (PCG32). A replay of the same seed and the same moves
  reproduces the identical game, block for block.
- Tiers name the powers of two: tier t is the value 2^t, so tier 1 is 2, tier 2 is 4, and so
  on. Every tier from 1 up to a current ceiling is live; there is no hard window and no tier
  retirement.
- Each draw takes its probabilities from a peaked curve over the live tiers, computed fresh
  from the board as it stands. In plain terms: probability peaks at a centre tier that drifts
  upward as the board's largest tile grows, and decays linearly either side of the centre;
  every live tier keeps a small floor probability, so low tiers stay possible late (rare,
  never zero) and high tiers appear occasionally early.
- The formula, exactly, in integer arithmetic throughout (floor division wherever a division
  appears, so every implementation agrees to the bit). M is the tier of the largest tile on
  the board, 0 for an empty board. The eight named parameters are section 8 tunables.
  - centre, in milli-tiers: c = centreBase + centreGain x max(0, M - centreStart)
  - ceiling tier: C = max(ceilingMin, ceil(c / 1000) + ceilingSpread)
  - weight of tier t, for t = 1 .. C:
    w(t) = max(peakWeight - floor(slope x |1000 x t - c| / 1000), floorWeight)
  - total: W = w(1) + ... + w(C); the probability of tier t is w(t) / W
  - the draw: one 32-bit PCG32 output r; let k = r mod W; the drawn tier is the first t
    whose cumulative weight w(1) + ... + w(t) exceeds k
- The next block's value is drawn at the moment the current block enters play, from the board
  as it then stands after the previous resolution. The preview shows exactly that drawn
  value.

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

- The player may direct a block into a full column: it locks above row 6 and
  resolution runs. If it merges its way down to legal height, that is a clutch rescue
  and play continues.
- If, after full resolution, any column still holds more than 6 blocks, the game ends.
- Final score is the game score at that moment.

## 7. What the engine must expose (for later phases, not negotiable in shape)

- Pure logic module, zero rendering, zero timing. Board state in, move in, new state
  and events out.
- The live spawn distribution (each live tier with its exact probability) as a pure engine
  function, because the Phase 3 AI's lookahead needs the same numbers the UI shows.
- Replay format: {seed, moves[]} plus the spawn parameters the game ran under, so a replay
  verifies under its own tuning regardless of later retunes (format v2; v1 replays predate
  this spec version and do not replay). Enriched replay adds per-move reasoning when the AI
  plays. Determinism is a tested property, not an aspiration.
- Per-game metrics: final score, max tile, blocks placed, merge counts by group size,
  longest chain, duration and per-move timestamps (human play only).

## 8. Tuning constants (not rules; live in the tunables file, change freely)

- The tunables home is `docs/js/config.js` (the game's single config file; the formula in
  section 3 is the rule, the parameter values are tuning).
- Spawn curve parameters: centreBase, centreGain, centreStart, ceilingMin, ceilingSpread,
  peakWeight, slope, floorWeight.
- Fall speed: 1 cell per 1.0 s default. Hard drop instant.
- Animation timings, colours, board render size.

## 9. Deliberately not in v1.1

- No hold/swap, no multi-block preview, no undo.
- No soft drop (removed in v1.1) and no speed progression.
- No purge or board-clearing mechanic of any kind; nothing ever removes a block except a
  merge.
- No leaderboard database; personal best and screenshot sharing only.
