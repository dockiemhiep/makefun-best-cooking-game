// Original procedural vector artwork for The Golden Ladle: ingredients (raw, golden, burnt),
// multi-layer plated dishes, utensils, kitchen crest, steam/smoke, and HUD icons. Zero emoji.
import { COOK_STATE, countIngredients } from './recipes.js';

export function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function fillRoundRect(ctx, x, y, w, h, r, fillStyle) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

export function strokeRoundRect(ctx, x, y, w, h, r, strokeStyle, lineWidth = 1.5) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/** Stamped gleaming gold coin icon. */
export function drawCoin(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#fff2ad');
  grad.addColorStop(0.45, '#f0be4a');
  grad.addColorStop(1, '#b67d1b');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, r * 0.14);
  ctx.strokeStyle = '#7e520e';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 248, 204, 0.72)';
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.stroke();

  // Tiny center diamond stamp
  ctx.fillStyle = '#8b5c10';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.35);
  ctx.lineTo(r * 0.24, 0);
  ctx.lineTo(0, r * 0.35);
  ctx.lineTo(-r * 0.24, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Five-point faceted star (filled gold or recessed brass outline). */
export function drawStar(ctx, cx, cy, r, filled) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const inner = r * 0.44;
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : inner;
    const px = Math.cos(angle) * rad;
    const py = Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#fff2a6');
    g.addColorStop(0.45, '#f2bd41');
    g.addColorStop(1, '#bd7f19');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.strokeStyle = '#7d4f0a';
    ctx.stroke();
    // Subtle top specular highlight
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.78);
    ctx.lineTo(r * 0.16, -r * 0.2);
    ctx.lineTo(-r * 0.16, -r * 0.2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255, 240, 210, 0.12)';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.strokeStyle = 'rgba(212, 160, 69, 0.45)';
    ctx.stroke();
  }
  ctx.restore();
}

/** Small stove flame glyph marking cookable items. */
export function drawFlame(ctx, cx, cy, size, color = '#e46b2c') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.65, -size * 0.3, size * 0.72, size * 0.55, 0, size * 0.85);
  ctx.bezierCurveTo(-size * 0.72, size * 0.55, -size * 0.65, -size * 0.3, 0, -size);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.25);
  ctx.bezierCurveTo(size * 0.32, size * 0.12, size * 0.3, size * 0.55, 0, size * 0.68);
  ctx.bezierCurveTo(-size * 0.3, size * 0.55, -size * 0.32, size * 0.12, 0, -size * 0.25);
  ctx.closePath();
  ctx.fillStyle = '#ffe285';
  ctx.fill();
  ctx.restore();
}

/** Minimal clock dial icon for HUD shift timer. */
export function drawClock(ctx, cx, cy, r, color = '#f1c76b') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 0.55);
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.42, r * 0.2);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Strike indicator plate (clean cream plate when safe, cracked crimson X when struck). */
export function drawStrikeMark(ctx, cx, cy, r, struck) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  if (struck) {
    ctx.fillStyle = '#5a1e1a';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#e85b4e';
    ctx.stroke();
    ctx.strokeStyle = '#ff948a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    const d = r * 0.46;
    ctx.beginPath();
    ctx.moveTo(-d, -d);
    ctx.lineTo(d, d);
    ctx.moveTo(d, -d);
    ctx.lineTo(-d, d);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(251, 244, 231, 0.14)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(212, 160, 69, 0.55)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.54, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251, 244, 231, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** Mute/unmute speaker icon. */
export function drawSpeaker(ctx, cx, cy, r, muted, color = '#fbf4e7') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-r * 0.72, -r * 0.28);
  ctx.lineTo(-r * 0.34, -r * 0.28);
  ctx.lineTo(r * 0.08, -r * 0.65);
  ctx.lineTo(r * 0.08, r * 0.65);
  ctx.lineTo(-r * 0.34, r * 0.28);
  ctx.lineTo(-r * 0.72, r * 0.28);
  ctx.closePath();
  ctx.fill();

  if (muted) {
    ctx.strokeStyle = '#e85b4e';
    ctx.beginPath();
    ctx.moveTo(r * 0.32, -r * 0.34);
    ctx.lineTo(r * 0.78, r * 0.34);
    ctx.moveTo(r * 0.78, -r * 0.34);
    ctx.lineTo(r * 0.32, r * 0.34);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(r * 0.16, 0, r * 0.36, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.16, 0, r * 0.64, -0.75, 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

/** Pause / Play icon for HUD button. */
export function drawPauseIcon(ctx, cx, cy, r, paused, color = '#fbf4e7') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  if (paused) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.56);
    ctx.lineTo(r * 0.62, 0);
    ctx.lineTo(-r * 0.42, r * 0.56);
    ctx.closePath();
    ctx.fill();
  } else {
    fillRoundRect(ctx, -r * 0.48, -r * 0.54, r * 0.32, r * 1.08, 2, color);
    fillRoundRect(ctx, r * 0.16, -r * 0.54, r * 0.32, r * 1.08, 2, color);
  }
  ctx.restore();
}

/** Golden Ladle emblem crest used in the HUD and poster title screen. */
export function drawLadleCrest(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);

  // Medallion base
  const bg = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
  bg.addColorStop(0, '#4f351e');
  bg.addColorStop(1, '#26170e');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = Math.max(1.8, r * 0.1);
  ctx.strokeStyle = '#e7ba5b';
  ctx.stroke();

  // Inner brass hair-ring
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.strokeStyle = 'rgba(241, 199, 107, 0.45)';
  ctx.stroke();

  // Ladle handle (angled diagonally from top-right down to bowl)
  const gold = ctx.createLinearGradient(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5);
  gold.addColorStop(0, '#fff3b8');
  gold.addColorStop(0.5, '#eab543');
  gold.addColorStop(1, '#a97118');

  ctx.strokeStyle = gold;
  ctx.lineWidth = Math.max(2.2, r * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.48, -r * 0.48);
  ctx.lineTo(-r * 0.02, r * 0.12);
  ctx.stroke();

  // Hook curl at top of ladle handle
  ctx.beginPath();
  ctx.arc(r * 0.52, -r * 0.42, r * 0.1, -Math.PI * 0.8, Math.PI * 0.35);
  ctx.stroke();

  // Deep ladle bowl
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(-r * 0.2, r * 0.22, r * 0.32, 0, Math.PI, false);
  ctx.quadraticCurveTo(-r * 0.52, r * 0.14, -r * 0.2, r * 0.14);
  ctx.quadraticCurveTo(r * 0.12, r * 0.14, r * 0.12, r * 0.22);
  ctx.closePath();
  ctx.fill();

  // Specular gleam on ladle rim
  ctx.fillStyle = '#fff8d4';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, r * 0.18, r * 0.24, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Two delicate steam wisps above the bowl
  ctx.strokeStyle = 'rgba(255, 241, 194, 0.72)';
  ctx.lineWidth = Math.max(1.1, r * 0.065);
  for (const ox of [-r * 0.3, -r * 0.12]) {
    ctx.beginPath();
    ctx.moveTo(ox, -r * 0.02);
    ctx.quadraticCurveTo(ox - r * 0.08, -r * 0.18, ox + r * 0.02, -r * 0.34);
    ctx.stroke();
  }
  ctx.restore();
}

/** Brass service cloche dome icon for the SERVE button. */
export function drawServiceCloche(ctx, cx, cy, size, ready) {
  ctx.save();
  ctx.translate(cx, cy);
  const g = ctx.createLinearGradient(-size, -size, size, size);
  g.addColorStop(0, ready ? '#fff6c7' : '#f1d693');
  g.addColorStop(0.5, ready ? '#f1c254' : '#d2a24a');
  g.addColorStop(1, '#9d6c1e');

  // Top knob
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -size * 0.56, size * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Dome
  ctx.beginPath();
  ctx.arc(0, size * 0.18, size * 0.66, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  // Specular curved highlight on dome
  ctx.strokeStyle = 'rgba(255, 255, 240, 0.65)';
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, size * 0.18, size * 0.48, Math.PI * 1.15, Math.PI * 1.48);
  ctx.stroke();

  // Platter tray base
  fillRoundRect(ctx, -size * 0.84, size * 0.18, size * 1.68, size * 0.17, size * 0.08, '#f8e6b5');
  ctx.restore();
}

/** Kitchen pedal trash bin icon. */
export function drawTrashBin(ctx, cx, cy, size, color = '#e4d5c3') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.8, size * 0.1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Lid handle
  ctx.beginPath();
  ctx.moveTo(-size * 0.24, -size * 0.54);
  ctx.lineTo(-size * 0.24, -size * 0.7);
  ctx.lineTo(size * 0.24, -size * 0.7);
  ctx.lineTo(size * 0.24, -size * 0.54);
  ctx.stroke();

  // Lid bar
  ctx.beginPath();
  ctx.moveTo(-size * 0.68, -size * 0.52);
  ctx.lineTo(size * 0.68, -size * 0.52);
  ctx.stroke();

  // Tapered bin body
  ctx.beginPath();
  ctx.moveTo(-size * 0.54, -size * 0.46);
  ctx.lineTo(-size * 0.42, size * 0.68);
  ctx.lineTo(size * 0.42, size * 0.68);
  ctx.lineTo(size * 0.54, -size * 0.46);
  ctx.closePath();
  ctx.stroke();

  // Vertical ribs
  for (const ox of [-size * 0.18, size * 0.18]) {
    ctx.beginPath();
    ctx.moveTo(ox, -size * 0.24);
    ctx.lineTo(ox * 0.85, size * 0.46);
    ctx.stroke();
  }
  ctx.restore();
}

/** Rising steam wisps (golden) or dark smoke puffs (burnt) above a burner. */
export function drawBurnerVapor(ctx, cx, cy, r, cookState, phase) {
  ctx.save();
  if (cookState === COOK_STATE.GOLDEN) {
    ctx.strokeStyle = 'rgba(255, 249, 232, 0.72)';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      const ox = (i - 1) * r * 0.34;
      const drift = Math.sin(phase * 2.4 + i * 1.9) * 5;
      const rise = ((phase * 18 + i * 14) % 24);
      ctx.globalAlpha = 0.72 - rise / 34;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy - r * 0.22 - rise * 0.4);
      ctx.bezierCurveTo(
        cx + ox - 8 + drift,
        cy - r * 0.52 - rise * 0.7,
        cx + ox + 8 - drift,
        cy - r * 0.78 - rise,
        cx + ox + drift * 0.5,
        cy - r * 1.02 - rise,
      );
      ctx.stroke();
    }
  } else if (cookState === COOK_STATE.BURNT) {
    for (let i = 0; i < 4; i += 1) {
      const t = (phase * 0.55 + i * 0.25) % 1;
      const sx = cx + Math.sin(phase * 2 + i * 2.2) * 14 + (i - 1.5) * 10;
      const sy = cy - r * 0.15 - t * r * 0.95;
      const rad = 10 + t * 14;
      ctx.fillStyle = `rgba(38, 34, 36, ${(1 - t) * 0.56})`;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draw any of the 10 ingredients centered at (cx, cy) with radius r and optional cook state. */
export function drawIngredientIcon(ctx, id, cookState, cx, cy, r) {
  const st = cookState || COOK_STATE.READY;
  ctx.save();
  ctx.translate(cx, cy);

  switch (id) {
    case 'greens': {
      // Layered crisp butter-lettuce & arugula leaves
      const leaves = [
        { ang: -0.55, dx: -r * 0.22, dy: r * 0.08, c1: '#62b852', c2: '#357d32' },
        { ang: 0.55, dx: r * 0.22, dy: r * 0.08, c1: '#53aa47', c2: '#2d722c' },
        { ang: 0, dx: 0, dy: -r * 0.08, c1: '#86d66c', c2: '#46973c' },
      ];
      for (const lf of leaves) {
        ctx.save();
        ctx.translate(lf.dx, lf.dy);
        ctx.rotate(lf.ang);
        const g = ctx.createRadialGradient(-r * 0.1, -r * 0.2, r * 0.05, 0, 0, r * 0.72);
        g.addColorStop(0, lf.c1);
        g.addColorStop(1, lf.c2);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.58);
        ctx.bezierCurveTo(-r * 0.62, r * 0.25, -r * 0.58, -r * 0.58, 0, -r * 0.66);
        ctx.bezierCurveTo(r * 0.58, -r * 0.58, r * 0.62, r * 0.25, 0, r * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#255c24';
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.stroke();
        // Crisp center vein
        ctx.strokeStyle = 'rgba(225, 250, 200, 0.75)';
        ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.beginPath();
        ctx.moveTo(0, r * 0.45);
        ctx.lineTo(0, -r * 0.38);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'tomato': {
      // Glossy sliced beefsteak tomato
      const outer = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r * 0.88);
      outer.addColorStop(0, '#f25c49');
      outer.addColorStop(0.75, '#d63628');
      outer.addColorStop(1, '#9b2016');
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = outer;
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.strokeStyle = '#7e1a12';
      ctx.stroke();

      // Inner pale-red flesh ring
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
      ctx.fillStyle = '#ea6c59';
      ctx.fill();

      // 4 seed chambers with golden-ivory seeds
      for (let i = 0; i < 4; i += 1) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = '#ba2b1e';
        ctx.beginPath();
        ctx.ellipse(r * 0.34, 0, r * 0.22, r * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fce5a2';
        ctx.beginPath();
        ctx.arc(r * 0.3, -r * 0.04, r * 0.05, 0, Math.PI * 2);
        ctx.arc(r * 0.4, r * 0.04, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Glossy crescent highlight
      ctx.strokeStyle = 'rgba(255, 240, 232, 0.55)';
      ctx.lineWidth = Math.max(1.2, r * 0.08);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, Math.PI * 1.12, Math.PI * 1.45);
      ctx.stroke();
      break;
    }

    case 'cheese': {
      // Rich aged cheddar wedge
      const g = ctx.createLinearGradient(-r * 0.8, -r * 0.6, r * 0.8, r * 0.7);
      g.addColorStop(0, '#ffe066');
      g.addColorStop(0.55, '#f2b229');
      g.addColorStop(1, '#cf8813');

      ctx.beginPath();
      ctx.moveTo(-r * 0.82, r * 0.44);
      ctx.lineTo(-r * 0.56, -r * 0.52);
      ctx.lineTo(r * 0.84, -r * 0.16);
      ctx.lineTo(r * 0.64, r * 0.6);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = Math.max(1.1, r * 0.06);
      ctx.strokeStyle = '#9c620b';
      ctx.stroke();

      // Top lighter bevel
      ctx.fillStyle = 'rgba(255, 247, 198, 0.52)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, -r * 0.44);
      ctx.lineTo(r * 0.74, -r * 0.13);
      ctx.lineTo(r * 0.66, -r * 0.02);
      ctx.lineTo(-r * 0.56, -r * 0.28);
      ctx.closePath();
      ctx.fill();

      // Cheese dimples
      ctx.fillStyle = '#c88012';
      ctx.beginPath();
      ctx.arc(-r * 0.16, r * 0.12, r * 0.14, 0, Math.PI * 2);
      ctx.arc(r * 0.26, r * 0.24, r * 0.11, 0, Math.PI * 2);
      ctx.arc(r * 0.18, -r * 0.08, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'bun': {
      // Toasted brioche bun with sesame seeds
      const topG = ctx.createRadialGradient(-r * 0.24, -r * 0.35, r * 0.08, 0, 0, r * 0.95);
      topG.addColorStop(0, '#f4c77b');
      topG.addColorStop(0.55, '#d58c3e');
      topG.addColorStop(1, '#9d5b1f');

      // Bottom heel peek
      fillRoundRect(ctx, -r * 0.78, r * 0.16, r * 1.56, r * 0.36, r * 0.16, '#c7833a');
      strokeRoundRect(ctx, -r * 0.78, r * 0.16, r * 1.56, r * 0.36, r * 0.16, '#7a4515', Math.max(1, r * 0.05));

      // Crumb middle line
      fillRoundRect(ctx, -r * 0.76, r * 0.05, r * 1.52, r * 0.16, r * 0.07, '#f8e6be');

      // Crown dome
      ctx.beginPath();
      ctx.moveTo(-r * 0.84, r * 0.12);
      ctx.bezierCurveTo(-r * 0.86, -r * 0.76, r * 0.86, -r * 0.76, r * 0.84, r * 0.12);
      ctx.closePath();
      ctx.fillStyle = topG;
      ctx.fill();
      ctx.strokeStyle = '#7a4515';
      ctx.lineWidth = Math.max(1, r * 0.055);
      ctx.stroke();

      // Sesame seeds
      ctx.fillStyle = '#fff5d9';
      const seeds = [
        [-0.36, -0.26, -0.3],
        [0, -0.36, 0.1],
        [0.36, -0.24, 0.35],
        [-0.18, -0.1, 0.2],
        [0.2, -0.08, -0.25],
      ];
      for (const [sx, sy, rot] of seeds) {
        ctx.save();
        ctx.translate(sx * r, sy * r);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.085, r * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'patty': {
      // Raw pink -> golden seared with grill marks -> charred burnt
      const isGolden = st === COOK_STATE.GOLDEN;
      const isBurnt = st === COOK_STATE.BURNT;
      const c0 = isBurnt ? '#3d3735' : isGolden ? '#9f5228' : '#d6746b';
      const c1 = isBurnt ? '#1c1817' : isGolden ? '#6b2f14' : '#a84740';
      const stroke = isBurnt ? '#0e0c0c' : isGolden ? '#441a08' : '#7b2c27';

      // Thick 3D side edge
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.14, r * 0.86, r * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top seared surface
      const pg = ctx.createRadialGradient(-r * 0.2, -r * 0.18, r * 0.08, 0, 0, r * 0.9);
      pg.addColorStop(0, c0);
      pg.addColorStop(1, c1);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.02, r * 0.86, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = Math.max(1.1, r * 0.055);
      ctx.strokeStyle = stroke;
      ctx.stroke();

      if (isGolden) {
        // Caramelized diagonal grill marks + juice sheen
        ctx.strokeStyle = 'rgba(42, 14, 4, 0.72)';
        ctx.lineWidth = Math.max(2, r * 0.11);
        ctx.lineCap = 'round';
        for (const ox of [-r * 0.34, 0, r * 0.34]) {
          ctx.beginPath();
          ctx.moveTo(ox - r * 0.16, -r * 0.28);
          ctx.lineTo(ox + r * 0.16, r * 0.24);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 224, 168, 0.26)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.24, -r * 0.18, r * 0.28, r * 0.1, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (isBurnt) {
        // Char cracks
        ctx.strokeStyle = 'rgba(130, 118, 112, 0.45)';
        ctx.lineWidth = Math.max(1.2, r * 0.06);
        ctx.beginPath();
        ctx.moveTo(-r * 0.38, -r * 0.14);
        ctx.lineTo(0, r * 0.04);
        ctx.lineTo(r * 0.34, -r * 0.1);
        ctx.moveTo(0, r * 0.04);
        ctx.lineTo(-r * 0.14, r * 0.26);
        ctx.stroke();
      } else {
        // Raw seasoning marbling dots
        ctx.fillStyle = 'rgba(255, 230, 225, 0.45)';
        for (const [mx, my] of [[-0.36, -0.08], [0.16, -0.16], [0.34, 0.1], [-0.1, 0.16]]) {
          ctx.beginPath();
          ctx.arc(mx * r, my * r, r * 0.065, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'egg': {
      const isGolden = st === COOK_STATE.GOLDEN;
      const isBurnt = st === COOK_STATE.BURNT;
      const isRaw = st === COOK_STATE.RAW;

      // Irregular organic fried egg white
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, -r * 0.12);
      ctx.bezierCurveTo(-r * 0.88, -r * 0.74, -r * 0.05, -r * 0.88, r * 0.38, -r * 0.64);
      ctx.bezierCurveTo(r * 0.94, -r * 0.42, r * 0.88, r * 0.46, r * 0.4, r * 0.68);
      ctx.bezierCurveTo(-r * 0.12, r * 0.86, -r * 0.78, r * 0.56, -r * 0.78, -r * 0.12);
      ctx.closePath();

      ctx.fillStyle = isBurnt ? '#483f39' : isRaw ? 'rgba(246, 243, 232, 0.82)' : '#fffdf7';
      ctx.fill();
      ctx.lineWidth = Math.max(1.2, r * 0.08);
      ctx.strokeStyle = isBurnt ? '#1c1816' : isGolden ? '#d99a3c' : '#d5ccb8';
      ctx.stroke();

      // Yolk
      const yg = ctx.createRadialGradient(-r * 0.08, -r * 0.1, r * 0.04, r * 0.05, 0, r * 0.42);
      if (isBurnt) {
        yg.addColorStop(0, '#6e5034');
        yg.addColorStop(1, '#2f2014');
      } else if (isRaw) {
        yg.addColorStop(0, '#ffe37a');
        yg.addColorStop(1, '#e5a72c');
      } else {
        yg.addColorStop(0, '#ffdf5e');
        yg.addColorStop(0.65, '#f29f1a');
        yg.addColorStop(1, '#c96f0c');
      }
      ctx.beginPath();
      ctx.arc(r * 0.06, 0, r * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = yg;
      ctx.fill();

      // Glossy yolk highlight
      if (!isBurnt) {
        ctx.fillStyle = 'rgba(255, 255, 240, 0.7)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.06, -r * 0.12, r * 0.12, r * 0.07, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'noodle': {
      const isGolden = st === COOK_STATE.GOLDEN;
      const isBurnt = st === COOK_STATE.BURNT;
      const baseColor = isBurnt ? '#2a2422' : isGolden ? '#e5a535' : '#efe1b9';
      const darkLine = isBurnt ? '#120f0e' : isGolden ? '#9f6514' : '#b7a06c';
      const gloss = isBurnt ? 'rgba(90,82,78,0.35)' : isGolden ? '#fff0b2' : '#fff8e2';

      // Nest oval cushion
      ctx.fillStyle = darkLine;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.08, r * 0.82, r * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wavy noodle strands
      ctx.lineCap = 'round';
      for (let row = -2; row <= 2; row += 1) {
        const y0 = row * r * 0.19;
        const span = Math.sqrt(Math.max(0.18, 1 - (row * row) / 7)) * r * 0.76;
        ctx.strokeStyle = darkLine;
        ctx.lineWidth = Math.max(2.6, r * 0.21);
        ctx.beginPath();
        ctx.moveTo(-span, y0);
        ctx.bezierCurveTo(-span * 0.35, y0 - r * 0.22, span * 0.35, y0 + r * 0.22, span, y0);
        ctx.stroke();

        ctx.strokeStyle = baseColor;
        ctx.lineWidth = Math.max(1.8, r * 0.14);
        ctx.stroke();

        ctx.strokeStyle = gloss;
        ctx.lineWidth = Math.max(0.8, r * 0.045);
        ctx.beginPath();
        ctx.moveTo(-span * 0.7, y0 - r * 0.04);
        ctx.quadraticCurveTo(-span * 0.2, y0 - r * 0.14, span * 0.15, y0 - r * 0.02);
        ctx.stroke();
      }
      break;
    }

    case 'scallion': {
      // Cluster of freshly sliced emerald & ivory spring-onion rings
      const rings = [
        { x: -0.34, y: 0.18, s: 0.34 },
        { x: 0.32, y: 0.2, s: 0.32 },
        { x: 0.0, y: -0.22, s: 0.36 },
        { x: -0.24, y: -0.18, s: 0.26 },
        { x: 0.28, y: -0.14, s: 0.27 },
      ];
      for (const rg of rings) {
        ctx.save();
        ctx.translate(rg.x * r, rg.y * r);
        ctx.fillStyle = '#2f8a42';
        ctx.beginPath();
        ctx.arc(0, 0, rg.s * r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d5d2b';
        ctx.lineWidth = Math.max(0.8, r * 0.045);
        ctx.stroke();

        ctx.fillStyle = '#d7f3c8';
        ctx.beginPath();
        ctx.arc(0, 0, rg.s * r * 0.64, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#53b35c';
        ctx.beginPath();
        ctx.arc(0, 0, rg.s * r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'batter': {
      const isGolden = st === COOK_STATE.GOLDEN;
      const isBurnt = st === COOK_STATE.BURNT;

      if (st === COOK_STATE.RAW || st === COOK_STATE.READY) {
        // Creamy raw batter pour with soft bubbles
        const bg = ctx.createRadialGradient(-r * 0.15, -r * 0.18, r * 0.05, 0, 0, r * 0.85);
        bg.addColorStop(0, '#fff9eb');
        bg.addColorStop(1, '#e8d2a6');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.02, r * 0.84, r * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c4a776';
        ctx.lineWidth = Math.max(1, r * 0.055);
        ctx.stroke();
        // Tiny batter bubbles
        ctx.strokeStyle = 'rgba(176, 145, 96, 0.55)';
        ctx.lineWidth = Math.max(0.9, r * 0.04);
        for (const [bx, by, br] of [[-0.28, -0.1, 0.09], [0.22, -0.16, 0.07], [0.06, 0.16, 0.08]]) {
          ctx.beginPath();
          ctx.arc(bx * r, by * r, br * r, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // Fluffy griddle pancake (golden or burnt)
        const rim = isBurnt ? '#1d1816' : '#f3d8a3';
        const top0 = isBurnt ? '#3d3430' : '#df9842';
        const top1 = isBurnt ? '#1c1715' : '#b2681f';

        // Thick fluffy pancake rim
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.14, r * 0.86, r * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isBurnt ? '#0e0c0b' : '#854c15';
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.stroke();

        // Griddled golden top
        const tg = ctx.createRadialGradient(-r * 0.18, -r * 0.12, r * 0.08, 0, 0, r * 0.82);
        tg.addColorStop(0, top0);
        tg.addColorStop(1, top1);
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.02, r * 0.78, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Small butter pat on golden pancake
        if (isGolden) {
          fillRoundRect(ctx, -r * 0.2, -r * 0.15, r * 0.4, r * 0.24, r * 0.06, '#fff29c');
          strokeRoundRect(ctx, -r * 0.2, -r * 0.15, r * 0.4, r * 0.24, r * 0.06, '#d9ab32', Math.max(0.8, r * 0.04));
        }
      }
      break;
    }

    case 'berry': {
      // Plump blueberries + ruby raspberry + small leaf
      // Tiny green leaf sprig behind
      ctx.fillStyle = '#479443';
      ctx.beginPath();
      ctx.ellipse(-r * 0.36, -r * 0.42, r * 0.32, r * 0.14, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 0.32, -r * 0.44, r * 0.28, r * 0.13, 0.45, 0, Math.PI * 2);
      ctx.fill();

      const berries = [
        { x: -0.34, y: 0.12, br: 0.36, c0: '#6f64c2', c1: '#332b73', hi: '#c9c4f5' },
        { x: 0.34, y: 0.14, br: 0.35, c0: '#6358b8', c1: '#2e266a', hi: '#c9c4f5' },
        { x: 0.0, y: -0.14, br: 0.38, c0: '#e84d6f', c1: '#9c1d3d', hi: '#ffbac8' },
      ];
      for (const b of berries) {
        const g = ctx.createRadialGradient(
          (b.x - 0.12) * r,
          (b.y - 0.14) * r,
          r * 0.04,
          b.x * r,
          b.y * r,
          b.br * r,
        );
        g.addColorStop(0, b.c0);
        g.addColorStop(1, b.c1);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x * r, b.y * r, b.br * r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(20, 12, 34, 0.55)';
        ctx.lineWidth = Math.max(0.8, r * 0.045);
        ctx.stroke();

        ctx.fillStyle = b.hi;
        ctx.beginPath();
        ctx.arc((b.x - 0.11) * r, (b.y - 0.11) * r, b.br * r * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

/**
 * Draw mouth-watering layered plated dishes on the porcelain chef's plate.
 * Automatically composes recognizable gourmet presentations for each dish as it is assembled!
 */
export function drawPlatedDish(ctx, plate, cx, cy, r) {
  if (!plate || plate.length === 0) return;

  const counts = countIngredients(plate);
  const findItem = (id) => plate.find((it) => it.id === id) || null;
  const ids = Object.keys(counts);

  const isSubset = (allowed) => ids.every((id) => allowed.includes(id));

  // 1. SUNRISE BURGER (open-faced mid-assembly shows every layer clearly; crowned when complete!)
  if ((counts.bun || counts.patty) && isSubset(['bun', 'patty', 'cheese', 'greens'])) {
    const hasBun = Boolean(counts.bun);
    const patty = findItem('patty');
    const hasCheese = Boolean(counts.cheese);
    const hasGreens = Boolean(counts.greens);
    const complete = hasBun && patty && hasCheese && hasGreens;

    ctx.save();
    ctx.translate(cx, cy + r * 0.18);

    // Warm dish contact shadow on porcelain
    ctx.fillStyle = 'rgba(58, 36, 18, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.26, r * 0.72, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    let y = r * 0.16;

    // Bottom toasted brioche bun heel
    if (hasBun) {
      const heelG = ctx.createLinearGradient(-r * 0.65, y - r * 0.18, r * 0.65, y + r * 0.22);
      heelG.addColorStop(0, '#e3a659');
      heelG.addColorStop(0.55, '#c67d32');
      heelG.addColorStop(1, '#92531c');
      ctx.fillStyle = heelG;
      ctx.beginPath();
      ctx.ellipse(0, y, r * 0.66, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#703d12';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cut toasted crumb surface
      ctx.fillStyle = '#fae7c1';
      ctx.beginPath();
      ctx.ellipse(0, y - r * 0.08, r * 0.61, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      y -= r * 0.17;
    }

    // Thick seared burger patty
    if (patty) {
      const isGolden = patty.state === COOK_STATE.GOLDEN;
      const isBurnt = patty.state === COOK_STATE.BURNT;
      const side = isBurnt ? '#141110' : isGolden ? '#4c1e0a' : '#85302a';
      const top0 = isBurnt ? '#3b3533' : isGolden ? '#a35428' : '#db7a70';
      const top1 = isBurnt ? '#1c1817' : isGolden ? '#6d3015' : '#b24b44';

      ctx.fillStyle = side;
      ctx.beginPath();
      ctx.ellipse(0, y + r * 0.08, r * 0.68, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      const pg = ctx.createRadialGradient(-r * 0.18, y - r * 0.12, r * 0.06, 0, y, r * 0.72);
      pg.addColorStop(0, top0);
      pg.addColorStop(1, top1);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(0, y - r * 0.04, r * 0.68, r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = side;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isGolden) {
        ctx.strokeStyle = 'rgba(38, 12, 4, 0.75)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (const ox of [-r * 0.28, 0, r * 0.28]) {
          ctx.beginPath();
          ctx.moveTo(ox - r * 0.1, y - r * 0.18);
          ctx.lineTo(ox + r * 0.12, y + r * 0.1);
          ctx.stroke();
        }
      }
      y -= r * 0.15;
    }

    // Melted cheddar cheese slice with draped corners
    if (hasCheese) {
      const cg = ctx.createLinearGradient(-r * 0.6, y - r * 0.18, r * 0.6, y + r * 0.26);
      cg.addColorStop(0, '#ffe470');
      cg.addColorStop(0.6, '#f4b526');
      cg.addColorStop(1, '#d38a12');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-r * 0.68, y + r * 0.04);
      ctx.quadraticCurveTo(-r * 0.34, y - r * 0.22, 0, y - r * 0.22);
      ctx.quadraticCurveTo(r * 0.38, y - r * 0.22, r * 0.68, y + r * 0.02);
      ctx.lineTo(r * 0.56, y + r * 0.24);
      ctx.quadraticCurveTo(r * 0.26, y + r * 0.1, 0, y + r * 0.28);
      ctx.quadraticCurveTo(-r * 0.28, y + r * 0.1, -r * 0.58, y + r * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a3640a';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Soft warm highlight on melted cheese
      ctx.fillStyle = 'rgba(255, 252, 212, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.14, y - r * 0.05, r * 0.34, r * 0.08, -0.1, 0, Math.PI * 2);
      ctx.fill();
      y -= r * 0.14;
    }

    // Crisp ruffled greens
    if (hasGreens) {
      for (let i = -3; i <= 3; i += 1) {
        const lx = i * r * 0.21;
        const ly = y + Math.abs(i) * r * 0.03;
        ctx.fillStyle = i % 2 === 0 ? '#68c352' : '#4ba03d';
        ctx.beginPath();
        ctx.ellipse(lx, ly, r * 0.22, r * 0.14, i * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2d6e26';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
      y -= r * 0.15;
    }

    // Glossy sesame crown bun — caps the burger cleanly when complete (or rests slightly aside when open-faced)
    if (hasBun && complete) {
      const crownG = ctx.createRadialGradient(-r * 0.22, y - r * 0.32, r * 0.06, 0, y, r * 0.78);
      crownG.addColorStop(0, '#f7ce83');
      crownG.addColorStop(0.55, '#d68937');
      crownG.addColorStop(1, '#945218');
      ctx.fillStyle = crownG;
      ctx.beginPath();
      ctx.moveTo(-r * 0.66, y + r * 0.08);
      ctx.bezierCurveTo(-r * 0.68, y - r * 0.56, r * 0.68, y - r * 0.56, r * 0.66, y + r * 0.08);
      ctx.quadraticCurveTo(0, y + r * 0.18, -r * 0.66, y + r * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#703d12';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Specular glaze
      ctx.fillStyle = 'rgba(255, 245, 214, 0.32)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, y - r * 0.22, r * 0.24, r * 0.09, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Sesame seeds
      ctx.fillStyle = '#fff5d9';
      const seeds = [
        [-0.32, -0.14, -0.3],
        [-0.08, -0.26, 0.15],
        [0.18, -0.24, -0.2],
        [0.36, -0.1, 0.35],
        [0.02, -0.06, 0.05],
        [-0.22, 0.0, 0.25],
      ];
      for (const [sx, sy, rot] of seeds) {
        ctx.save();
        ctx.translate(sx * r, y + sy * r);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.055, r * 0.028, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
    return;
  }

  // 2. BERRY PANCAKE STACK
  if (counts.batter && isSubset(['batter', 'berry'])) {
    const batters = plate.filter((it) => it.id === 'batter');
    const hasBerry = Boolean(counts.berry);

    ctx.save();
    ctx.translate(cx, cy + r * 0.16);
    ctx.fillStyle = 'rgba(58, 36, 18, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.24, r * 0.68, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    let y = r * 0.14;
    for (let i = 0; i < batters.length; i += 1) {
      drawIngredientIcon(ctx, 'batter', batters[i].state, 0, y, r * 0.72);
      y -= r * 0.22;
    }

    // Maple syrup drizzle when both pancakes are golden
    if (batters.length >= 2 && batters.every((b) => b.state === COOK_STATE.GOLDEN)) {
      ctx.fillStyle = 'rgba(181, 88, 16, 0.78)';
      ctx.beginPath();
      ctx.ellipse(0, y + r * 0.16, r * 0.42, r * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.34, y + r * 0.28, r * 0.07, 0, Math.PI * 2);
      ctx.arc(-r * 0.28, y + r * 0.32, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }

    if (hasBerry) {
      drawIngredientIcon(ctx, 'berry', COOK_STATE.READY, 0, y + r * 0.04, r * 0.42);
    }
    ctx.restore();
    return;
  }

  // 3. MISO NOODLE BOWL
  if (counts.noodle && isSubset(['noodle', 'egg', 'scallion'])) {
    const noodle = findItem('noodle');
    const egg = findItem('egg');
    const hasScallion = Boolean(counts.scallion);

    ctx.save();
    ctx.translate(cx, cy);
    // Ceramic ramen bowl
    ctx.fillStyle = '#253244';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4a045';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rich amber miso broth
    const bg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.08, 0, 0, r * 0.74);
    bg.addColorStop(0, '#c87f2b');
    bg.addColorStop(1, '#844813');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.73, 0, Math.PI * 2);
    ctx.fill();

    drawIngredientIcon(ctx, 'noodle', noodle.state, -r * 0.04, r * 0.06, r * 0.64);
    if (egg) drawIngredientIcon(ctx, 'egg', egg.state, r * 0.24, -r * 0.14, r * 0.38);
    if (hasScallion) drawIngredientIcon(ctx, 'scallion', COOK_STATE.READY, -r * 0.24, -r * 0.18, r * 0.34);
    ctx.restore();
    return;
  }

  // 4. GARDEN SALAD
  if (counts.greens && isSubset(['greens', 'tomato', 'egg'])) {
    const hasTomato = Boolean(counts.tomato);
    const egg = findItem('egg');
    ctx.save();
    ctx.translate(cx, cy);
    drawIngredientIcon(ctx, 'greens', COOK_STATE.READY, -r * 0.18, r * 0.06, r * 0.56);
    drawIngredientIcon(ctx, 'greens', COOK_STATE.READY, r * 0.2, r * 0.04, r * 0.54);
    if (hasTomato) {
      drawIngredientIcon(ctx, 'tomato', COOK_STATE.READY, -r * 0.26, -r * 0.14, r * 0.34);
      drawIngredientIcon(ctx, 'tomato', COOK_STATE.READY, r * 0.26, r * 0.18, r * 0.3);
    }
    if (egg) {
      drawIngredientIcon(ctx, 'egg', egg.state, r * 0.08, -r * 0.08, r * 0.44);
    }
    ctx.restore();
    return;
  }

  // 5. GOLDEN OMELETTE
  if (counts.egg && isSubset(['egg', 'cheese', 'tomato'])) {
    const egg = findItem('egg');
    const hasCheese = Boolean(counts.cheese);
    const hasTomato = Boolean(counts.tomato);
    const isGolden = egg.state === COOK_STATE.GOLDEN;
    const isBurnt = egg.state === COOK_STATE.BURNT;

    ctx.save();
    ctx.translate(cx, cy + r * 0.06);
    if (hasCheese || hasTomato) {
      // Plump folded bistro omelette
      const og = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.08, 0, 0, r * 0.8);
      if (isBurnt) {
        og.addColorStop(0, '#4d3e31');
        og.addColorStop(1, '#231b15');
      } else if (isGolden) {
        og.addColorStop(0, '#ffea80');
        og.addColorStop(0.65, '#f1b529');
        og.addColorStop(1, '#c68014');
      } else {
        og.addColorStop(0, '#fff4be');
        og.addColorStop(1, '#e8ce72');
      }
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.72, r * 0.44, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isBurnt ? '#14100d' : '#9c620b';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (hasCheese) {
        // Melted cheese fold peek
        ctx.fillStyle = '#ffe052';
        ctx.beginPath();
        ctx.moveTo(-r * 0.56, r * 0.08);
        ctx.quadraticCurveTo(0, r * 0.26, r * 0.56, r * 0.02);
        ctx.quadraticCurveTo(0, r * 0.4, -r * 0.56, r * 0.08);
        ctx.fill();
      }
      if (hasTomato) {
        drawIngredientIcon(ctx, 'tomato', COOK_STATE.READY, -r * 0.2, -r * 0.14, r * 0.24);
        drawIngredientIcon(ctx, 'tomato', COOK_STATE.READY, r * 0.18, -r * 0.04, r * 0.22);
      }
    } else {
      drawIngredientIcon(ctx, 'egg', egg.state, 0, -r * 0.04, r * 0.62);
    }
    ctx.restore();
    return;
  }

  // Fallback for any arbitrary combination: clean non-overlapping cluster
  const n = plate.length;
  const itemR = n === 1 ? r * 0.62 : n === 2 ? r * 0.44 : r * 0.36;
  const ringR = n === 1 ? 0 : r * 0.36;
  for (let i = 0; i < n; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / n;
    const ix = cx + Math.cos(angle) * ringR;
    const iy = cy + Math.sin(angle) * ringR;
    drawIngredientIcon(ctx, plate[i].id, plate[i].state, ix, iy, itemR);
  }
}
