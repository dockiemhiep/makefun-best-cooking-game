// Deterministic screenshot scene staging for ?shot=title|rush|serve|results&seed=N.
// Never starts timers or animation loops; every pixel is reproducible from the seed.
import { RULES } from './config.js';
import { COOK_STATE, INGREDIENT_BY_ID } from './recipes.js';
import { SCREEN } from './render.js';
import { OUTCOME } from './world.js';

function setBurnerItem(burner, id, progress, state) {
  const spec = INGREDIENT_BY_ID[id];
  burner.item = {
    id,
    elapsed: progress * spec.cookTime,
    duration: spec.cookTime,
    progress,
    state,
    goldenNotified: state === COOK_STATE.GOLDEN || state === COOK_STATE.BURNT,
    burntNotified: state === COOK_STATE.BURNT,
  };
  burner.sizzleAccum = 0;
}

function stageTitleScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });
  s.timeLeft = RULES.shiftSeconds;
  s.elapsed = 0;
  s.coins = 0;
  s.combo = 0;
  s.strikes = 0;

  // Clean pre-shift kitchen ready to open: 3 fresh full-patience orders on the rail, clean burners & counter
  world.spawnOrder('salad', 64);
  world.spawnOrder('burger', 62);
  world.spawnOrder('pancakes', 60);

  return { screen: SCREEN.TITLE };
}

function stageRushScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });
  s.timeLeft = 88;
  s.elapsed = 62.2;
  s.coins = 96;
  s.combo = 2;
  s.bestCombo = 2;
  s.servedCount = 3;
  s.perfectCount = 2;
  s.strikes = 0;

  // 3 active live orders with varied, realistic patience drain
  const o0 = world.spawnOrder('burger', 62);
  const o1 = world.spawnOrder('noodle_bowl', 60);
  const o2 = world.spawnOrder('pancakes', 58);
  o0.patience = 38; // 61% (green)
  o1.patience = 46; // 77% (green)
  o2.patience = 24; // 41% (warm amber)

  // Mid-assembly Sunrise Burger on plate: bun + golden patty + cheese
  s.plate = [
    { id: 'bun', state: COOK_STATE.READY },
    { id: 'patty', state: COOK_STATE.GOLDEN },
    { id: 'cheese', state: COOK_STATE.READY },
  ];

  // Burner 1 inside the green golden zone (clearly showing remaining green runway); Burner 2 warming noodles
  setBurnerItem(s.burners[0], 'egg', 0.62, COOK_STATE.GOLDEN);
  setBurnerItem(s.burners[1], 'noodle', 0.28, COOK_STATE.RAW);

  return { screen: SCREEN.PLAY };
}

function stageServeScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });
  s.timeLeft = 64;
  s.elapsed = 86.0;
  s.coins = 143;
  s.combo = 3;
  s.bestCombo = 3;
  s.servedCount = 4;
  s.perfectCount = 3;
  s.strikes = 0;

  const o0 = world.spawnOrder('burger', 62);
  const o1 = world.spawnOrder('noodle_bowl', 60);
  const o2 = world.spawnOrder('omelette', 58);
  o0.patience = 44;
  o0.highlighted = true;
  o1.patience = 36;
  o2.patience = 49;

  // Completed Sunrise Burger matching the highlighted front order
  s.plate = [
    { id: 'bun', state: COOK_STATE.READY },
    { id: 'patty', state: COOK_STATE.GOLDEN },
    { id: 'cheese', state: COOK_STATE.READY },
    { id: 'greens', state: COOK_STATE.READY },
  ];

  setBurnerItem(s.burners[0], 'noodle', 0.56, COOK_STATE.GOLDEN);

  // Unified zero-overlap celebration banner: +47 coins + Perfect · x3 Tip + inline COMBO x3 badge
  s.serveHighlight = {
    slotIndex: 0,
    recipeId: 'burger',
    recipeName: 'Sunrise Burger',
    coinsEarned: 47,
    basePrice: 28,
    tip: 15,
    perfectBonus: 4,
    comboMult: 3,
    combo: 3,
    perfect: true,
    subtext: 'Perfect · x3 Tip',
    timer: 1.5,
  };

  // Golden/emerald celebration sparkles placed strictly outside the plate rim (outerR = 88 -> dist >= 104)
  const burstAngles = [-0.45, -0.1, 0.35, 0.85, 2.25, 2.75, 3.2, 3.6];
  const burstColors = ['#ffe584', '#fff6c4', '#47c77e', '#f1b943'];
  for (let i = 0; i < burstAngles.length; i += 1) {
    const a = burstAngles[i];
    const dist = 108 + (i % 2) * 18;
    s.particles.push({
      x: 740 + Math.cos(a) * dist,
      y: 426 + Math.sin(a) * dist * 0.72,
      vx: 0,
      vy: 0,
      size: 4.5 + (i % 2) * 1.8,
      color: burstColors[i % burstColors.length],
      age: 0.15,
      life: 1.0,
    });
  }

  s.hintOverride = {
    text: 'Served Sunrise Burger! +47 coins (x3 combo!)',
    tone: 'good',
    timer: 3.0,
  };

  return { screen: SCREEN.PLAY };
}

function stageResultsScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });
  s.timeLeft = 0;
  s.elapsed = RULES.shiftSeconds;
  s.coins = 264;
  s.combo = 4;
  s.bestCombo = 6;
  s.servedCount = 9;
  s.perfectCount = 7;
  s.strikes = 0;
  s.outcome = OUTCOME.WON;

  world.spawnOrder('salad', 56);
  world.spawnOrder('omelette', 52);
  s.orders[0].patience = 31;
  s.orders[1].patience = 42;

  return { screen: SCREEN.RESULTS };
}

/** Configure `world` deterministically for `name` (title | rush | serve | results) and return the active screen. */
export function stageShot(name, world) {
  if (name === 'rush') return stageRushScene(world);
  if (name === 'serve') return stageServeScene(world);
  if (name === 'results') return stageResultsScene(world);
  return stageTitleScene(world);
}
