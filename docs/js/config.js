// config.js -- the single tunables file (RULES.md section 8: not rules, change
// freely). Every section 8 constant lives here; the engine and UI carry no
// magic numbers of their own. Rule constants (board size, spawn window, merge
// and scoring maths) are NOT here: they are locked rules and live in engine.js.

export const CONFIG = Object.freeze({
  // Fall speed (RULES 8): 1 cell per 1.0 s default, soft drop 10x, hard drop
  // instant (instant is the rule; only the two speeds are tunable).
  fallCellsPerSecond: 1.0,
  softDropMultiplier: 10,

  // Animation timings, ms.
  animation: Object.freeze({
    mergeFlashMs: 220,
    gravityMs: 140,
    spawnMs: 120,
    floorRiseBannerMs: 1600,
  }),

  // Board render size: tile geometry in px (the layout scales from these).
  board: Object.freeze({
    tilePx: 72,
    gapPx: 8,
    radiusPx: 10,
  }),

  // Colour ramp by tier (tier = log2(value)); wraps beyond the last entry.
  // Dark UI: tiles sit on --bg defined in the stylesheet.
  colours: Object.freeze({
    tiles: Object.freeze([
      '#3b82f6', // 2
      '#06b6d4', // 4
      '#10b981', // 8
      '#84cc16', // 16
      '#eab308', // 32
      '#f59e0b', // 64
      '#f97316', // 128
      '#ef4444', // 256
      '#ec4899', // 512
      '#a855f7', // 1024
      '#6366f1', // 2048
      '#14b8a6', // 4096
      '#f43f5e', // 8192
      '#8b5cf6', // 16384
    ]),
    tileText: '#0b1020',
    retiredDim: 0.55, // brightness factor for tiles below the current window
  }),
});

// Tile colour for a value: ramp by tier, wrapping past the end.
export function tileColour(value) {
  const tier = Math.round(Math.log2(value)) - 1; // value 2 -> index 0
  const ramp = CONFIG.colours.tiles;
  return ramp[((tier % ramp.length) + ramp.length) % ramp.length];
}
