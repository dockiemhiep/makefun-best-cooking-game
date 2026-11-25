// Complete 1280x720 warm bistro kitchen renderer for The Golden Ladle.
// Paints HUD, Order Board, Contextual Hint Bar, Double Stove Range with golden progress rings,
// Assembly Plate with layered dishes, Service Station, 10 Ingredient Stations, popups, and overlays.
import { FONTS, LAYOUT, PALETTE, RULES, STAGE } from './config.js';
import {
  COOK_STATE,
  INGREDIENT_BY_ID,
  INGREDIENTS,
  RECIPE_BY_ID,
  RECIPES,
} from './recipes.js';
import { getComboMultiplier, getStarsForCoins } from './world.js';
import {
  drawBurnerVapor,
  drawClock,
  drawCoin,
  drawFlame,
  drawIngredientIcon,
  drawLadleCrest,
  drawPauseIcon,
  drawPlatedDish,
  drawServiceCloche,
  drawSpeaker,
  drawStar,
  drawStrikeMark,
  drawTrashBin,
  fillRoundRect,
  roundRectPath,
  strokeRoundRect,
} from './art.js';

export const SCREEN = {
  TITLE: 'title',
  PLAY: 'play',
  PAUSED: 'paused',
  RESULTS: 'results',
  FAILED: 'failed',
};

/** Exact hit rects for overlay buttons (shared with input.js so clicks never drift). */
export const OVERLAY_RECTS = {
  titleStart: { x: 470, y: 486, w: 340, h: 54 },
  pauseResume: { x: 486, y: 368, w: 308, h: 52 },
  pauseRestart: { x: 486, y: 434, w: 308, h: 48 },
  resultsNext: { x: 376, y: 476, w: 256, h: 54 },
  resultsReplay: { x: 648, y: 476, w: 256, h: 54 },
  failedRetry: { x: 476, y: 476, w: 328, h: 54 },
};

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function getStationRect(index) {
  const { y, w, h, gap } = LAYOUT.station;
  return {
    x: LAYOUT.marginX + index * (w + gap),
    y,
    w,
    h,
  };
}

export function getOrderCardRect(slotIndex) {
  const { y, w, h, gap } = LAYOUT.orderCard;
  return {
    x: LAYOUT.marginX + slotIndex * (w + gap),
    y,
    w,
    h,
  };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, dpr: 1 };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    view.dpr = dpr;
    view.scale = Math.min(width / STAGE.width, height / STAGE.height);
    view.x = (width - STAGE.width * view.scale) / 2;
    view.y = (height - STAGE.height * view.scale) / 2;
  }

  function clientToStage(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * view.dpr;
    const py = (clientY - rect.top) * view.dpr;
    return {
      x: (px - view.x) / view.scale,
      y: (py - view.y) / view.scale,
    };
  }

  function setFont(weight, size, family = FONTS.ui) {
    ctx.font = `${weight} ${size}px ${family}`;
  }

  /** Unified dark-espresso keycap badge used consistently across stations, burners, serve, and trash. */
  function drawKeycap(x, y, w, h, label, accentBorder = 'rgba(212, 160, 69, 0.5)') {
    fillRoundRect(ctx, x, y, w, h, 6, '#2a1f18');
    strokeRoundRect(ctx, x, y, w, h, 6, accentBorder, 1.2);
    setFont('700', w > 36 ? 10.5 : 11.5);
    ctx.fillStyle = PALETTE.creamText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  }

  function drawKitchenBackdrop() {
    const wallTop = LAYOUT.orderBoard.y;
    const wallH = LAYOUT.counter.y - wallTop;
    const tileW = 64;
    const tileH = 34;

    ctx.fillStyle = PALETTE.tileLight;
    ctx.fillRect(0, wallTop, STAGE.width, wallH);

    for (let row = 0; row * tileH < wallH; row += 1) {
      const ty = wallTop + row * tileH;
      const offset = (row % 2) * (tileW / 2);
      for (let col = -1; col * tileW < STAGE.width + tileW; col += 1) {
        const tx = col * tileW + offset;
        if ((row + col) % 3 === 0) {
          ctx.fillStyle = PALETTE.tileAlt;
          ctx.fillRect(tx, ty, tileW, tileH);
        }
        ctx.strokeStyle = PALETTE.tileGrout;
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 0.5, ty + 0.5, tileW, tileH);
      }
    }

    // Overhead warm pendant light pools
    for (const lx of [222, 640, 1058]) {
      const glow = ctx.createRadialGradient(lx, wallTop + 6, 12, lx, wallTop + 56, 260);
      glow.addColorStop(0, 'rgba(255, 226, 152, 0.34)');
      glow.addColorStop(0.55, 'rgba(255, 214, 134, 0.12)');
      glow.addColorStop(1, 'rgba(255, 214, 134, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 260, wallTop, 520, wallH);
    }

    const topShadow = ctx.createLinearGradient(0, wallTop, 0, wallTop + 18);
    topShadow.addColorStop(0, 'rgba(27, 17, 12, 0.24)');
    topShadow.addColorStop(1, 'rgba(27, 17, 12, 0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(0, wallTop, STAGE.width, 18);

    // Forged-iron & brass ticket rail
    const ry = LAYOUT.orderRailY;
    fillRoundRect(ctx, 16, ry - 4, STAGE.width - 32, 8, 4, PALETTE.railIron);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(24, ry - 2, STAGE.width - 48, 2);

    // Butcher-block oak countertop
    const cy = LAYOUT.counter.y;
    ctx.fillStyle = PALETTE.woodTrim;
    ctx.fillRect(0, cy - 3, STAGE.width, 5);
    ctx.fillStyle = '#d99e63';
    ctx.fillRect(0, cy + 2, STAGE.width, 4);

    const woodGrad = ctx.createLinearGradient(0, cy + 6, 0, LAYOUT.prepRail.y);
    woodGrad.addColorStop(0, PALETTE.woodTop);
    woodGrad.addColorStop(0.55, PALETTE.woodMid);
    woodGrad.addColorStop(1, '#8c5529');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, cy + 6, STAGE.width, LAYOUT.prepRail.y - (cy + 6));

    ctx.strokeStyle = 'rgba(71, 42, 21, 0.22)';
    ctx.lineWidth = 1;
    for (let py = cy + 36; py < LAYOUT.prepRail.y; py += 38) {
      ctx.beginPath();
      ctx.moveTo(0, py + 0.5);
      ctx.lineTo(STAGE.width, py + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 224, 178, 0.14)';
    for (let py = cy + 37; py < LAYOUT.prepRail.y; py += 38) {
      ctx.beginPath();
      ctx.moveTo(0, py + 0.5);
      ctx.lineTo(STAGE.width, py + 0.5);
      ctx.stroke();
    }

    // Recessed walnut prep rail along counter front
    const railG = ctx.createLinearGradient(0, LAYOUT.prepRail.y, 0, STAGE.height);
    railG.addColorStop(0, '#3a271b');
    railG.addColorStop(0.12, '#4a3324');
    railG.addColorStop(1, '#2a1b12');
    ctx.fillStyle = railG;
    ctx.fillRect(0, LAYOUT.prepRail.y, STAGE.width, STAGE.height - LAYOUT.prepRail.y);

    ctx.fillStyle = '#c8963e';
    ctx.fillRect(0, LAYOUT.prepRail.y, STAGE.width, 2);

    ctx.fillStyle = '#1b110c';
    ctx.fillRect(0, 708, STAGE.width, 12);
  }

  function drawHud(state, ui) {
    const g = ctx.createLinearGradient(0, 0, 0, LAYOUT.hud.h);
    g.addColorStop(0, PALETTE.hudBg);
    g.addColorStop(1, PALETTE.hudBgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE.width, LAYOUT.hud.h);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(0, LAYOUT.hud.h - 2, STAGE.width, 2);

    // Left: Emblem + Title + Shift pill
    drawLadleCrest(ctx, 44, 29, 19);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    setFont('700', 21, FONTS.display);
    ctx.fillStyle = PALETTE.creamText;
    ctx.fillText('The Golden Ladle', 72, 29);

    fillRoundRect(ctx, 256, 17, 74, 24, 12, 'rgba(212, 160, 69, 0.16)');
    strokeRoundRect(ctx, 256, 17, 74, 24, 12, 'rgba(212, 160, 69, 0.45)', 1);
    setFont('600', 12);
    ctx.fillStyle = PALETTE.brassBright;
    ctx.textAlign = 'center';
    ctx.fillText(`SHIFT ${state.shiftNumber}`, 293, 29);

    // Shift Timer
    const urgentTime = state.timeLeft <= 15;
    const warnTime = !urgentTime && state.timeLeft <= 30;
    const timerColor = urgentTime ? PALETTE.crimsonBright : warnTime ? PALETTE.amber : PALETTE.creamText;
    fillRoundRect(ctx, 368, 11, 132, 36, 10, 'rgba(255, 245, 224, 0.06)');
    strokeRoundRect(ctx, 368, 11, 132, 36, 10, urgentTime ? PALETTE.crimson : 'rgba(212, 160, 69, 0.25)', 1);
    drawClock(ctx, 392, 29, 10, urgentTime ? PALETTE.crimsonBright : PALETTE.brassBright);
    setFont('700', 22);
    ctx.fillStyle = timerColor;
    ctx.textAlign = 'left';
    ctx.fillText(formatClock(state.timeLeft), 412, 30);

    // Coins + dynamic-spaced Goal / Star Progress
    const [s1, s2, s3] = RULES.starThresholds;
    const goalMet = state.coins >= s1;
    const maxedStars = state.coins >= s3;
    const targetForBar = state.coins >= s2 ? s3 : state.coins >= s1 ? s2 : s1;
    const progress = maxedStars ? 1 : Math.min(1, state.coins / targetForBar);
    const coinNote = maxedStars
      ? 'All 3 stars!'
      : state.coins >= s2
        ? `2 stars · next ${s3}`
        : goalMet
          ? `Goal met · next ${s2}`
          : `/ ${s1} goal`;

    fillRoundRect(ctx, 514, 11, 232, 36, 10, 'rgba(255, 245, 224, 0.06)');
    strokeRoundRect(
      ctx,
      514,
      11,
      232,
      36,
      10,
      goalMet ? 'rgba(71, 199, 126, 0.55)' : 'rgba(212, 160, 69, 0.25)',
      1,
    );
    drawCoin(ctx, 536, 29, 11);
    setFont('700', 20);
    ctx.fillStyle = PALETTE.brassBright;
    ctx.textAlign = 'left';
    const coinStr = String(state.coins);
    ctx.fillText(coinStr, 554, 24);
    const numW = ctx.measureText(coinStr).width;
    setFont('600', 12);
    ctx.fillStyle = maxedStars ? '#ffe994' : goalMet ? PALETTE.greenBright : PALETTE.creamMuted;
    ctx.fillText(coinNote, 554 + numW + 8, 24);

    // Progress bar beneath coins
    fillRoundRect(ctx, 554, 36, 178, 5, 2.5, 'rgba(255, 255, 255, 0.12)');
    if (progress > 0) {
      fillRoundRect(
        ctx,
        554,
        36,
        Math.max(6, 178 * progress),
        5,
        2.5,
        maxedStars ? '#ffd447' : goalMet ? PALETTE.greenBright : PALETTE.brassBright,
      );
    }

    // Combo Meter
    const mult = getComboMultiplier(state.combo);
    const hotCombo = mult >= 3;
    const warmCombo = mult === 2;
    const comboBg = hotCombo
      ? 'rgba(212, 160, 69, 0.28)'
      : warmCombo
        ? 'rgba(212, 160, 69, 0.14)'
        : 'rgba(255, 245, 224, 0.06)';
    const comboStroke = hotCombo ? PALETTE.brassBright : warmCombo ? PALETTE.brass : 'rgba(212, 160, 69, 0.25)';

    fillRoundRect(ctx, 760, 11, 168, 36, 10, comboBg);
    strokeRoundRect(ctx, 760, 11, 168, 36, 10, comboStroke, hotCombo ? 1.8 : 1);
    setFont('600', 12);
    ctx.fillStyle = PALETTE.creamMuted;
    ctx.textAlign = 'left';
    ctx.fillText('COMBO', 774, 29);

    setFont('800', 21);
    ctx.fillStyle = hotCombo ? '#fff0a6' : warmCombo ? PALETTE.brassBright : PALETTE.creamText;
    ctx.textAlign = 'center';
    ctx.fillText(`x${mult}`, 846, 30);

    for (let p = 0; p < 3; p += 1) {
      const lit = state.combo > p;
      ctx.beginPath();
      ctx.arc(882 + p * 14, 29, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = lit ? (hotCombo ? '#ffe57a' : PALETTE.greenBright) : 'rgba(255, 245, 224, 0.22)';
      ctx.fill();
    }

    // Strikes
    const strikeBg = state.strikeFlash > 0 ? 'rgba(201, 67, 56, 0.35)' : 'rgba(255, 245, 224, 0.06)';
    fillRoundRect(ctx, 942, 11, 212, 36, 10, strikeBg);
    strokeRoundRect(
      ctx,
      942,
      11,
      212,
      36,
      10,
      state.strikes >= 2 ? PALETTE.crimson : 'rgba(212, 160, 69, 0.25)',
      1,
    );
    setFont('600', 12);
    ctx.fillStyle = state.strikes > 0 ? '#f3b6ae' : PALETTE.creamMuted;
    ctx.textAlign = 'left';
    ctx.fillText('STRIKES', 956, 29);

    for (let s = 0; s < RULES.maxStrikes; s += 1) {
      drawStrikeMark(ctx, 1044 + s * 34, 29, 12, s < state.strikes);
    }

    // Mute & Pause controls
    const drawHudIconBtn = (rect, hovered, active, drawIconFn) => {
      fillRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        10,
        active
          ? 'rgba(212, 160, 69, 0.26)'
          : hovered
            ? 'rgba(255, 245, 224, 0.16)'
            : 'rgba(255, 245, 224, 0.07)',
      );
      strokeRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        10,
        hovered || active ? PALETTE.brassBright : 'rgba(212, 160, 69, 0.3)',
        1.2,
      );
      drawIconFn(rect.x + rect.w / 2, rect.y + rect.h / 2);
    };

    drawHudIconBtn(LAYOUT.muteBtn, ui.hoverId === 'mute', ui.muted, (cx, cy) => {
      drawSpeaker(ctx, cx, cy, 11, ui.muted, PALETTE.creamText);
    });
    drawHudIconBtn(LAYOUT.pauseBtn, ui.hoverId === 'pause', ui.screen === SCREEN.PAUSED, (cx, cy) => {
      drawPauseIcon(ctx, cx, cy, 11, ui.screen === SCREEN.PAUSED, PALETTE.creamText);
    });
  }

  function drawOrderCard(order, slotIndex, highlighted, servedBadgeText) {
    const rect = getOrderCardRect(slotIndex);
    const recipe = RECIPE_BY_ID[order.recipeId];
    const ratio = Math.max(0, Math.min(1, order.patience / order.maxPatience));
    const lowPatience = ratio < 0.28;
    const medPatience = !lowPatience && ratio < 0.55;

    ctx.save();

    fillRoundRect(ctx, rect.x + 2, rect.y + 5, rect.w, rect.h, 12, 'rgba(42, 26, 15, 0.18)');
    fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, highlighted ? PALETTE.cardHighlight : PALETTE.cardPaper);

    if (highlighted) {
      // Crisp tight emerald highlight border (stays cleanly clear of brass rail above and hint bar below)
      strokeRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, PALETTE.green, 2.8);
      strokeRoundRect(ctx, rect.x - 1.5, rect.y - 1.5, rect.w + 3, rect.h + 3, 13.5, 'rgba(71, 199, 126, 0.3)', 2);
    } else {
      strokeRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        12,
        lowPatience ? PALETTE.crimson : PALETTE.cardBorder,
        lowPatience ? 2 : 1.4,
      );
    }

    // Brass ticket clip
    fillRoundRect(ctx, rect.x + rect.w / 2 - 18, rect.y - 10, 36, 15, 4, PALETTE.brass);
    strokeRoundRect(ctx, rect.x + rect.w / 2 - 18, rect.y - 10, 36, 15, 4, PALETTE.brassDark, 1);
    ctx.beginPath();
    ctx.arc(rect.x + rect.w / 2, rect.y - 2.5, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#3a2614';
    ctx.fill();

    // Dish name + price or SERVED badge
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    setFont('700', 19, FONTS.display);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.fillText(recipe.name, rect.x + 16, rect.y + 26);

    if (highlighted && servedBadgeText) {
      fillRoundRect(ctx, rect.x + rect.w - 104, rect.y + 13, 88, 25, 12.5, PALETTE.green);
      setFont('800', 12);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(servedBadgeText, rect.x + rect.w - 60, rect.y + 26);
    } else {
      fillRoundRect(ctx, rect.x + rect.w - 76, rect.y + 13, 60, 25, 12.5, '#f4e6c8');
      strokeRoundRect(ctx, rect.x + rect.w - 76, rect.y + 13, 60, 25, 12.5, '#d7b778', 1);
      drawCoin(ctx, rect.x + rect.w - 61, rect.y + 25.5, 8);
      setFont('700', 14);
      ctx.fillStyle = PALETTE.inkDark;
      ctx.textAlign = 'left';
      ctx.fillText(`${recipe.price}`, rect.x + rect.w - 48, rect.y + 26);
    }

    ctx.fillStyle = '#eadcc3';
    ctx.fillRect(rect.x + 16, rect.y + 44, rect.w - 32, 1);

    // Harmonized step tiles with generous + connector breathing room
    const steps = recipe.steps;
    const stepW = steps.length === 4 ? 76 : 94;
    const stepGap = 18;
    const totalRowW = steps.length * stepW + (steps.length - 1) * stepGap;
    const startX = rect.x + (rect.w - totalRowW) / 2;
    const rowY = rect.y + 52;
    const rowH = 58;

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const spec = INGREDIENT_BY_ID[step.id];
      const sx = startX + i * (stepW + stepGap);

      fillRoundRect(ctx, sx, rowY, stepW, rowH, 9, step.cooked ? '#fdf3dc' : '#f7f1e5');
      strokeRoundRect(
        ctx,
        sx,
        rowY,
        stepW,
        rowH,
        9,
        step.cooked ? '#dda240' : '#dfd2ba',
        step.cooked ? 1.4 : 1,
      );

      drawIngredientIcon(
        ctx,
        step.id,
        step.cooked ? COOK_STATE.GOLDEN : COOK_STATE.READY,
        sx + stepW / 2,
        rowY + 23,
        16,
      );

      if (step.cooked) {
        drawFlame(ctx, sx + stepW - 10, rowY + 11, 5.2, '#de6522');
      }

      setFont('600', 11);
      ctx.fillStyle = PALETTE.inkMid;
      ctx.textAlign = 'center';
      ctx.fillText(spec.name, sx + stepW / 2, rowY + 48);

      if (i < steps.length - 1) {
        setFont('700', 14);
        ctx.fillStyle = '#a89074';
        ctx.textAlign = 'center';
        ctx.fillText('+', sx + stepW + stepGap / 2, rowY + rowH / 2);
      }
    }

    // Patience bar + seconds
    const barX = rect.x + 16;
    const barY = rect.y + 122;
    const barW = rect.w - 72;
    const barH = 11;
    fillRoundRect(ctx, barX, barY, barW, barH, 5.5, '#e8dcc7');
    const barColor = lowPatience ? PALETTE.crimson : medPatience ? PALETTE.amber : PALETTE.green;
    if (ratio > 0) {
      fillRoundRect(ctx, barX, barY, Math.max(8, barW * ratio), barH, 5.5, barColor);
    }

    setFont('700', 12);
    ctx.fillStyle = lowPatience ? PALETTE.crimson : PALETTE.inkMid;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.max(0, Math.ceil(order.patience))}s`, rect.x + rect.w - 16, barY + 5.5);

    ctx.restore();
  }

  function drawOrderBoard(state, screen) {
    // Title screen precedes the shift: keep the tile wall & brass ticket rail completely clean behind the cover poster
    if (screen === SCREEN.TITLE) return;

    const cards = state.orders.map((order) => ({ order, served: false }));
    const hl = state.serveHighlight;
    if (hl && hl.orderSnapshot) {
      const insertAt = Math.max(0, Math.min(hl.slotIndex, cards.length));
      cards.splice(insertAt, 0, { order: hl.orderSnapshot, served: true });
    }
    const visibleCards = cards.slice(0, RULES.maxOrders);

    if (screen === SCREEN.PLAY) {
      for (let slot = visibleCards.length; slot < RULES.maxOrders; slot += 1) {
        const rect = getOrderCardRect(slot);
        ctx.save();
        ctx.setLineDash([6, 6]);
        strokeRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, 'rgba(130, 102, 74, 0.34)', 1.5);
        ctx.setLineDash([]);
        setFont('500', 13);
        ctx.fillStyle = 'rgba(116, 90, 66, 0.56)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Open order slot', rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.restore();
      }
    }

    for (let i = 0; i < visibleCards.length; i += 1) {
      const entry = visibleCards[i];
      drawOrderCard(entry.order, i, entry.served, entry.served ? 'SERVED!' : null);
    }
  }

  function drawHintBar(hint, isModalOpen) {
    const r = LAYOUT.hintBar;
    if (isModalOpen) {
      // Quiet neutral strip under full-screen modals so no sliced text leaks past modal edges
      fillRoundRect(ctx, r.x, r.y, r.w, r.h, 8, PALETTE.hintBg);
      strokeRoundRect(ctx, r.x, r.y, r.w, r.h, 8, 'rgba(212, 160, 69, 0.25)', 1);
      return;
    }

    const bg =
      hint.tone === 'good'
        ? PALETTE.hintGoodBg
        : hint.tone === 'warn'
          ? PALETTE.hintWarnBg
          : hint.tone === 'error'
            ? PALETTE.hintErrorBg
            : PALETTE.hintBg;
    const border =
      hint.tone === 'good'
        ? PALETTE.greenBright
        : hint.tone === 'warn'
          ? PALETTE.amber
          : hint.tone === 'error'
            ? PALETTE.crimsonBright
            : 'rgba(212, 160, 69, 0.42)';
    const dot =
      hint.tone === 'good'
        ? PALETTE.greenBright
        : hint.tone === 'warn'
          ? '#ffbe55'
          : hint.tone === 'error'
            ? '#ff7a70'
            : PALETTE.brassBright;

    fillRoundRect(ctx, r.x, r.y, r.w, r.h, 8, bg);
    strokeRoundRect(ctx, r.x, r.y, r.w, r.h, 8, border, 1.3);

    ctx.beginPath();
    ctx.arc(r.x + 18, r.y + r.h / 2, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = dot;
    ctx.fill();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    setFont('600', 13.5);
    ctx.fillStyle = PALETTE.creamText;
    ctx.fillText(hint.text, r.x + 32, r.y + r.h / 2 + 0.5);

    setFont('500', 11.5);
    ctx.fillStyle = '#dfd1bc';
    ctx.textAlign = 'right';
    ctx.fillText(
      '1-0 Ingredients  ·  Q/W Burners  ·  Space Serve  ·  T Trash  ·  P Pause',
      r.x + r.w - 16,
      r.y + r.h / 2 + 0.5,
    );
  }

  function drawStoveRange(state, ui) {
    const st = LAYOUT.stove;
    const shakeX = state.stoveShake > 0 ? Math.sin(state.stoveShake * 55) * 7 * (state.stoveShake / 0.36) : 0;

    ctx.save();
    ctx.translate(shakeX, 0);

    fillRoundRect(ctx, st.x + 2, st.y + 6, st.w, st.h, 16, 'rgba(34, 19, 10, 0.32)');

    const bezelG = ctx.createLinearGradient(st.x, st.y, st.x, st.y + st.h);
    bezelG.addColorStop(0, '#6a6871');
    bezelG.addColorStop(0.5, '#434148');
    bezelG.addColorStop(1, '#2b2a2f');
    fillRoundRect(ctx, st.x, st.y, st.w, st.h, 16, bezelG);
    strokeRoundRect(ctx, st.x, st.y, st.w, st.h, 16, '#84828b', 1.2);

    fillRoundRect(ctx, st.x + 10, st.y + 10, st.w - 20, st.h - 20, 11, PALETTE.stoveInner);

    setFont('600', 11.5);
    ctx.fillStyle = '#a49fab';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('STOVE RANGE', st.x + 24, st.y + 27);

    // Brass stove dials
    for (let d = 0; d < 2; d += 1) {
      const dx = st.x + st.w - 58 + d * 28;
      const dy = st.y + 26;
      const active = state.burners[d].item !== null;
      ctx.beginPath();
      ctx.arc(dx, dy, 8, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#d4a045' : '#4a474f';
      ctx.fill();
      ctx.strokeStyle = '#1b1a1e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + (active ? 4 : 0), dy - (active ? 4 : 6));
      ctx.strokeStyle = '#1b1a1e';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (let i = 0; i < LAYOUT.burners.length; i += 1) {
      const bLayout = LAYOUT.burners[i];
      const burner = state.burners[i];
      const item = burner.item;
      const hovered = ui.hoverId === `burner-${i}`;
      const pulse = state.burnerPulse[i];

      const cx = bLayout.cx;
      const cy = bLayout.cy;
      const ringR = bLayout.r;

      // Cast-iron burner well & grate
      ctx.beginPath();
      ctx.arc(cx, cy, ringR - 8, 0, Math.PI * 2);
      ctx.fillStyle = '#101013';
      ctx.fill();

      ctx.strokeStyle = '#343239';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR - 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, ringR - 44, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#3f3d46';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let a = 0; a < 8; a += 1) {
        const ang = (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 18, cy + Math.sin(ang) * 18);
        ctx.lineTo(cx + Math.cos(ang) * (ringR - 12), cy + Math.sin(ang) * (ringR - 12));
        ctx.stroke();
      }

      // Burner heat glow underneath skillet
      if (item) {
        const flameGlow = ctx.createRadialGradient(cx, cy, 18, cx, cy, ringR - 6);
        if (item.state === COOK_STATE.BURNT) {
          flameGlow.addColorStop(0, 'rgba(232, 72, 48, 0.52)');
          flameGlow.addColorStop(1, 'rgba(232, 72, 48, 0)');
        } else if (item.state === COOK_STATE.GOLDEN) {
          flameGlow.addColorStop(0, 'rgba(255, 212, 71, 0.42)');
          flameGlow.addColorStop(0.68, 'rgba(71, 199, 126, 0.24)');
          flameGlow.addColorStop(1, 'rgba(71, 199, 126, 0)');
        } else {
          flameGlow.addColorStop(0, 'rgba(138, 190, 255, 0.34)');
          flameGlow.addColorStop(0.7, 'rgba(235, 196, 130, 0.14)');
          flameGlow.addColorStop(1, 'rgba(138, 190, 255, 0)');
        }
        ctx.fillStyle = flameGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR - 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Progress Ring Track: dark base + vivid GREEN GOLDEN ZONE + crimson burn zone + crisp boundary ticks
      const startAngle = -Math.PI / 2;
      const fullArc = Math.PI * 2;
      const goldenA0 = startAngle + RULES.goldenStart * fullArc;
      const goldenA1 = startAngle + RULES.burnStart * fullArc;
      const burnA1 = startAngle + fullArc;

      ctx.lineWidth = 10;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, fullArc);
      ctx.stroke();

      // Green golden target zone (remains clearly visible ahead of the golden progress sweep!)
      ctx.strokeStyle = item ? 'rgba(58, 214, 126, 0.56)' : 'rgba(58, 214, 126, 0.2)';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, goldenA0, goldenA1);
      ctx.stroke();

      // Crimson burn danger zone
      ctx.strokeStyle = item ? 'rgba(226, 72, 58, 0.52)' : 'rgba(226, 72, 58, 0.16)';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, goldenA1, burnA1);
      ctx.stroke();

      // Crisp radial boundary ticks marking exact Golden-Start and Burn-Start thresholds
      for (const [tickAngle, tickColor] of [
        [goldenA0, '#8ef5b8'],
        [goldenA1, '#ff8e84'],
      ]) {
        ctx.strokeStyle = item ? tickColor : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(tickAngle) * (ringR - 8), cy + Math.sin(tickAngle) * (ringR - 8));
        ctx.lineTo(cx + Math.cos(tickAngle) * (ringR + 8), cy + Math.sin(tickAngle) * (ringR + 8));
        ctx.stroke();
      }

      if (item) {
        // Active elapsed sweep: warm cream-steel when raw, radiant GOLD when inside the green zone, crimson when burnt!
        const curAngle = startAngle + item.progress * fullArc;
        const arcColor =
          item.state === COOK_STATE.BURNT
            ? PALETTE.crimsonBright
            : item.state === COOK_STATE.GOLDEN
              ? '#ffd447'
              : '#dfd2bc';
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, startAngle, curAngle);
        ctx.stroke();

        // Cast-iron skillet tucked cleanly inside the ring (compact riveted side ears stay well inside r=68 < 81!)
        ctx.save();
        ctx.translate(cx, cy);
        const scalePop = 1 + pulse * 0.05;
        ctx.scale(scalePop, scalePop);

        // Twin forged helper-loop handles on left & right of skillet rim (never cross the progress ring!)
        ctx.strokeStyle = '#575560';
        ctx.lineWidth = 4;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(side * 56, 0, 11, side < 0 ? Math.PI * 0.55 : -Math.PI * 0.45, side < 0 ? Math.PI * 1.45 : Math.PI * 0.45);
          ctx.stroke();
        }

        const panG = ctx.createRadialGradient(-14, -14, 8, 0, 0, 58);
        panG.addColorStop(0, '#45434d');
        panG.addColorStop(0.75, '#252429');
        panG.addColorStop(1, '#18171c');
        ctx.beginPath();
        ctx.arc(0, 0, 58, 0, Math.PI * 2);
        ctx.fillStyle = panG;
        ctx.fill();
        ctx.lineWidth = hovered ? 3 : 2.2;
        ctx.strokeStyle =
          hovered
            ? PALETTE.brassBright
            : item.state === COOK_STATE.GOLDEN
              ? '#ffd447'
              : item.state === COOK_STATE.BURNT
                ? PALETTE.crimsonBright
                : '#6e6c78';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 49, 0, Math.PI * 2);
        ctx.fillStyle = '#1f1e23';
        ctx.fill();

        drawIngredientIcon(ctx, item.id, item.state, 0, 2, 34);
        ctx.restore();

        // Crisp progress tip indicator drawn on top of everything on the ring
        const tipX = cx + Math.cos(curAngle) * ringR;
        const tipY = cy + Math.sin(curAngle) * ringR;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = item.state === COOK_STATE.GOLDEN ? '#1f7a49' : arcColor;
        ctx.lineWidth = 2.6;
        ctx.stroke();

        drawBurnerVapor(ctx, cx, cy, 52, item.state, state.elapsed);
      } else if (hovered) {
        ctx.strokeStyle = 'rgba(241, 199, 107, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, fullArc);
        ctx.stroke();
      }

      // Unified keycap badge (Q / W)
      drawKeycap(
        cx - ringR + 2,
        cy - ringR - 6,
        26,
        24,
        bLayout.key,
        item && item.state === COOK_STATE.GOLDEN ? '#ffd447' : PALETTE.brass,
      );

      // Status pill cleanly underneath burner
      const pillY = cy + ringR + 18;
      let pillText = 'EMPTY';
      let pillBg = 'rgba(255, 255, 255, 0.06)';
      let pillFg = '#9b96a3';
      let pillBorder = 'rgba(255, 255, 255, 0.14)';
      if (item) {
        const spec = INGREDIENT_BY_ID[item.id];
        if (item.state === COOK_STATE.GOLDEN) {
          pillText = `GOLDEN ${spec.name.toUpperCase()} — CLICK!`;
          pillBg = 'rgba(45, 155, 95, 0.3)';
          pillFg = '#fff1a6';
          pillBorder = '#ffd447';
        } else if (item.state === COOK_STATE.BURNT) {
          pillText = `BURNT ${spec.name.toUpperCase()} — CLEAR`;
          pillBg = 'rgba(201, 67, 56, 0.32)';
          pillFg = '#ffa59d';
          pillBorder = PALETTE.crimsonBright;
        } else {
          pillText = `HEATING ${spec.name.toUpperCase()}…`;
          pillBg = 'rgba(223, 210, 188, 0.12)';
          pillFg = '#ebe0ce';
          pillBorder = 'rgba(223, 210, 188, 0.45)';
        }
      }
      const pillW = 192;
      fillRoundRect(ctx, cx - pillW / 2, pillY, pillW, 25, 12.5, pillBg);
      strokeRoundRect(ctx, cx - pillW / 2, pillY, pillW, 25, 12.5, pillBorder, 1.3);
      setFont('700', 11.5);
      ctx.fillStyle = pillFg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, cx, pillY + 13);
    }

    ctx.restore();
  }

  function drawAssemblyPlate(state, readyMatch) {
    const pz = LAYOUT.plateZone;
    const shakeX = state.plateShake > 0 ? Math.sin(state.plateShake * 55) * 8 * (state.plateShake / 0.4) : 0;
    const hl = state.serveHighlight;
    const activeGlow = Boolean(readyMatch || hl);

    ctx.save();
    ctx.translate(shakeX, 0);

    fillRoundRect(ctx, pz.x + 2, pz.y + 6, pz.w, pz.h, 16, 'rgba(34, 19, 10, 0.3)');
    fillRoundRect(ctx, pz.x, pz.y, pz.w, pz.h, 16, PALETTE.placemat);
    strokeRoundRect(
      ctx,
      pz.x,
      pz.y,
      pz.w,
      pz.h,
      16,
      hl ? '#ffd447' : readyMatch ? PALETTE.greenBright : PALETTE.placematTrim,
      activeGlow ? 2.4 : 1.5,
    );

    ctx.save();
    ctx.setLineDash([5, 5]);
    strokeRoundRect(ctx, pz.x + 10, pz.y + 10, pz.w - 20, pz.h - 20, 10, 'rgba(232, 224, 210, 0.16)', 1);
    ctx.setLineDash([]);
    ctx.restore();

    // Header slot: EITHER unified zero-overlap Serve Celebration Banner OR clean Assembly Plate header!
    if (hl) {
      const bx = pz.x + 16;
      const by = pz.y + 12;
      const bw = pz.w - 32;
      const bh = 44;

      fillRoundRect(ctx, bx, by, bw, bh, 12, '#1d3c2b');
      strokeRoundRect(ctx, bx, by, bw, bh, 12, '#ffd447', 2);

      // Left: Coin + "+NN coins" + subtext ("Perfect · x3 Tip")
      drawCoin(ctx, bx + 24, by + bh / 2, 11);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      setFont('800', 21);
      ctx.fillStyle = '#ffec99';
      const coinTxt = `+${hl.coinsEarned} coins`;
      ctx.fillText(coinTxt, bx + 42, by + bh / 2 + 0.5);

      const coinW = ctx.measureText(coinTxt).width;
      const subTxt = hl.subtext || (hl.perfect ? `Perfect · x${hl.comboMult} Tip` : `+${hl.tip} tip`);
      setFont('600', 12);
      ctx.fillStyle = '#9ef5c2';
      ctx.fillText(subTxt, bx + 42 + coinW + 12, by + bh / 2 + 0.5);

      // Right: Cleanly docked inline COMBO badge (zero overflow, zero overlap!)
      const badgeW = 94;
      const badgeX = bx + bw - badgeW - 6;
      const badgeY = by + 6;
      fillRoundRect(ctx, badgeX, badgeY, badgeW, 32, 16, '#231710');
      strokeRoundRect(ctx, badgeX, badgeY, badgeW, 32, 16, '#ffd447', 1.8);
      setFont('800', 11);
      ctx.fillStyle = '#f5cb69';
      ctx.textAlign = 'left';
      ctx.fillText('COMBO', badgeX + 11, badgeY + 16.5);
      setFont('800', 17);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(`x${hl.comboMult}`, badgeX + badgeW - 11, badgeY + 16.5);
    } else {
      setFont('600', 11.5);
      ctx.fillStyle = '#b4bfc1';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('ASSEMBLY PLATE', pz.x + 22, pz.y + 27);

      if (readyMatch) {
        fillRoundRect(ctx, pz.x + pz.w - 146, pz.y + 16, 126, 22, 11, 'rgba(45, 155, 95, 0.32)');
        strokeRoundRect(ctx, pz.x + pz.w - 146, pz.y + 16, 126, 22, 11, PALETTE.greenBright, 1.2);
        setFont('700', 11);
        ctx.fillStyle = '#97f7be';
        ctx.textAlign = 'center';
        ctx.fillText('READY TO SERVE', pz.x + pz.w - 83, pz.y + 27.5);
      }
    }

    // Porcelain Chef's Plate — balanced symmetrically with >=12px air above & below!
    const cx = pz.cx;
    const cy = 426;
    const outerR = 88;
    const innerR = 70;

    if (activeGlow) {
      const aura = ctx.createRadialGradient(cx, cy, outerR - 8, cx, cy, outerR + 22);
      aura.addColorStop(0, hl ? 'rgba(255, 212, 71, 0.34)' : 'rgba(71, 199, 126, 0.32)');
      aura.addColorStop(1, 'rgba(71, 199, 126, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(10, 14, 15, 0.42)';
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 6, outerR + 1, 0, Math.PI * 2);
    ctx.fill();

    const plateG = ctx.createRadialGradient(cx - 24, cy - 28, 10, cx, cy, outerR);
    plateG.addColorStop(0, '#ffffff');
    plateG.addColorStop(0.75, PALETTE.porcelain);
    plateG.addColorStop(1, PALETTE.porcelainShade);
    ctx.fillStyle = plateG;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9bfae';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212, 160, 69, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const wellG = ctx.createRadialGradient(cx + 10, cy + 14, 10, cx, cy, innerR);
    wellG.addColorStop(0, '#ffffff');
    wellG.addColorStop(0.85, '#f6f1e8');
    wellG.addColorStop(1, '#e4dbd0');
    ctx.fillStyle = wellG;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();

    const shownPlate =
      state.plate.length > 0 ? state.plate : hl && hl.plateSnapshot ? hl.plateSnapshot : [];

    if (shownPlate.length === 0) {
      setFont('500', 13);
      ctx.fillStyle = '#9c8f7d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click ingredients or', cx, cy - 8);
      ctx.fillText('burners to plate', cx, cy + 12);
    } else {
      drawPlatedDish(ctx, shownPlate, cx, cy, innerR * 0.96);
    }

    // Ingredient chips cleanly seated 12px below plate and 12px above placemat bottom
    const chipY = pz.y + pz.h - 34;
    if (shownPlate.length > 0) {
      ctx.textBaseline = 'middle';
      setFont('600', 11.5);
      const chips = shownPlate.map((it) => {
        const spec = INGREDIENT_BY_ID[it.id];
        let tag = '';
        let bg = 'rgba(255, 250, 240, 0.14)';
        let fg = PALETTE.creamText;
        let bd = 'rgba(255, 250, 240, 0.28)';
        if (spec.cookable) {
          if (it.state === COOK_STATE.GOLDEN) {
            tag = ' ★';
            bg = 'rgba(45, 155, 95, 0.34)';
            fg = '#fff1a6';
            bd = '#ffd447';
          } else if (it.state === COOK_STATE.BURNT) {
            tag = ' ✕';
            bg = 'rgba(201, 67, 56, 0.38)';
            fg = '#ffb0a8';
            bd = PALETTE.crimsonBright;
          } else {
            tag = ' (raw)';
            bg = 'rgba(223, 145, 36, 0.28)';
            fg = '#ffd78f';
            bd = PALETTE.amber;
          }
        }
        const label = `${spec.name}${tag}`;
        const width = Math.ceil(ctx.measureText(label).width) + 18;
        return { label, width, bg, fg, bd };
      });
      const chipGap = 6;
      const totalW = chips.reduce((acc, c) => acc + c.width, 0) + (chips.length - 1) * chipGap;
      let cxChip = pz.x + (pz.w - totalW) / 2;
      for (const chip of chips) {
        fillRoundRect(ctx, cxChip, chipY, chip.width, 22, 11, chip.bg);
        strokeRoundRect(ctx, cxChip, chipY, chip.width, 22, 11, chip.bd, 1);
        ctx.fillStyle = chip.fg;
        ctx.textAlign = 'center';
        ctx.fillText(chip.label, cxChip + chip.width / 2, chipY + 11.5);
        cxChip += chip.width + chipGap;
      }
    } else {
      setFont('500', 11.5);
      ctx.fillStyle = '#8b989a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Plate empty', pz.cx, chipY + 11);
    }

    ctx.restore();
  }

  function drawServiceStation(state, ui, readyMatch) {
    const sb = LAYOUT.serveBtn;
    const hoverServe = ui.hoverId === 'serve';
    const hl = state.serveHighlight;
    const serveReady = Boolean(readyMatch) && !hl;

    fillRoundRect(ctx, sb.x + 2, sb.y + 6, sb.w, sb.h, 16, 'rgba(25, 16, 10, 0.34)');

    const sg = ctx.createLinearGradient(sb.x, sb.y, sb.x, sb.y + sb.h);
    if (hl) {
      // Celebratory confirmed state (consistent past tense with SERVED! order card)
      sg.addColorStop(0, '#2a8f5e');
      sg.addColorStop(1, '#1b6440');
    } else if (serveReady) {
      sg.addColorStop(0, hoverServe ? '#34a871' : PALETTE.serveReadyTop);
      sg.addColorStop(1, hoverServe ? '#217d52' : PALETTE.serveReadyBottom);
    } else {
      // Muted calm inactive state when plate does not match any active order!
      sg.addColorStop(0, hoverServe ? '#3a4b44' : '#2f3d37');
      sg.addColorStop(1, hoverServe ? '#2b3933' : '#232e29');
    }

    fillRoundRect(ctx, sb.x, sb.y, sb.w, sb.h, 16, sg);
    strokeRoundRect(
      ctx,
      sb.x,
      sb.y,
      sb.w,
      sb.h,
      16,
      hl || serveReady ? '#ffd447' : hoverServe ? 'rgba(212, 160, 69, 0.55)' : 'rgba(182, 174, 160, 0.25)',
      hl || serveReady ? 2.6 : 1.4,
    );
    strokeRoundRect(
      ctx,
      sb.x + 4,
      sb.y + 4,
      sb.w - 8,
      sb.h - 8,
      12,
      hl || serveReady ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
      1,
    );

    ctx.save();
    if (!hl && !serveReady) ctx.globalAlpha = 0.55;
    drawServiceCloche(ctx, sb.x + sb.w / 2, sb.y + 64, 34, Boolean(hl || serveReady));
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont('800', 26, FONTS.display);
    ctx.fillStyle = hl ? '#ffec99' : serveReady ? '#ffffff' : '#b7c4bd';
    ctx.fillText(hl ? 'SERVED!' : 'SERVE', sb.x + sb.w / 2, sb.y + 112);

    setFont('600', 12.5);
    ctx.fillStyle = hl ? '#d8ffe8' : serveReady ? '#e6ffef' : '#8d9d95';
    ctx.fillText(
      hl ? `+${hl.coinsEarned} coins earned` : serveReady ? `Serve ${readyMatch.recipe.shortName}` : 'Match an active order',
      sb.x + sb.w / 2,
      sb.y + 137,
    );

    drawKeycap(
      sb.x + sb.w / 2 - 34,
      sb.y + 149,
      68,
      20,
      'SPACE',
      hl || serveReady ? '#ffd447' : 'rgba(212, 160, 69, 0.3)',
    );

    // Secondary TRASH button
    const tb = LAYOUT.trashBtn;
    const hoverTrash = ui.hoverId === 'trash';
    fillRoundRect(ctx, tb.x + 2, tb.y + 5, tb.w, tb.h, 14, 'rgba(25, 16, 10, 0.3)');
    const tg = ctx.createLinearGradient(tb.x, tb.y, tb.x, tb.y + tb.h);
    tg.addColorStop(0, hoverTrash ? '#623a35' : PALETTE.trashTop);
    tg.addColorStop(1, hoverTrash ? '#442622' : PALETTE.trashBottom);
    fillRoundRect(ctx, tb.x, tb.y, tb.w, tb.h, 14, tg);
    strokeRoundRect(
      ctx,
      tb.x,
      tb.y,
      tb.w,
      tb.h,
      14,
      hoverTrash ? PALETTE.crimsonBright : 'rgba(220, 202, 182, 0.28)',
      1.4,
    );

    drawTrashBin(ctx, tb.x + 48, tb.y + tb.h / 2, 20, hoverTrash ? '#ffbbb3' : '#e4d5c3');
    ctx.textAlign = 'left';
    setFont('700', 17);
    ctx.fillStyle = PALETTE.creamText;
    ctx.fillText('Trash Plate', tb.x + 84, tb.y + tb.h / 2 - 8);
    setFont('500', 12);
    ctx.fillStyle = PALETTE.creamMuted;
    ctx.fillText('Clear & start fresh', tb.x + 84, tb.y + tb.h / 2 + 12);

    drawKeycap(tb.x + tb.w - 38, tb.y + tb.h / 2 - 12, 24, 24, 'T', 'rgba(212, 160, 69, 0.4)');
  }

  function drawIngredientStations(state, ui) {
    for (let i = 0; i < INGREDIENTS.length; i += 1) {
      const spec = INGREDIENTS[i];
      const rect = getStationRect(i);
      const hovered = ui.hoverId === `station-${i}`;
      const pulse = state.stationPulse[i];
      const dy = pulse > 0 ? Math.sin(pulse * Math.PI) * -3 : hovered ? -2 : 0;

      ctx.save();
      ctx.translate(0, dy);

      fillRoundRect(ctx, rect.x, rect.y + 4, rect.w, rect.h, 12, 'rgba(15, 9, 5, 0.45)');
      fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, hovered ? '#fffdf8' : spec.tileBg);

      // Full-width crisp top accent band clipped cleanly to the rounded tile top
      ctx.save();
      roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 12);
      ctx.clip();
      ctx.fillStyle = spec.accent;
      ctx.fillRect(rect.x, rect.y, rect.w, 6);
      ctx.restore();

      strokeRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        12,
        hovered ? PALETTE.brass : 'rgba(130, 100, 68, 0.44)',
        hovered ? 2.2 : 1.3,
      );

      // Unified keycap badge tucked neatly below top accent band
      drawKeycap(rect.x + 7, rect.y + 11, 21, 20, spec.key, 'rgba(212, 160, 69, 0.45)');

      // Flame badge top-right ONLY for the 4 cookable ingredients
      if (spec.cookable) {
        drawFlame(ctx, rect.x + rect.w - 15, rect.y + 20, 6.5, '#e26220');
      }

      // Station ingredient art (Egg = whole farm eggs, Batter = stoneware batter bowl!)
      drawIngredientIcon(
        ctx,
        spec.id,
        spec.id === 'patty' || spec.id === 'noodle' ? COOK_STATE.RAW : COOK_STATE.READY,
        rect.x + rect.w / 2,
        rect.y + 58,
        24,
      );

      setFont('700', 13.5);
      ctx.fillStyle = PALETTE.inkDark;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(spec.name, rect.x + rect.w / 2, rect.y + rect.h - 14);

      ctx.restore();
    }
  }

  function drawEffects(state) {
    // Sparkle particles (stay outside plate perimeter)
    for (let i = 0; i < state.particles.length; i += 1) {
      const pt = state.particles[i];
      const alpha = Math.max(0, 1 - pt.age / pt.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.age * 5);
      ctx.beginPath();
      ctx.moveTo(0, -pt.size);
      ctx.lineTo(pt.size * 0.65, 0);
      ctx.lineTo(0, pt.size);
      ctx.lineTo(-pt.size * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Floating popups (used for strikes or standalone messages)
    for (let i = 0; i < state.popups.length; i += 1) {
      const p = state.popups[i];
      const alpha = Math.min(1, Math.max(0, 1 - Math.max(0, p.age - p.life * 0.55) / (p.life * 0.45)));
      ctx.save();
      ctx.globalAlpha = alpha;

      const isGold = p.tone === 'gold';
      const w = isGold ? 216 : 186;
      const h = p.subtext ? 56 : 38;
      const px = p.x - w / 2;
      const py = p.y - h / 2;

      fillRoundRect(ctx, px + 2, py + 5, w, h, 14, 'rgba(20, 12, 8, 0.36)');
      fillRoundRect(ctx, px, py, w, h, 14, isGold ? '#1d3c2b' : '#581f1b');
      strokeRoundRect(ctx, px, py, w, h, 14, isGold ? '#ffd447' : PALETTE.crimsonBright, 2.2);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      setFont('800', 19);
      ctx.fillStyle = isGold ? '#ffe98c' : '#ffc1b9';
      ctx.fillText(p.text, p.x, py + (p.subtext ? 21 : 19));

      if (p.subtext) {
        setFont('700', 12);
        ctx.fillStyle = isGold ? '#9ef5c2' : '#f7d5d0';
        ctx.fillText(p.subtext, p.x, py + 41);
      }
      ctx.restore();
    }
  }

  function drawActionButton(rect, label, primary, hovered, keyHint = null) {
    ctx.save();
    fillRoundRect(ctx, rect.x + 2, rect.y + 4, rect.w, rect.h, 12, 'rgba(18, 11, 7, 0.35)');
    if (primary) {
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g.addColorStop(0, hovered ? '#33a36d' : '#268457');
      g.addColorStop(1, hovered ? '#21754c' : '#1a613f');
      fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, g);
      strokeRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, hovered ? '#ffe994' : PALETTE.brassBright, 2);
      ctx.fillStyle = '#ffffff';
    } else {
      fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, hovered ? '#4a3629' : '#35261d');
      strokeRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, hovered ? PALETTE.brassBright : PALETTE.brass, 1.6);
      ctx.fillStyle = PALETTE.creamText;
    }
    setFont('700', 18);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textX = keyHint ? rect.x + rect.w / 2 - 28 : rect.x + rect.w / 2;
    ctx.fillText(label, textX, rect.y + rect.h / 2 + 0.5);

    if (keyHint) {
      drawKeycap(rect.x + rect.w - 76, rect.y + rect.h / 2 - 11, 58, 22, keyHint, 'rgba(255, 232, 150, 0.55)');
    }
    ctx.restore();
  }

  function drawTitleOverlay(ui) {
    // Rich darkened vignette framing the kitchen cleanly behind the poster cover
    const vig = ctx.createRadialGradient(STAGE.width / 2, STAGE.height / 2, 200, STAGE.width / 2, STAGE.height / 2, 760);
    vig.addColorStop(0, 'rgba(22, 14, 9, 0.54)');
    vig.addColorStop(1, 'rgba(14, 8, 5, 0.74)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);

    // Lifted poster cover card (28px clean breathing room above bottom station tray!)
    const px = 230;
    const py = 94;
    const pw = 820;
    const ph = 462;

    fillRoundRect(ctx, px + 4, py + 12, pw, ph, 22, 'rgba(10, 5, 3, 0.52)');
    const cardG = ctx.createLinearGradient(px, py, px, py + ph);
    cardG.addColorStop(0, '#fdf6e7');
    cardG.addColorStop(1, '#f3e4ca');
    fillRoundRect(ctx, px, py, pw, ph, 22, cardG);
    strokeRoundRect(ctx, px, py, pw, ph, 22, PALETTE.brass, 3);
    strokeRoundRect(ctx, px + 8, py + 8, pw - 16, ph - 16, 16, 'rgba(166, 118, 42, 0.38)', 1.2);

    // Decorative bistro poster crest with flanking brass flourishes
    const crestY = py + 48;
    ctx.strokeStyle = 'rgba(182, 130, 48, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 96, crestY);
    ctx.lineTo(STAGE.width / 2 - 50, crestY);
    ctx.moveTo(STAGE.width / 2 + 50, crestY);
    ctx.lineTo(px + pw - 96, crestY);
    ctx.stroke();
    for (const dx of [STAGE.width / 2 - 52, STAGE.width / 2 + 52]) {
      ctx.fillStyle = PALETTE.brass;
      ctx.beginPath();
      ctx.arc(dx, crestY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    drawLadleCrest(ctx, STAGE.width / 2, crestY, 32);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont('700', 42, FONTS.display);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.fillText('THE GOLDEN LADLE', STAGE.width / 2, py + 104);

    setFont('500', 15);
    ctx.fillStyle = PALETTE.inkMid;
    ctx.fillText(
      'Cook to the golden zone, plate each recipe cleanly, and serve before patience runs out.',
      STAGE.width / 2,
      py + 134,
    );

    // Balanced 5-Recipe Menu Box (3 cards top row, 2 centered bottom row, full-width goal footer strip!)
    const mx = px + 30;
    const my = py + 154;
    const mw = pw - 60;
    const mh = 224;
    fillRoundRect(ctx, mx, my, mw, mh, 14, '#fffaf1');
    strokeRoundRect(ctx, mx, my, mw, mh, 14, '#dbc7a6', 1.3);

    setFont('700', 12.5);
    ctx.fillStyle = '#8b5c1a';
    ctx.textAlign = 'left';
    ctx.fillText('KITCHEN MENU — 5 RECIPES', mx + 18, my + 20);

    // Crisp visual legend matching exact flame glyph used on recipe cards (no unexplained asterisks!)
    setFont('500', 12);
    const legendText = '= cook to golden on Burner 1/2 (Q/W)';
    const legendW = ctx.measureText(legendText).width;
    drawFlame(ctx, mx + mw - 18 - legendW - 11, my + 20, 5.5, '#e26220');
    ctx.fillStyle = PALETTE.inkMid;
    ctx.textAlign = 'right';
    ctx.fillText(legendText, mx + mw - 18, my + 20);

    const drawRecipeMiniCard = (recipe, rx, ry, rw, rh) => {
      fillRoundRect(ctx, rx, ry, rw, rh, 10, '#f8efe0');
      strokeRoundRect(ctx, rx, ry, rw, rh, 10, '#e2d0b2', 1);

      setFont('700', 13.5, FONTS.display);
      ctx.fillStyle = PALETTE.inkDark;
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name, rx + 12, ry + 17);

      // Price chip top-right
      setFont('700', 12);
      ctx.fillStyle = '#8f5d14';
      ctx.textAlign = 'right';
      ctx.fillText(`${recipe.price}c`, rx + rw - 11, ry + 17);

      // Drawn ingredient icons cleanly spaced along bottom half of card
      const steps = recipe.steps;
      const stepSpacing = 44;
      const startIx = rx + 26;
      for (let s = 0; s < steps.length; s += 1) {
        const st = steps[s];
        const ix = startIx + s * stepSpacing;
        const iy = ry + 45;
        drawIngredientIcon(
          ctx,
          st.id,
          st.cooked ? COOK_STATE.GOLDEN : COOK_STATE.READY,
          ix,
          iy,
          12.5,
        );
        if (st.cooked) {
          drawFlame(ctx, ix + 11, iy - 10, 4.4, '#e26220');
        }
        if (s < steps.length - 1) {
          setFont('700', 12);
          ctx.fillStyle = '#b49c7e';
          ctx.textAlign = 'center';
          ctx.fillText('+', ix + stepSpacing / 2, iy);
        }
      }
    };

    // Row 1: 3 recipes across full width
    const row1W = 232;
    const rowGap = 14;
    const row1StartX = mx + (mw - (3 * row1W + 2 * rowGap)) / 2;
    for (let i = 0; i < 3; i += 1) {
      drawRecipeMiniCard(RECIPES[i], row1StartX + i * (row1W + rowGap), my + 34, row1W, 66);
    }

    // Row 2: 2 recipes centered symmetrically
    const row2W = 286;
    const row2StartX = mx + (mw - (2 * row2W + rowGap)) / 2;
    drawRecipeMiniCard(RECIPES[3], row2StartX, my + 108, row2W, 66);
    drawRecipeMiniCard(RECIPES[4], row2StartX + row2W + rowGap, my + 108, row2W, 66);

    // Balanced full-width soft warm footer strip for shift goal & controls
    const fy = my + 184;
    fillRoundRect(ctx, mx + 16, fy, mw - 32, 28, 8, '#efe1c6');
    strokeRoundRect(ctx, mx + 16, fy, mw - 32, 28, 8, '#d8c096', 1);
    setFont('600', 12);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.textAlign = 'center';
    ctx.fillText(
      'Goal: 130 coins in 2:30 (180 / 240 for 2–3 stars)   ·   3 strikes ends shift   ·   Keys: 1-0, Q/W, Space, T, P',
      mx + mw / 2,
      fy + 14.5,
    );

    drawActionButton(OVERLAY_RECTS.titleStart, 'Click to Start', true, ui.hoverId === 'title-start', 'SPACE');
  }

  function drawPauseOverlay(ui) {
    ctx.fillStyle = 'rgba(18, 11, 7, 0.7)';
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);

    const px = 410;
    const py = 196;
    const pw = 460;
    const ph = 316;
    fillRoundRect(ctx, px + 4, py + 10, pw, ph, 20, 'rgba(0, 0, 0, 0.44)');
    fillRoundRect(ctx, px, py, pw, ph, 20, '#fbf3e4');
    strokeRoundRect(ctx, px, py, pw, ph, 20, PALETTE.brass, 2.5);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont('700', 34, FONTS.display);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.fillText('Kitchen Paused', STAGE.width / 2, py + 60);

    setFont('500', 15);
    ctx.fillStyle = PALETTE.inkMid;
    ctx.fillText('Burners and order timers are held safely.', STAGE.width / 2, py + 102);
    ctx.fillText('Press P or Esc to jump right back in.', STAGE.width / 2, py + 126);

    drawActionButton(OVERLAY_RECTS.pauseResume, 'Resume Shift', true, ui.hoverId === 'pause-resume');
    drawActionButton(OVERLAY_RECTS.pauseRestart, 'Restart Shift', false, ui.hoverId === 'pause-restart');
  }

  function drawEndOverlay(state, ui, won) {
    const vig = ctx.createRadialGradient(STAGE.width / 2, STAGE.height / 2, 180, STAGE.width / 2, STAGE.height / 2, 740);
    vig.addColorStop(0, 'rgba(20, 12, 8, 0.62)');
    vig.addColorStop(1, 'rgba(12, 7, 4, 0.8)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);

    // Lifted symmetrically with 30px clean clearance above bottom station tray
    const px = 340;
    const py = 104;
    const pw = 600;
    const ph = 450;

    fillRoundRect(ctx, px + 4, py + 12, pw, ph, 22, 'rgba(0, 0, 0, 0.48)');
    const bg = ctx.createLinearGradient(px, py, px, py + ph);
    bg.addColorStop(0, '#fdf6e8');
    bg.addColorStop(1, '#f3e4ca');
    fillRoundRect(ctx, px, py, pw, ph, 22, bg);
    strokeRoundRect(ctx, px, py, pw, ph, 22, won ? PALETTE.brass : PALETTE.crimson, 3);
    strokeRoundRect(ctx, px + 8, py + 8, pw - 16, ph - 16, 16, 'rgba(166, 118, 42, 0.32)', 1.2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (won) {
      const stars = getStarsForCoins(state.coins);
      drawStar(ctx, STAGE.width / 2 - 74, py + 62, 28, stars >= 1);
      drawStar(ctx, STAGE.width / 2, py + 52, 34, stars >= 2);
      drawStar(ctx, STAGE.width / 2 + 74, py + 62, 28, stars >= 3);

      setFont('700', 36, FONTS.display);
      ctx.fillStyle = PALETTE.inkDark;
      ctx.fillText('Shift Complete!', STAGE.width / 2, py + 122);

      const rating =
        stars === 3 ? 'Three-Star Golden Service' : stars === 2 ? 'Two-Star Rush Mastery' : 'One-Star Shift Cleared';
      setFont('600', 15);
      ctx.fillStyle = PALETTE.green;
      ctx.fillText(rating, STAGE.width / 2, py + 152);
    } else {
      for (let s = 0; s < RULES.maxStrikes; s += 1) {
        drawStrikeMark(ctx, STAGE.width / 2 + (s - 1) * 52, py + 60, 19, s < state.strikes);
      }

      setFont('700', 36, FONTS.display);
      ctx.fillStyle = PALETTE.crimson;
      ctx.fillText('Shift Failed', STAGE.width / 2, py + 122);

      setFont('600', 15);
      ctx.fillStyle = PALETTE.inkMid;
      ctx.fillText(state.failReason || 'Three strikes ended the shift.', STAGE.width / 2, py + 152);
    }

    // 2x2 Stats Grid (x = 376..904, aligned pixel-for-pixel with buttons below!)
    const strikesNote =
      state.strikes > 0
        ? `${state.strikes} / ${RULES.maxStrikes} strikes`
        : `0 / ${RULES.maxStrikes} strikes`;
    const stats = [
      { label: 'Coins Earned', value: `${state.coins}`, note: `Goal ${RULES.coinGoal}`, accent: '#b87b16', coin: true },
      {
        label: 'Dishes Served',
        value: `${state.servedCount}`,
        note: strikesNote,
        noteColor: state.strikes > 0 ? PALETTE.crimson : PALETTE.inkMuted,
        accent: PALETTE.green,
        coin: false,
      },
      { label: 'Perfect Dishes', value: `${state.perfectCount}`, note: 'Fast & golden', accent: '#2c7e57', coin: false },
      {
        label: 'Best Combo',
        value: `x${getComboMultiplier(state.bestCombo)}`,
        note: state.bestCombo > 0 ? `${state.bestCombo}-dish streak` : 'No streak',
        accent: '#a95e1a',
        coin: false,
      },
    ];

    const gx = px + 36; // 376
    const gy = py + 180;
    const tileW = 256;
    const tileH = 74;
    const gap = 16;

    for (let i = 0; i < stats.length; i += 1) {
      const st = stats[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const tx = gx + col * (tileW + gap);
      const ty = gy + row * (tileH + gap);

      fillRoundRect(ctx, tx, ty, tileW, tileH, 12, '#fffaf1');
      strokeRoundRect(ctx, tx, ty, tileW, tileH, 12, '#decbb0', 1.2);

      ctx.textAlign = 'left';
      setFont('600', 12.5);
      ctx.fillStyle = PALETTE.inkMid;
      ctx.fillText(st.label, tx + 16, ty + 23);

      setFont(st.noteColor ? '600' : '500', 11.5);
      ctx.fillStyle = st.noteColor || PALETTE.inkMuted;
      ctx.fillText(st.note, tx + 16, ty + 48);

      ctx.textAlign = 'right';
      setFont('800', 28);
      ctx.fillStyle = st.accent;
      ctx.fillText(st.value, tx + tileW - 18, ty + 38);
      if (st.coin) {
        drawCoin(ctx, tx + tileW - 18 - ctx.measureText(st.value).width - 16, ty + 37, 10);
      }
    }

    if (won) {
      drawActionButton(OVERLAY_RECTS.resultsNext, 'Next shift', true, ui.hoverId === 'results-next');
      drawActionButton(OVERLAY_RECTS.resultsReplay, 'Replay', false, ui.hoverId === 'results-replay');
    } else {
      drawActionButton(OVERLAY_RECTS.failedRetry, 'Retry Shift', true, ui.hoverId === 'failed-retry');
    }
  }

  function draw(world, ui) {
    const state = world.state;
    const readyCandidate = world.findMatchingOrder();
    const readyMatch = readyCandidate && readyCandidate.evaluation.ok ? readyCandidate : null;
    const isModalOpen = ui.screen !== SCREEN.PLAY;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    drawKitchenBackdrop();
    drawHud(state, ui);
    drawOrderBoard(state, ui.screen);
    drawHintBar(world.getHint(), isModalOpen);
    drawStoveRange(state, ui);
    drawAssemblyPlate(state, readyMatch);
    drawServiceStation(state, ui, readyMatch);
    drawIngredientStations(state, ui);
    drawEffects(state);

    if (ui.screen === SCREEN.TITLE) {
      drawTitleOverlay(ui);
    } else if (ui.screen === SCREEN.PAUSED) {
      drawPauseOverlay(ui);
    } else if (ui.screen === SCREEN.RESULTS) {
      drawEndOverlay(state, ui, true);
    } else if (ui.screen === SCREEN.FAILED) {
      drawEndOverlay(state, ui, false);
    }
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    draw,
    resize,
    clientToStage,
  };
}
