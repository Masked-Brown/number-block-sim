// config.js -- the single tunables file (RULES.md section 8: not rules, change
// freely). Every section 8 constant lives here; the engine and UI carry no
// magic numbers of their own. Rule constants (board size, merge and scoring
// maths, the spawn FORMULA) are NOT here: they are locked rules in engine.js.
// The spawn curve PARAMETERS below are tuning: retuning difficulty is an edit
// to this file, never a code edit.

export const CONFIG = Object.freeze({
  // Spawn curve parameters (RULES.md 3 carries the formula; all integers).
  // centre c = centreBase + centreGain x max(0, M - centreStart) milli-tiers,
  // ceiling C = max(ceilingMin, ceil(c/1000) + ceilingSpread),
  // w(t) = max(peakWeight - floor(slope x |1000t - c| / 1000), floorWeight).
  spawn: Object.freeze({
    centreBase: 2000, // centre starts at tier 2 (value 4)
    centreGain: 400, // milli-tiers of drift per max-tile tier above centreStart
    centreStart: 4, // drift begins once the board's max tile passes tier 4 (16)
    ceilingMin: 5, // never fewer than tiers 1..5 (2..32) live
    ceilingSpread: 3, // ceiling rides this many tiers above the centre
    peakWeight: 1000, // weight at the centre tier
    slope: 300, // weight lost per full tier of distance from the centre
    floorWeight: 40, // no live tier ever weighs less than this (never zero)
  }),

  // Fall speed (RULES 8): 1 cell per 1.0 s default; hard drop instant (the
  // instant part is the rule; the fall rate is tunable).
  fallCellsPerSecond: 1.0,

  // Animation and feedback timings, ms.
  animation: Object.freeze({
    mergeFlashMs: 200,
    gravityMs: 130,
    spawnMs: 110,
    cinemaFallMs: 340, // cinema-mode fall animation at 1x playback
  }),

  // Feedback effects (all gated behind prefers-reduced-motion in the UI).
  fx: Object.freeze({
    landShakePx: 3, // board nudge on a plain lock
    mergeShakeBase: 4, // shake px for a pair; grows with size and chain
    mergeShakePerSize: 2,
    chainShakePerPass: 2,
    shakeMs: 140,
    particlesPerMerge: 7, // base particle count for a pair
    particlesPerExtra: 5, // extra per block beyond the pair
    particleMs: 520,
    bigMergeValue: 128, // result at or above this gets the heavy signal
    chainPopupMs: 700,
    dangerHeight: 5, // columns at or above this height trigger the danger state
  }),

  // Post-game performance grading (game v1.2). Every constant of the three
  // indices and the composite lives here: none of them is a rule, and all of
  // them are arguable, so they are named, commented and tunable rather than
  // buried in the maths. `docs/js/performance.js` reads them and nothing else.
  performance: Object.freeze({
    // Composite weights, from the v1.2 work order. They must sum to 1;
    // performance.js checks that rather than trusting it.
    weightAccuracy: 0.5,
    weightScore: 0.3,
    weightPace: 0.2,

    // scoreIndex is log-scaled between a floor and a cap, because game score
    // compounds with survival and a linear index would leave every human game
    // indistinguishable near zero.
    //
    // The floor is roughly the scale of play with no judgement at all (the
    // random and stacker baselines median about 1,700 on eval-v1), so a game
    // that merges nothing scores near 0 rather than negative infinity.
    scoreIndexFloor: 1000,
    // The cap is the CHAMPION'S eval-v1 median: reaching what the best honest
    // agent typically manages is full marks, and beyond it is still full marks.
    // 634,826 is expectimax-d3-v2's median over all 500 eval-v1 seeds, run
    // 2026-08-05_eval-expectimax-d3-v2. The superseded d3-v1 figure was 643,996
    // and is deliberately not used: audit 0019 showed that agent's search leaves
    // read a block no player can see, so its median measures the leak as well as
    // the play. Retuning the spawn curve would invalidate this number along with
    // every other absolute score.
    scoreIndexCap: 634826,

    // paceIndex: full marks at or under paceFastSeconds median seconds per
    // move, nothing at or over paceSlowSeconds, linear between.
    paceFastSeconds: 2,
    paceSlowSeconds: 12,

    // Grading budget per animation frame, ms. Grading is chunked so the page
    // keeps painting; the value changes how it FEELS and can never change a
    // grade, which depends only on the recorded moves.
    gradeChunkMs: 12,
  }),

  // Daily seed: the date-derived alternative to a random seed, so two people
  // can compare a score on the same board without a server. `dailyLabel` is
  // the string the seed is hashed from, with the UTC date appended; changing
  // it reshuffles every future daily and is the reason it is a tunable.
  daily: Object.freeze({
    label: 'nbs-daily-v1',
  }),

  // Board render size: tile geometry in px (the layout scales from these).
  board: Object.freeze({
    tilePx: 76,
    gapPx: 6,
    radiusPx: 4, // sharp corners; raw, not rounded-candy
  }),

  // Colour ramp by tier (tier = log2(value)); wraps beyond the last entry.
  // Darker, rawer read: low tiers muted and cool, the mid-game band vivid,
  // high tiers deep and heavy. Weight styling for high tiers is applied by
  // the renderer from heavyValue upward.
  colours: Object.freeze({
    tiles: Object.freeze([
      '#4a6fa5', // 2 muted steel blue
      '#3d8ea8', // 4 dulled cyan
      '#2f9e77', // 8 sea green
      '#7fae3c', // 16 moss
      '#c9a227', // 32 brass
      '#d97e23', // 64 burnt orange
      '#cf4e2a', // 128 rust
      '#b32d3c', // 256 deep red
      '#a03a86', // 512 magenta shadow
      '#7443b6', // 1024 violet
      '#4653c9', // 2048 indigo
      '#2f8f8f', // 4096 dark teal
      '#8a8f1f', // 8192 acid olive
      '#5e2fa8', // 16384 deep purple
    ]),
    tileText: '#0a0c12',
    heavyValue: 256, // from here up, tiles render with weight (glow and depth)
  }),
});

// Tile colour for a value: ramp by tier, wrapping past the end.
export function tileColour(value) {
  const tier = Math.round(Math.log2(value)) - 1; // value 2 -> index 0
  const ramp = CONFIG.colours.tiles;
  return ramp[((tier % ramp.length) + ramp.length) % ramp.length];
}
