// share.js -- the canvas-rendered score card the player can save (RULES 9:
// personal best and screenshot sharing only; no leaderboard).

import { tileColour } from './config.js';

export function renderShareCard(canvas, data) {
  const W = 1000;
  const H = 525;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d1430');
  bg.addColorStop(1, '#0b1020');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // decorative tile stack, right side
  const deco = [2, 4, 8, 16, 32, 64, 128, 256];
  deco.forEach((v, i) => {
    const size = 86;
    const x = 690 + (i % 2) * (size + 14);
    const y = 80 + Math.floor(i / 2) * (size + 14);
    roundRect(ctx, x, y, size, size, 14);
    ctx.fillStyle = tileColour(v);
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b1020';
    ctx.font = `700 ${v >= 100 ? 30 : 36}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(v), x + size / 2, y + size / 2 + 2);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#93a0bb';
  ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('number-block-sim', 64, 92);

  ctx.fillStyle = '#e7ecf6';
  ctx.font = '800 96px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(formatNum(data.score), 60, 205);
  ctx.fillStyle = '#93a0bb';
  ctx.font = '600 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SCORE', 64, 240);

  const rows = [
    ['Max tile', formatNum(data.maxTile)],
    ['Longest chain', `${data.longestChain}x`],
    ['Blocks placed', formatNum(data.blocksPlaced)],
  ];
  ctx.font = '600 26px "Segoe UI", system-ui, sans-serif';
  rows.forEach(([k, v], i) => {
    const y = 315 + i * 48;
    ctx.fillStyle = '#93a0bb';
    ctx.fillText(k, 64, y);
    ctx.fillStyle = '#e7ecf6';
    ctx.fillText(v, 320, y);
  });

  ctx.fillStyle = '#5b6785';
  ctx.font = '500 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${data.date}   seed ${data.seed}`, 64, H - 44);
}

export function downloadShareCard(data) {
  const canvas = document.createElement('canvas');
  renderShareCard(canvas, data);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `number-block-sim-${data.score}.png`;
  a.click();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatNum(n) {
  return n.toLocaleString('en-GB');
}
