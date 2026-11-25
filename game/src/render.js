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
  titleStart: { x: 470, y: 506, w: 340, h: 58 },
  pauseResume: { x: 486, y: 368, w: 308, h: 54 },
  pauseRestart: { x: 486, y: 436, w: 308, h: 48 },
  resultsNext: { x: 422, y: 488, w: 210, h: 54 },
  resultsReplay: { x: 648, y: 488, w: 210, h: 54 },
  failedRetry: { x: 486, y: 488, w: 308, h: 54 },
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

  /** Convert CSS client coordinates into logical 1280x720 stage coordinates. */
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

  function drawKitchenBackdrop() {
    // 1. Warm subway-tile backsplash (y = 58 .. 262)
    const wallTop = LAYOUT.orderBoard.y;
    const wallH = LAYOUT.counter.y - wallTop;
    const tileW = 64;
    const tileH = 34;

    ctx.fillStyle = PALETTE.tileLight;
    ctx.fillRect(0, wallTop, STAGE.width, wallH);

    // Subtle alternating hand-glazed tiles
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

    // Warm overhead bistro pendant lamp light pools
    for (const lx of [222, 640, 1058]) {
      const glow = ctx.createRadialGradient(lx, wallTop + 6, 12, lx, wallTop + 56, 260);
      glow.addColorStop(0, 'rgba(255, 226, 152, 0.34)');
      glow.addColorStop(0.55, 'rgba(255, 214, 134, 0.12)');
      glow.addColorStop(1, 'rgba(255, 214, 134, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 260, wallTop, 520, wallH);
    }

    // Soft shadow under top HUD rail
    const topShadow = ctx.createLinearGradient(0, wallTop, 0, wallTop + 18);
    topShadow.addColorStop(0, 'rgba(27, 17, 12, 0.24)');
    topShadow.addColorStop(1, 'rgba(27, 17, 12, 0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(0, wallTop, STAGE.width, 18);

    // Forged-iron & brass ticket hanging rail
    const ry = LAYOUT.orderRailY;
    fillRoundRect(ctx, 16, ry - 4, STAGE.width - 32, 8, 4, PALETTE.railIron);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(24, ry - 2, STAGE.width - 48, 2);

    // 2. Butcher-block oak countertop (y = 262 .. 720)
    const cy = LAYOUT.counter.y;
    // Beveled brass & wood backsplash lip
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

    // Butcher-block horizontal plank seams & subtle grain
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

    // 3. Recessed dark walnut & stainless prep rail at bottom (y = 574 .. 708)
    const railG = ctx.createLinearGradient(0, LAYOUT.prepRail.y, 0, STAGE.height);
    railG.addColorStop(0, '#3a271b');
    railG.addColorStop(0.12, '#4a3324');
    railG.addColorStop(1, '#2a1b12');
    ctx.fillStyle = railG;
    ctx.fillRect(0, LAYOUT.prepRail.y, STAGE.width, STAGE.height - LAYOUT.prepRail.y);

    // Brass trim edge between countertop & prep rail
    ctx.fillStyle = '#c8963e';
    ctx.fillRect(0, LAYOUT.prepRail.y, STAGE.width, 2);

    // Counter front lip
    ctx.fillStyle = '#1b110c';
    ctx.fillRect(0, 708, STAGE.width, 12);
  }

  function drawHud(state, ui) {
    // Rich dark walnut header bar
    const g = ctx.createLinearGradient(0, 0, 0, LAYOUT.hud.h);
    g.addColorStop(0, PALETTE.hudBg);
    g.addColorStop(1, PALETTE.hudBgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE.width, LAYOUT.hud.h);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(0, LAYOUT.hud.h - 2, STAGE.width, 2);

    // Left: Golden Ladle crest + Title + Shift indicator
    drawLadleCrest(ctx, 44, 29, 19);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    setFont('700', 21, FONTS.display);
    ctx.fillStyle = PALETTE.creamText;
    ctx.fillText('The Golden Ladle', 72, 29);

    // Compact shift badge
    fillRoundRect(ctx, 256, 17, 74, 24, 12, 'rgba(212, 160, 69, 0.16)');
    strokeRoundRect(ctx, 256, 17, 74, 24, 12, 'rgba(212, 160, 69, 0.45)', 1);
    setFont('600', 12);
    ctx.fillStyle = PALETTE.brassBright;
    ctx.textAlign = 'center';
    ctx.fillText(`SHIFT ${state.shiftNumber}`, 293, 29);

    // Center-left: Shift Timer
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

    // Center: Coins + Goal progress bar
    const goalMet = state.coins >= RULES.coinGoal;
    const nextTarget =
      state.coins >= RULES.starThresholds[2]
        ? RULES.starThresholds[2]
        : state.coins >= RULES.starThresholds[1]
          ? RULES.starThresholds[2]
          : state.coins >= RULES.starThresholds[0]
            ? RULES.starThresholds[1]
            : RULES.coinGoal;
    const progress = Math.min(1, state.coins / nextTarget);

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
    ctx.fillText(`${state.coins}`, 554, 24);
    setFont('500', 12);
    ctx.fillStyle = goalMet ? PALETTE.greenBright : PALETTE.creamMuted;
    ctx.fillText(goalMet ? `Goal met · next ${nextTarget}` : `/ ${RULES.coinGoal} goal`, 602, 24);

    // Mini goal bar underneath coin text
    fillRoundRect(ctx, 554, 36, 178, 5, 2.5, 'rgba(255, 255, 255, 0.12)');
    if (progress > 0) {
      fillRoundRect(ctx, 554, 36, Math.max(6, 178 * progress), 5, 2.5, goalMet ? PALETTE.greenBright : PALETTE.brassBright);
    }

    // Center-right: Combo Meter
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

    // 3 streak pips showing progress to x3
    for (let p = 0; p < 3; p += 1) {
      const lit = state.combo > p;
      ctx.beginPath();
      ctx.arc(882 + p * 14, 29, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = lit ? (hotCombo ? '#ffe57a' : PALETTE.greenBright) : 'rgba(255, 245, 224, 0.18)';
      ctx.fill();
    }

    // Right: Strikes (3 ceramic plates)
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

    // Mute & Pause icon-only controls (identical 36x36 geometry)
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

    // Soft card drop shadow onto warm tile wall
    ctx.fillStyle = 'rgba(42, 26, 15, 0.18)';
    fillRoundRect(ctx, rect.x + 2, rect.y + 5, rect.w, rect.h, 12, 'rgba(42, 26, 15, 0.18)');

    // Card parchment body
    const bg = highlighted ? PALETTE.cardHighlight : PALETTE.cardPaper;
    fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, bg);

    // Highlight glow ring when matched on serve, else warm card border
    if (highlighted) {
      strokeRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, PALETTE.greenBright, 3);
      strokeRoundRect(ctx, rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6, 15, 'rgba(71, 199, 126, 0.35)', 4);
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

    // Brass ticket clip pinning card to the overhead rail
    fillRoundRect(ctx, rect.x + rect.w / 2 - 18, rect.y - 11, 36, 16, 4, PALETTE.brass);
    strokeRoundRect(ctx, rect.x + rect.w / 2 - 18, rect.y - 11, 36, 16, 4, PALETTE.brassDark, 1);
    ctx.beginPath();
    ctx.arc(rect.x + rect.w / 2, rect.y - 3, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = '#3a2614';
    ctx.fill();

    // Header row: Dish name + Coin price pill
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    setFont('700', 19, FONTS.display);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.fillText(recipe.name, rect.x + 16, rect.y + 26);

    if (highlighted && servedBadgeText) {
      fillRoundRect(ctx, rect.x + rect.w - 112, rect.y + 12, 96, 26, 13, PALETTE.green);
      setFont('800', 12);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(servedBadgeText, rect.x + rect.w - 64, rect.y + 25);
    } else {
      // Price pill
      fillRoundRect(ctx, rect.x + rect.w - 76, rect.y + 12, 60, 26, 13, '#f4e6c8');
      strokeRoundRect(ctx, rect.x + rect.w - 76, rect.y + 12, 60, 26, 13, '#d7b778', 1);
      drawCoin(ctx, rect.x + rect.w - 61, rect.y + 25, 8);
      setFont('700', 14);
      ctx.fillStyle = PALETTE.inkDark;
      ctx.textAlign = 'left';
      ctx.fillText(`${recipe.price}`, rect.x + rect.w - 48, rect.y + 26);
    }

    // Subtle hairline separator
    ctx.fillStyle = '#eadcc3';
    ctx.fillRect(rect.x + 16, rect.y + 44, rect.w - 32, 1);

    // Recipe icon sequence (each step in order with warm tile & label)
    const steps = recipe.steps;
    const stepW = steps.length === 4 ? 82 : 108;
    const stepGap = steps.length === 4 ? 12 : 18;
    const totalRowW = steps.length * stepW + (steps.length - 1) * stepGap;
    const startX = rect.x + (rect.w - totalRowW) / 2;
    const rowY = rect.y + 52;
    const rowH = 58;

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const spec = INGREDIENT_BY_ID[step.id];
      const sx = startX + i * (stepW + stepGap);

      // Step pill frame
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

      // Drawn ingredient icon (cooked items shown golden!)
      drawIngredientIcon(
        ctx,
        step.id,
        step.cooked ? COOK_STATE.GOLDEN : COOK_STATE.READY,
        sx + stepW / 2,
        rowY + 23,
        16,
      );

      // Tiny flame badge on cookable recipe steps
      if (step.cooked) {
        drawFlame(ctx, sx + stepW - 11, rowY + 11, 5.5, '#de6522');
      }

      // Ingredient name label
      setFont('600', 11);
      ctx.fillStyle = PALETTE.inkMid;
      ctx.textAlign = 'center';
      ctx.fillText(spec.name, sx + stepW / 2, rowY + 48);

      // Subtle plus connector between steps
      if (i < steps.length - 1) {
        setFont('700', 14);
        ctx.fillStyle = '#b49e82';
        ctx.textAlign = 'center';
        ctx.fillText('+', sx + stepW + stepGap / 2, rowY + rowH / 2);
      }
    }

    // Bottom Patience bar + remaining seconds
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

  function drawOrderBoard(state) {
    // Empty slot outlines so the 3-slot rail structure always looks intentional
    for (let slot = 0; slot < RULES.maxOrders; slot += 1) {
      if (slot < state.orders.length) continue;
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

    for (let i = 0; i < state.orders.length; i += 1) {
      const order = state.orders[i];
      const isHighlighted = Boolean(order.highlighted);
      drawOrderCard(order, i, isHighlighted, isHighlighted ? 'SERVED!' : null);
    }
  }

  function drawHintBar(hint) {
    const r = LAYOUT.hintBar;
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

    // Status beacon dot
    ctx.beginPath();
    ctx.arc(r.x + 18, r.y + r.h / 2, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = dot;
    ctx.fill();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    setFont('600', 13.5);
    ctx.fillStyle = PALETTE.creamText;
    ctx.fillText(hint.text, r.x + 32, r.y + r.h / 2 + 0.5);

    // Compact right-hand keyboard reminder
    setFont('500', 11.5);
    ctx.fillStyle = PALETTE.creamMuted;
    ctx.textAlign = 'right';
    ctx.fillText('1-0 Ingredients   Q/W Burners   Space Serve   T Trash   P Pause', r.x + r.w - 16, r.y + r.h / 2 + 0.5);
  }

  function drawStoveRange(state, ui) {
    const st = LAYOUT.stove;
    const shakeX = state.stoveShake > 0 ? Math.sin(state.stoveShake * 55) * 7 * (state.stoveShake / 0.36) : 0;

    ctx.save();
    ctx.translate(shakeX, 0);

    // Drop shadow onto butcher-block counter
    fillRoundRect(ctx, st.x + 2, st.y + 6, st.w, st.h, 16, 'rgba(34, 19, 10, 0.32)');

    // Brushed steel outer bezel
    const bezelG = ctx.createLinearGradient(st.x, st.y, st.x, st.y + st.h);
    bezelG.addColorStop(0, '#6a6871');
    bezelG.addColorStop(0.5, '#434148');
    bezelG.addColorStop(1, '#2b2a2f');
    fillRoundRect(ctx, st.x, st.y, st.w, st.h, 16, bezelG);
    strokeRoundRect(ctx, st.x, st.y, st.w, st.h, 16, '#84828b', 1.2);

    // Dark recessed cast-iron cooktop well
    fillRoundRect(ctx, st.x + 10, st.y + 10, st.w - 20, st.h - 20, 11, PALETTE.stoveInner);

    // Subtle engraved range label
    setFont('600', 11.5);
    ctx.fillStyle = '#99949f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('STOVE RANGE', st.x + 24, st.y + 27);

    // Brass temperature dial ornaments at top-right of range
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

    // Two burners
    for (let i = 0; i < LAYOUT.burners.length; i += 1) {
      const bLayout = LAYOUT.burners[i];
      const burner = state.burners[i];
      const item = burner.item;
      const hovered = ui.hoverId === `burner-${i}`;
      const pulse = state.burnerPulse[i];

      const cx = bLayout.cx;
      const cy = bLayout.cy;
      const ringR = bLayout.r;

      // Cast-iron burner ring well
      ctx.beginPath();
      ctx.arc(cx, cy, ringR - 8, 0, Math.PI * 2);
      ctx.fillStyle = '#101013';
      ctx.fill();

      // Concentric grate rings
      ctx.strokeStyle = '#343239';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR - 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, ringR - 44, 0, Math.PI * 2);
      ctx.stroke();

      // 8 cast-iron grate arms
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

      // Active gas flame glow beneath pan
      if (item) {
        const flameGlow = ctx.createRadialGradient(cx, cy, 18, cx, cy, ringR - 4);
        if (item.state === COOK_STATE.BURNT) {
          flameGlow.addColorStop(0, 'rgba(232, 72, 48, 0.55)');
          flameGlow.addColorStop(1, 'rgba(232, 72, 48, 0)');
        } else if (item.state === COOK_STATE.GOLDEN) {
          flameGlow.addColorStop(0, 'rgba(84, 214, 134, 0.45)');
          flameGlow.addColorStop(0.7, 'rgba(242, 180, 62, 0.25)');
          flameGlow.addColorStop(1, 'rgba(242, 180, 62, 0)');
        } else {
          flameGlow.addColorStop(0, 'rgba(255, 148, 48, 0.45)');
          flameGlow.addColorStop(0.65, 'rgba(86, 168, 255, 0.22)');
          flameGlow.addColorStop(1, 'rgba(86, 168, 255, 0)');
        }
        ctx.fillStyle = flameGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR - 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Progress Ring Track (always visible subtly, vivid when cooking!)
      const startAngle = -Math.PI / 2;
      const fullArc = Math.PI * 2;
      const goldenA0 = startAngle + RULES.goldenStart * fullArc;
      const goldenA1 = startAngle + RULES.burnStart * fullArc;
      const burnA1 = startAngle + fullArc;

      // Base ring track
      ctx.lineWidth = 9;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, fullArc);
      ctx.stroke();

      // Painted GREEN GOLDEN WINDOW zone on track (always legible when cooking!)
      ctx.strokeStyle = item ? 'rgba(71, 199, 126, 0.48)' : 'rgba(71, 199, 126, 0.18)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, goldenA0, goldenA1);
      ctx.stroke();

      // Painted CRIMSON BURN ZONE on track
      ctx.strokeStyle = item ? 'rgba(218, 72, 58, 0.42)' : 'rgba(218, 72, 58, 0.14)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, goldenA1, burnA1);
      ctx.stroke();

      if (item) {
        // Active progress arc fill
        const curAngle = startAngle + item.progress * fullArc;
        const arcColor =
          item.state === COOK_STATE.BURNT
            ? PALETTE.crimsonBright
            : item.state === COOK_STATE.GOLDEN
              ? PALETTE.greenBright
              : '#f2a43b';
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, startAngle, curAngle);
        ctx.stroke();

        // Crisp progress tip dot
        const tipX = cx + Math.cos(curAngle) * ringR;
        const tipY = cy + Math.sin(curAngle) * ringR;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Skillet handle & dark cast-iron skillet pan
        ctx.save();
        ctx.translate(cx, cy);
        const scalePop = 1 + pulse * 0.05;
        ctx.scale(scalePop, scalePop);

        // Skillet handle pointing diagonally down-left/down-right
        ctx.save();
        ctx.rotate(i === 0 ? 2.38 : 0.76);
        fillRoundRect(ctx, 48, -7, 36, 14, 6, '#39373f');
        strokeRoundRect(ctx, 48, -7, 36, 14, 6, '#17161a', 1.5);
        ctx.restore();

        // Skillet body
        const panG = ctx.createRadialGradient(-14, -14, 8, 0, 0, 62);
        panG.addColorStop(0, '#44424b');
        panG.addColorStop(0.75, '#252429');
        panG.addColorStop(1, '#18171c');
        ctx.beginPath();
        ctx.arc(0, 0, 62, 0, Math.PI * 2);
        ctx.fillStyle = panG;
        ctx.fill();
        ctx.lineWidth = hovered ? 3 : 2.2;
        ctx.strokeStyle =
          hovered
            ? PALETTE.brassBright
            : item.state === COOK_STATE.GOLDEN
              ? PALETTE.greenBright
              : item.state === COOK_STATE.BURNT
                ? PALETTE.crimsonBright
                : '#6e6c78';
        ctx.stroke();

        // Inner skillet floor
        ctx.beginPath();
        ctx.arc(0, 0, 53, 0, Math.PI * 2);
        ctx.fillStyle = '#1f1e23';
        ctx.fill();

        // Drawn sizzling ingredient inside pan
        drawIngredientIcon(ctx, item.id, item.state, 0, 2, 36);
        ctx.restore();

        // Steam (golden) or smoke (burnt)
        drawBurnerVapor(ctx, cx, cy, 56, item.state, state.elapsed);
      } else if (hovered) {
        ctx.strokeStyle = 'rgba(241, 199, 107, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, fullArc);
        ctx.stroke();
      }

      // Keycap badge (Q / W) at top-left of burner
      const kx = cx - ringR + 2;
      const ky = cy - ringR - 6;
      fillRoundRect(ctx, kx, ky, 26, 24, 6, '#2e2c33');
      strokeRoundRect(ctx, kx, ky, 26, 24, 6, item && item.state === COOK_STATE.GOLDEN ? PALETTE.greenBright : PALETTE.brass, 1.3);
      setFont('700', 13);
      ctx.fillStyle = PALETTE.creamText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bLayout.key, kx + 13, ky + 12.5);

      // Status pill cleanly positioned underneath burner
      const pillY = cy + ringR + 18;
      let pillText = 'EMPTY';
      let pillBg = 'rgba(255, 255, 255, 0.06)';
      let pillFg = '#9b96a3';
      let pillBorder = 'rgba(255, 255, 255, 0.12)';
      if (item) {
        const spec = INGREDIENT_BY_ID[item.id];
        if (item.state === COOK_STATE.GOLDEN) {
          pillText = `GOLDEN ${spec.name.toUpperCase()} — CLICK!`;
          pillBg = 'rgba(45, 155, 95, 0.28)';
          pillFg = '#8ef5b8';
          pillBorder = PALETTE.greenBright;
        } else if (item.state === COOK_STATE.BURNT) {
          pillText = `BURNT ${spec.name.toUpperCase()} — CLEAR`;
          pillBg = 'rgba(201, 67, 56, 0.3)';
          pillFg = '#ffa59d';
          pillBorder = PALETTE.crimsonBright;
        } else {
          pillText = `COOKING ${spec.name.toUpperCase()}…`;
          pillBg = 'rgba(223, 145, 36, 0.22)';
          pillFg = '#ffd285';
          pillBorder = PALETTE.amber;
        }
      }
      const pillW = 192;
      fillRoundRect(ctx, cx - pillW / 2, pillY, pillW, 25, 12.5, pillBg);
      strokeRoundRect(ctx, cx - pillW / 2, pillY, pillW, 25, 12.5, pillBorder, 1.2);
      setFont('700', 11.5);
      ctx.fillStyle = pillFg;
      ctx.textAlign = 'center';
      ctx.fillText(pillText, cx, pillY + 13);
    }

    ctx.restore();
  }

  function drawAssemblyPlate(state, readyMatch) {
    const pz = LAYOUT.plateZone;
    const shakeX = state.plateShake > 0 ? Math.sin(state.plateShake * 55) * 8 * (state.plateShake / 0.4) : 0;

    ctx.save();
    ctx.translate(shakeX, 0);

    // Shadow & dark slate woven chef's placemat
    fillRoundRect(ctx, pz.x + 2, pz.y + 6, pz.w, pz.h, 16, 'rgba(34, 19, 10, 0.3)');
    fillRoundRect(ctx, pz.x, pz.y, pz.w, pz.h, 16, PALETTE.placemat);
    strokeRoundRect(
      ctx,
      pz.x,
      pz.y,
      pz.w,
      pz.h,
      16,
      readyMatch ? PALETTE.greenBright : PALETTE.placematTrim,
      readyMatch ? 2.4 : 1.5,
    );

    // Subtle linen stitch frame inside placemat
    ctx.save();
    ctx.setLineDash([5, 5]);
    strokeRoundRect(ctx, pz.x + 10, pz.y + 10, pz.w - 20, pz.h - 20, 10, 'rgba(232, 224, 210, 0.16)', 1);
    ctx.setLineDash([]);
    ctx.restore();

    // Label top-left
    setFont('600', 11.5);
    ctx.fillStyle = '#aeb9bb';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('ASSEMBLY PLATE', pz.x + 22, pz.y + 26);

    // Ready-to-serve tag top-right when plate matches an active order cleanly
    if (readyMatch) {
      fillRoundRect(ctx, pz.x + pz.w - 146, pz.y + 15, 126, 22, 11, 'rgba(45, 155, 95, 0.3)');
      strokeRoundRect(ctx, pz.x + pz.w - 146, pz.y + 15, 126, 22, 11, PALETTE.greenBright, 1.2);
      setFont('700', 11);
      ctx.fillStyle = '#97f7be';
      ctx.textAlign = 'center';
      ctx.fillText('READY TO SERVE', pz.x + pz.w - 83, pz.y + 26.5);
    }

    // Porcelain Chef's Plate
    const cx = pz.cx;
    const cy = pz.cy;

    if (readyMatch) {
      const aura = ctx.createRadialGradient(cx, cy, pz.outerR - 10, cx, cy, pz.outerR + 22);
      aura.addColorStop(0, 'rgba(71, 199, 126, 0.36)');
      aura.addColorStop(1, 'rgba(71, 199, 126, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, pz.outerR + 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Plate shadow
    ctx.fillStyle = 'rgba(10, 14, 15, 0.42)';
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 7, pz.outerR + 1, 0, Math.PI * 2);
    ctx.fill();

    // Outer porcelain rim
    const plateG = ctx.createRadialGradient(cx - 28, cy - 32, 12, cx, cy, pz.outerR);
    plateG.addColorStop(0, '#ffffff');
    plateG.addColorStop(0.75, PALETTE.porcelain);
    plateG.addColorStop(1, PALETTE.porcelainShade);
    ctx.fillStyle = plateG;
    ctx.beginPath();
    ctx.arc(cx, cy, pz.outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9bfae';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fine gold bistro plate trim
    ctx.beginPath();
    ctx.arc(cx, cy, pz.outerR - 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212, 160, 69, 0.7)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Inner recessed dish well
    const wellG = ctx.createRadialGradient(cx + 12, cy + 16, 12, cx, cy, pz.innerR);
    wellG.addColorStop(0, '#ffffff');
    wellG.addColorStop(0.85, '#f6f1e8');
    wellG.addColorStop(1, '#e4dbd0');
    ctx.fillStyle = wellG;
    ctx.beginPath();
    ctx.arc(cx, cy, pz.innerR, 0, Math.PI * 2);
    ctx.fill();

    // Plated dish artwork OR calm empty prompt
    if (state.plate.length === 0) {
      setFont('500', 13);
      ctx.fillStyle = '#9c8f7d';
      ctx.textAlign = 'center';
      ctx.fillText('Click ingredients or', cx, cy - 8);
      ctx.fillText('burners to plate', cx, cy + 12);
    } else {
      drawPlatedDish(ctx, state.plate, cx, cy, pz.innerR * 0.94);
    }

    // Ingredient chip strip right below the plate so stacked contents are 100% unambiguous
    const chipY = pz.y + pz.h - 36;
    if (state.plate.length > 0) {
      ctx.textBaseline = 'middle';
      setFont('600', 11.5);
      const chips = state.plate.map((it) => {
        const spec = INGREDIENT_BY_ID[it.id];
        let tag = '';
        let bg = 'rgba(255, 250, 240, 0.14)';
        let fg = PALETTE.creamText;
        let bd = 'rgba(255, 250, 240, 0.25)';
        if (spec.cookable) {
          if (it.state === COOK_STATE.GOLDEN) {
            tag = ' ★';
            bg = 'rgba(45, 155, 95, 0.3)';
            fg = '#9ff7c4';
            bd = PALETTE.greenBright;
          } else if (it.state === COOK_STATE.BURNT) {
            tag = ' ✕';
            bg = 'rgba(201, 67, 56, 0.36)';
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
      ctx.fillText('Plate empty', pz.cx, chipY + 11);
    }

    ctx.restore();
  }

  function drawServiceStation(state, ui, readyMatch) {
    // 1. Primary SERVE button
    const sb = LAYOUT.serveBtn;
    const hoverServe = ui.hoverId === 'serve';
    const serveReady = Boolean(readyMatch);

    // Shadow
    fillRoundRect(ctx, sb.x + 2, sb.y + 6, sb.w, sb.h, 16, 'rgba(25, 16, 10, 0.34)');

    const sg = ctx.createLinearGradient(sb.x, sb.y, sb.x, sb.y + sb.h);
    if (serveReady) {
      sg.addColorStop(0, hoverServe ? '#34a871' : PALETTE.serveReadyTop);
      sg.addColorStop(1, hoverServe ? '#217d52' : PALETTE.serveReadyBottom);
    } else {
      sg.addColorStop(0, hoverServe ? '#2a855b' : PALETTE.serveTop);
      sg.addColorStop(1, hoverServe ? '#1c6342' : PALETTE.serveBottom);
    }
    fillRoundRect(ctx, sb.x, sb.y, sb.w, sb.h, 16, sg);
    strokeRoundRect(
      ctx,
      sb.x,
      sb.y,
      sb.w,
      sb.h,
      16,
      serveReady ? '#ffe285' : hoverServe ? PALETTE.brassBright : 'rgba(212, 160, 69, 0.55)',
      serveReady ? 2.8 : 1.6,
    );

    // Subtle inner highlight
    strokeRoundRect(ctx, sb.x + 4, sb.y + 4, sb.w - 8, sb.h - 8, 12, 'rgba(255, 255, 255, 0.14)', 1);

    drawServiceCloche(ctx, sb.x + sb.w / 2, sb.y + 64, 34, serveReady);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont('800', 26, FONTS.display);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SERVE', sb.x + sb.w / 2, sb.y + 114);

    setFont('600', 12.5);
    ctx.fillStyle = serveReady ? '#e6ffef' : 'rgba(230, 245, 236, 0.78)';
    ctx.fillText(
      serveReady ? `Serve ${readyMatch.recipe.shortName}` : 'Match an active order',
      sb.x + sb.w / 2,
      sb.y + 139,
    );

    // Keycap badge SPACE
    fillRoundRect(ctx, sb.x + sb.w / 2 - 34, sb.y + 150, 68, 20, 6, 'rgba(0, 0, 0, 0.25)');
    setFont('700', 10.5);
    ctx.fillStyle = '#f8e6b5';
    ctx.fillText('SPACE', sb.x + sb.w / 2, sb.y + 160.5);

    // 2. Secondary TRASH button
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

    // Keycap T
    fillRoundRect(ctx, tb.x + tb.w - 38, tb.y + tb.h / 2 - 12, 24, 24, 6, 'rgba(0, 0, 0, 0.28)');
    strokeRoundRect(ctx, tb.x + tb.w - 38, tb.y + tb.h / 2 - 12, 24, 24, 6, 'rgba(255, 245, 224, 0.25)', 1);
    setFont('700', 12);
    ctx.fillStyle = PALETTE.creamText;
    ctx.textAlign = 'center';
    ctx.fillText('T', tb.x + tb.w - 26, tb.y + tb.h / 2 + 0.5);
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

      // Recessed bin shadow
      fillRoundRect(ctx, rect.x, rect.y + 4, rect.w, rect.h, 12, 'rgba(15, 9, 5, 0.45)');

      // Ceramic/enamel prep bin tile
      fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, hovered ? '#fffdf8' : spec.tileBg);
      strokeRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        12,
        hovered ? PALETTE.brass : 'rgba(130, 100, 68, 0.42)',
        hovered ? 2.2 : 1.3,
      );

      // Subtle colored top accent bar matching ingredient identity
      fillRoundRect(ctx, rect.x + 14, rect.y + 3, rect.w - 28, 3.5, 2, spec.accent);

      // Keycap badge (1..0) top-left
      fillRoundRect(ctx, rect.x + 7, rect.y + 9, 20, 19, 5, '#2c2019');
      setFont('700', 11.5);
      ctx.fillStyle = PALETTE.creamText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(spec.key, rect.x + 17, rect.y + 19);

      // Flame icon top-right ONLY for the 4 cookable ingredients
      if (spec.cookable) {
        drawFlame(ctx, rect.x + rect.w - 15, rect.y + 18, 6.5, '#e26220');
      }

      // Custom-drawn ingredient illustration
      drawIngredientIcon(
        ctx,
        spec.id,
        spec.cookable ? COOK_STATE.RAW : COOK_STATE.READY,
        rect.x + rect.w / 2,
        rect.y + 56,
        24,
      );

      // Crisp bottom label bar
      setFont('700', 13.5);
      ctx.fillStyle = PALETTE.inkDark;
      ctx.textAlign = 'center';
      ctx.fillText(spec.name, rect.x + rect.w / 2, rect.y + rect.h - 15);

      ctx.restore();
    }
  }

  function drawEffects(state) {
    // Sparkle particles
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

    // Floating tip / serve / strike popups
    for (let i = 0; i < state.popups.length; i += 1) {
      const p = state.popups[i];
      const alpha = Math.min(1, Math.max(0, 1 - Math.max(0, p.age - p.life * 0.55) / (p.life * 0.45)));
      ctx.save();
      ctx.globalAlpha = alpha;

      const isGold = p.tone === 'gold';
      const w = isGold ? 228 : 186;
      const h = p.subtext ? 62 : 40;
      const px = p.x - w / 2;
      const py = p.y - h / 2;

      fillRoundRect(ctx, px + 2, py + 5, w, h, 14, 'rgba(20, 12, 8, 0.36)');
      fillRoundRect(ctx, px, py, w, h, 14, isGold ? '#223f2e' : '#581f1b');
      strokeRoundRect(ctx, px, py, w, h, 14, isGold ? PALETTE.brassBright : PALETTE.crimsonBright, 2.2);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isGold) {
        drawCoin(ctx, px + 30, py + (p.subtext ? 24 : 20), 12);
        setFont('800', 24);
        ctx.fillStyle = '#ffe98c';
        ctx.fillText(p.text, p.x + 14, py + (p.subtext ? 25 : 21));
      } else {
        setFont('800', 20);
        ctx.fillStyle = '#ffc1b9';
        ctx.fillText(p.text, p.x, py + (p.subtext ? 23 : 20));
      }

      if (p.subtext) {
        setFont('700', 12.5);
        ctx.fillStyle = isGold ? '#9ef5c2' : '#f7d5d0';
        ctx.fillText(p.subtext, p.x, py + 47);
      }
      ctx.restore();
    }

    // Staged/live prominent Combo x3 Celebration Badge beside the serve popup when combo >= 2
    if (state.serveHighlight && state.serveHighlight.comboMult >= 2) {
      const hl = state.serveHighlight;
      const bx = 918;
      const by = 290;
      ctx.save();
      fillRoundRect(ctx, bx - 64, by - 26, 128, 52, 26, 'rgba(26, 18, 12, 0.92)');
      strokeRoundRect(ctx, bx - 64, by - 26, 128, 52, 26, '#ffe078', 2.4);
      setFont('800', 12);
      ctx.fillStyle = '#f5cb69';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('COMBO', bx, by - 9);
      setFont('800', 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`x${hl.comboMult}`, bx, by + 11);
      ctx.restore();
    }
  }

  function drawActionButton(rect, label, primary, hovered) {
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
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 0.5);
    ctx.restore();
  }

  function drawTitleOverlay(ui) {
    // Gentle warm vignette — keeps kitchen counter, stations, and order board clearly visible around the poster card!
    const vig = ctx.createRadialGradient(STAGE.width / 2, STAGE.height / 2, 220, STAGE.width / 2, STAGE.height / 2, 740);
    vig.addColorStop(0, 'rgba(28, 18, 12, 0.42)');
    vig.addColorStop(1, 'rgba(20, 12, 8, 0.58)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);

    // Centered poster title panel leaving top order rail & bottom 10 stations framing the screen
    const px = 250;
    const py = 122;
    const pw = 780;
    const ph = 468;

    fillRoundRect(ctx, px + 4, py + 12, pw, ph, 22, 'rgba(12, 7, 4, 0.48)');
    const cardG = ctx.createLinearGradient(px, py, px, py + ph);
    cardG.addColorStop(0, '#fdf6e8');
    cardG.addColorStop(1, '#f4e6ce');
    fillRoundRect(ctx, px, py, pw, ph, 22, cardG);
    strokeRoundRect(ctx, px, py, pw, ph, 22, PALETTE.brass, 3);
    strokeRoundRect(ctx, px + 8, py + 8, pw - 16, ph - 16, 16, 'rgba(166, 118, 42, 0.35)', 1.2);

    // Header: Crest + Title + Tagline
    drawLadleCrest(ctx, STAGE.width / 2, py + 48, 30);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont('700', 42, FONTS.display);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.fillText('THE GOLDEN LADLE', STAGE.width / 2, py + 104);

    setFont('500', 15.5);
    ctx.fillStyle = PALETTE.inkMid;
    ctx.fillText(
      'Cook to the green golden window, plate each recipe cleanly, and serve before patience runs out.',
      STAGE.width / 2,
      py + 136,
    );

    // Compact How-to-Play Menu Panel listing all 5 recipes
    const mx = px + 34;
    const my = py + 158;
    const mw = pw - 68;
    const mh = 204;
    fillRoundRect(ctx, mx, my, mw, mh, 14, '#fffaf1');
    strokeRoundRect(ctx, mx, my, mw, mh, 14, '#dbc7a6', 1.3);

    setFont('700', 13);
    ctx.fillStyle = '#8b5c1a';
    ctx.textAlign = 'left';
    ctx.fillText('KITCHEN MENU — 5 RECIPES', mx + 18, my + 21);

    setFont('500', 12);
    ctx.fillStyle = PALETTE.inkMid;
    ctx.textAlign = 'right';
    ctx.fillText('Flame icon = cook to golden on Burner 1/2 (Q/W)', mx + mw - 18, my + 21);

    // Draw 5 recipes in a crisp 2-column grid (3 left, 2 right + Shift Rules card bottom-right!)
    const colW = (mw - 48) / 2;
    const rowH = 50;
    for (let i = 0; i < RECIPES.length; i += 1) {
      const recipe = RECIPES[i];
      const col = i < 3 ? 0 : 1;
      const row = i < 3 ? i : i - 3;
      const rx = mx + 16 + col * (colW + 16);
      const ry = my + 38 + row * (rowH + 6);

      fillRoundRect(ctx, rx, ry, colW, rowH, 10, '#f8efe0');
      strokeRoundRect(ctx, rx, ry, colW, rowH, 10, '#e3d2b6', 1);

      setFont('700', 14, FONTS.display);
      ctx.fillStyle = PALETTE.inkDark;
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name, rx + 12, ry + 18);

      // Step ingredients text + mini drawn icons on right
      const ingText = recipe.steps
        .map((s) => `${INGREDIENT_BY_ID[s.id].name}${s.cooked ? '*' : ''}`)
        .join(' + ');
      setFont('500', 11.5);
      ctx.fillStyle = PALETTE.inkMid;
      ctx.fillText(ingText, rx + 12, ry + 36);

      // Mini drawn icons on the right half of the row
      const iconCount = recipe.steps.length;
      const startIx = rx + colW - 18 - (iconCount - 1) * 26;
      for (let s = 0; s < iconCount; s += 1) {
        const st = recipe.steps[s];
        const ix = startIx + s * 26;
        drawIngredientIcon(
          ctx,
          st.id,
          st.cooked ? COOK_STATE.GOLDEN : COOK_STATE.READY,
          ix,
          ry + 25,
          10.5,
        );
        if (st.cooked) drawFlame(ctx, ix + 8, ry + 12, 3.6, '#e26220');
      }
    }

    // Bottom-right 6th slot inside the menu box: Shift Rules & Controls summary
    const ruleX = mx + 16 + (colW + 16);
    const ruleY = my + 38 + 2 * (rowH + 6);
    fillRoundRect(ctx, ruleX, ruleY, colW, rowH, 10, '#2c2019');
    strokeRoundRect(ctx, ruleX, ruleY, colW, rowH, 10, PALETTE.brass, 1.2);
    setFont('700', 12.5);
    ctx.fillStyle = PALETTE.brassBright;
    ctx.textAlign = 'left';
    ctx.fillText('GOAL: 130 coins in 2:30 (180 / 240 for 2-3 stars)', ruleX + 12, ruleY + 18);
    setFont('500', 11.5);
    ctx.fillStyle = PALETTE.creamText;
    ctx.fillText('Keys: 1-0 Stations · Q/W Burners · Space Serve · T Trash', ruleX + 12, ruleY + 36);

    // Primary Start button
    drawActionButton(OVERLAY_RECTS.titleStart, 'Click or Press Space to Start', true, ui.hoverId === 'title-start');
  }

  function drawPauseOverlay(ui) {
    ctx.fillStyle = 'rgba(20, 12, 8, 0.64)';
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);

    const px = 410;
    const py = 200;
    const pw = 460;
    const ph = 318;
    fillRoundRect(ctx, px + 4, py + 10, pw, ph, 20, 'rgba(0, 0, 0, 0.4)');
    fillRoundRect(ctx, px, py, pw, ph, 20, '#fbf3e4');
    strokeRoundRect(ctx, px, py, pw, ph, 20, PALETTE.brass, 2.5);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont('700', 34, FONTS.display);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.fillText('Kitchen Paused', STAGE.width / 2, py + 62);

    setFont('500', 15);
    ctx.fillStyle = PALETTE.inkMid;
    ctx.fillText('Burners and order timers are held safely.', STAGE.width / 2, py + 104);
    ctx.fillText('Press P or Esc to jump right back in.', STAGE.width / 2, py + 128);

    drawActionButton(OVERLAY_RECTS.pauseResume, 'Resume Shift', true, ui.hoverId === 'pause-resume');
    drawActionButton(OVERLAY_RECTS.pauseRestart, 'Restart Shift', false, ui.hoverId === 'pause-restart');
  }

  function drawEndOverlay(state, ui, won) {
    ctx.fillStyle = 'rgba(22, 14, 9, 0.68)';
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);

    const px = 340;
    const py = 126;
    const pw = 600;
    const ph = 456;

    fillRoundRect(ctx, px + 4, py + 12, pw, ph, 22, 'rgba(0, 0, 0, 0.45)');
    const bg = ctx.createLinearGradient(px, py, px, py + ph);
    bg.addColorStop(0, '#fdf6e8');
    bg.addColorStop(1, '#f3e4ca');
    fillRoundRect(ctx, px, py, pw, ph, 22, bg);
    strokeRoundRect(ctx, px, py, pw, ph, 22, won ? PALETTE.brass : PALETTE.crimson, 3);
    strokeRoundRect(ctx, px + 8, py + 8, pw - 16, ph - 16, 16, 'rgba(166, 118, 42, 0.3)', 1.2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (won) {
      const stars = getStarsForCoins(state.coins);
      // 3 Gleaming Stars
      drawStar(ctx, STAGE.width / 2 - 74, py + 64, 28, stars >= 1);
      drawStar(ctx, STAGE.width / 2, py + 54, 34, stars >= 2);
      drawStar(ctx, STAGE.width / 2 + 74, py + 64, 28, stars >= 3);

      setFont('700', 36, FONTS.display);
      ctx.fillStyle = PALETTE.inkDark;
      ctx.fillText('Shift Complete!', STAGE.width / 2, py + 124);

      const rating =
        stars === 3 ? 'Three-Star Golden Service' : stars === 2 ? 'Two-Star Rush Mastery' : 'One-Star Shift Cleared';
      setFont('600', 15);
      ctx.fillStyle = PALETTE.green;
      ctx.fillText(rating, STAGE.width / 2, py + 156);
    } else {
      // Failed strike emblem
      for (let s = 0; s < RULES.maxStrikes; s += 1) {
        drawStrikeMark(ctx, STAGE.width / 2 + (s - 1) * 52, py + 62, 19, s < state.strikes);
      }

      setFont('700', 36, FONTS.display);
      ctx.fillStyle = PALETTE.crimson;
      ctx.fillText('Shift Failed', STAGE.width / 2, py + 124);

      setFont('600', 15);
      ctx.fillStyle = PALETTE.inkMid;
      ctx.fillText(state.failReason || 'Three strikes ended the shift.', STAGE.width / 2, py + 156);
    }

    // 4-tile Stats Grid (Coins Earned, Dishes Served, Perfect Dishes, Best Combo)
    const stats = [
      { label: 'Coins Earned', value: `${state.coins}`, note: `Goal ${RULES.coinGoal}`, accent: '#b87b16', coin: true },
      { label: 'Dishes Served', value: `${state.servedCount}`, note: 'Orders plated', accent: PALETTE.green, coin: false },
      { label: 'Perfect Dishes', value: `${state.perfectCount}`, note: 'Fast & golden', accent: '#2c7e57', coin: false },
      {
        label: 'Best Combo',
        value: `x${getComboMultiplier(state.bestCombo)}`,
        note: state.bestCombo > 0 ? `${state.bestCombo}-dish streak` : 'No streak',
        accent: '#a95e1a',
        coin: false,
      },
    ];

    const gx = px + 36;
    const gy = py + 184;
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

      setFont('500', 11.5);
      ctx.fillStyle = PALETTE.inkMuted;
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

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    drawKitchenBackdrop();
    drawHud(state, ui);
    drawOrderBoard(state);
    drawHintBar(world.getHint());
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
