// Deterministic screenshot scene staging for ?shot=title|rush|serve|results&seed=N.
// Stages shots 3 and 4 directly through real world.servePlate() / world.step() paths so every
// rendered state, payout, streak, and strike total is 100% faithful to live gameplay.
import { RULES, STEP } from './config.js';
import { COOK_STATE, INGREDIENT_BY_ID, RECIPE_BY_ID } from './recipes.js';
import { SCREEN } from './render.js';

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

/** Place a complete golden dish matching `recipeId` onto `world.state.plate`. */
function buildGoldenPlate(world, recipeId) {
  const recipe = RECIPE_BY_ID[recipeId];
  world.state.plate = recipe.steps.map((step) => ({
    id: step.id,
    state: step.cooked ? COOK_STATE.GOLDEN : COOK_STATE.READY,
  }));
}

function stageTitleScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });
  s.timeLeft = RULES.shiftSeconds;
  s.elapsed = 0;
  s.coins = 0;
  s.combo = 0;
  s.strikes = 0;
  // Title screen precedes the shift: zero order cards behind the poster cover
  s.orders = [];
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

  // Mid-assembly Sunrise Burger on plate: bun + golden patty + cheese (needs Greens to finish)
  s.plate = [
    { id: 'bun', state: COOK_STATE.READY },
    { id: 'patty', state: COOK_STATE.GOLDEN },
    { id: 'cheese', state: COOK_STATE.READY },
  ];

  // Burner 1 inside the green golden zone (egg for Miso Noodle Bowl); Burner 2 heating noodles
  setBurnerItem(s.burners[0], 'egg', 0.62, COOK_STATE.GOLDEN);
  setBurnerItem(s.burners[1], 'noodle', 0.28, COOK_STATE.RAW);

  return { screen: SCREEN.PLAY };
}

function stageServeScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });
  s.timeLeft = 64;
  s.elapsed = 86.0;
  s.coins = 96;
  s.combo = 2;
  s.bestCombo = 2;
  s.servedCount = 3;
  s.perfectCount = 2;
  s.strikes = 0;

  // Front order at 48/62s patience -> real servePlate() computes:
  // 28 + round(6 * 48/62) * 3 + 4 = 28 + 5 * 3 + 4 = +47 coins (total 96 + 47 = 143)
  const o0 = world.spawnOrder('burger', 62);
  const o1 = world.spawnOrder('noodle_bowl', 60);
  const o2 = world.spawnOrder('omelette', 58);
  o0.patience = 48;
  o1.patience = 36;
  o2.patience = 49;

  buildGoldenPlate(world, 'burger');
  setBurnerItem(s.burners[0], 'noodle', 0.56, COOK_STATE.GOLDEN);

  // Execute the real live serve path — snapshots order card + plated burger into serveHighlight
  world.servePlate();

  return { screen: SCREEN.PLAY };
}

function stageResultsScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });

  const serveOrder = (recipeId, patience, maxPatience) => {
    s.orders = [];
    const ord = world.spawnOrder(recipeId, maxPatience);
    ord.patience = patience;
    buildGoldenPlate(world, recipeId);
    world.servePlate();
  };

  // Serves 1-3 (streak 1 -> 2 -> 3): 26 + 32 + 37 = 95 coins (2 perfect)
  serveOrder('salad', 48, 64);     // 18 + round(5*48/64)*1 + 4 = 26
  serveOrder('omelette', 44, 62);  // 20 + round(5*44/62)*2 + 4 = 32
  serveOrder('burger', 28, 62);    // 28 + round(6*28/62)*3 + 0 = 37

  // 2 orders expire mid-shift -> real step() adds 2 strikes and resets combo to 0
  s.orders = [];
  const t1 = world.spawnOrder('salad', 58);
  const t2 = world.spawnOrder('pancakes', 58);
  t1.patience = 0.01;
  t2.patience = 0.01;
  s.nextSpawnIn = 99;
  world.step(STEP);

  // Clutch recovery streak — Serves 4-9 (streak 1 -> 6 -> bestCombo 6): 32 + 30 + 31 + 47 + 40 + 33 = 213 coins (5 perfect)
  serveOrder('pancakes', 40, 60);    // 24 + round(6*40/60)*1 + 4 = 32
  serveOrder('noodle_bowl', 26, 58); // 24 + round(6*26/58)*2 + 0 = 30
  serveOrder('salad', 39, 56);       // 18 + round(5*39/56)*3 + 4 = 31
  serveOrder('burger', 42, 56);      // 28 + round(6*42/56)*3 + 4 = 47
  serveOrder('noodle_bowl', 38, 54); // 24 + round(6*38/54)*3 + 4 = 40
  serveOrder('omelette', 34, 52);    // 20 + round(5*34/52)*3 + 4 = 33
  // Total: 95 + 213 = 308 coins, 9 served, 7 perfect, 2 strikes, bestCombo 6 (x3)

  // End the shift cleanly through real step() so outcome becomes OUTCOME.WON at 00:00
  s.orders = [];
  s.serveHighlight = null;
  s.popups = [];
  s.particles = [];
  s.hintOverride = null;
  s.strikeFlash = 0;
  s.timeLeft = 0.01;
  s.elapsed = RULES.shiftSeconds - 0.01;
  s.nextSpawnIn = 99;
  world.step(STEP);

  return { screen: SCREEN.RESULTS };
}

/** Configure `world` deterministically for `name` (title | rush | serve | results) and return the active screen. */
export function stageShot(name, world) {
  if (name === 'rush') return stageRushScene(world);
  if (name === 'serve') return stageServeScene(world);
  if (name === 'results') return stageResultsScene(world);
  return stageTitleScene(world);
}
