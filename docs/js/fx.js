// fx.js -- feedback effects (v1.1 look-and-feel work; design rationale in
// 02_build/output/BUILD.md, "Game feel research"). Every effect here is a
// fire-and-forget overlay: nothing blocks input or delays the game loop, and
// everything respects prefers-reduced-motion. Effects serve legibility first.

import { CONFIG } from './config.js';

const FX = CONFIG.fx;

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Proportional, brief board shake (Vlambeer: stacked micro-impacts, never
// long). px is clamped so a monster chain still cannot make the board reel.
export function shake(el, px) {
  if (reducedMotion() || px <= 0) return;
  const amp = Math.min(px, 14);
  const frames = [];
  for (let i = 0; i < 5; i++) {
    const decay = 1 - i / 5;
    frames.push({
      transform: `translate(${rnd(-amp, amp) * decay}px, ${rnd(-amp, amp) * decay}px)`,
    });
  }
  frames.push({ transform: 'translate(0, 0)' });
  el.animate(frames, { duration: FX.shakeMs, easing: 'linear' });
}

// Particle burst at a board-local point, coloured like the merged tile,
// count scaled to merge size.
export function burst(boardEl, x, y, colour, size) {
  if (reducedMotion()) return;
  const count = FX.particlesPerMerge + FX.particlesPerExtra * Math.max(0, size - 2);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'fx-particle';
    p.style.background = colour;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    boardEl.appendChild(p);
    const angle = (Math.PI * 2 * i) / count + rnd(-0.4, 0.4);
    const dist = rnd(26, 60 + 8 * size);
    p.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      {
        transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist - 14}px) scale(0.4)`,
        opacity: 0,
      },
    ], { duration: FX.particleMs, easing: 'cubic-bezier(0.1, 0.6, 0.3, 1)' })
      .onfinish = () => p.remove();
  }
}

// Expanding ring: the distinct signal for a large merge.
export function ring(boardEl, x, y) {
  if (reducedMotion()) return;
  const r = document.createElement('div');
  r.className = 'fx-ring';
  const start = 20;
  r.style.width = `${start}px`;
  r.style.height = `${start}px`;
  r.style.left = `${x - start / 2}px`;
  r.style.top = `${y - start / 2}px`;
  boardEl.appendChild(r);
  r.animate([
    { transform: 'scale(1)', opacity: 0.9 },
    { transform: 'scale(4.4)', opacity: 0 },
  ], { duration: 480, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)' })
    .onfinish = () => r.remove();
}

// Chain popup, escalating with the pass index (the multiplier IS the reward).
export function chainPop(wrapEl, chainIndex) {
  if (reducedMotion() || chainIndex < 2) return;
  const el = document.createElement('div');
  el.className = 'chain-pop';
  el.textContent = `chain x${chainIndex}`;
  const size = 16 + 5 * Math.min(chainIndex, 6);
  el.style.fontSize = `${size}px`;
  el.style.color = chainIndex >= 4 ? '#c93030' : chainIndex === 3 ? '#d97e23' : '#c9a227';
  el.style.top = '18%';
  wrapEl.appendChild(el);
  el.animate([
    { transform: 'translate(-50%, 0) scale(0.7)', opacity: 0 },
    { transform: 'translate(-50%, -10px) scale(1.06)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%, -34px) scale(1)', opacity: 0 },
  ], { duration: FX.chainPopupMs, easing: 'ease-out' })
    .onfinish = () => el.remove();
}

// Squash on landing (Disney: weight lives in the impact).
export function squash(tileEl) {
  if (reducedMotion() || !tileEl) return;
  tileEl.animate([
    { transform: 'scaleY(1) scaleX(1)' },
    { transform: 'scaleY(0.82) scaleX(1.10)', offset: 0.4 },
    { transform: 'scaleY(1) scaleX(1)' },
  ], { duration: 140, easing: 'ease-out' });
}

// Pop on a merged result appearing (small overshoot, quick settle).
export function pop(tileEl) {
  if (reducedMotion() || !tileEl) return;
  tileEl.animate([
    { transform: 'scale(0.8)' },
    { transform: 'scale(1.16)', offset: 0.55 },
    { transform: 'scale(1)' },
  ], { duration: 170, easing: 'ease-out' });
}

function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
