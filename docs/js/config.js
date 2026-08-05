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
