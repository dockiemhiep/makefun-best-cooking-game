// Deterministic screenshot scene staging for ?shot=title|rush|serve|results&seed=N.
// All score, streak, strike, and payout counters are derived by replaying legal world.servePlate()
// and world.step() sequences so every shot is a genuinely reachable frame of live gameplay.
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

function buildGoldenPlate(world, recipeId) {
  world.state.plate = RECIPE_BY_ID[recipeId].steps.map((step) => ({
    id: step.id,
    state: step.cooked ? COOK_STATE.GOLDEN : COOK_STATE.READY,
  }));
}

function replayServe(world, recipeId, patience, maxPatience) {
  world.state.orders = [];
  const ord = world.spawnOrder(recipeId, maxPatience);
  ord.patience = patience;
  buildGoldenPlate(world, recipeId);
  world.servePlate();
}

/** Shared legal 2-serve opening history for shots 2 and 3 (0 strikes, streak 2, 75 coins). */
function replayOpeningServes(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });
  // Serve 1 (x1): Miso Noodle Bowl 52/64s -> 24 + round(6*52/64)*1 + 4 = 33
  replayServe(world, 'noodle_bowl', 52, 64);
  // Serve 2 (x2): Sunrise Burger 50/62s -> 28 + round(6*50/62)*2 + 4 = 42 (total 75)
  replayServe(world, 'burger', 50, 62);
  s.orders = [];
  s.serveHighlight = null;
  s.popups = [];
  s.particles = [];
  s.hintOverride = null;
}

function stageTitleScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });
  s.timeLeft = RULES.shiftSeconds;
  s.elapsed = 0;
  s.orders = [];
  return { screen: SCREEN.TITLE };
}

function stageRushScene(world) {
  const s = world.state;
  replayOpeningServes(world);
  s.timeLeft = 88;
  s.elapsed = 62.2;

  const o0 = world.spawnOrder('burger', 62);
  const o1 = world.spawnOrder('noodle_bowl', 60);
  const o2 = world.spawnOrder('pancakes', 58);
  o0.patience = 38;
  o1.patience = 46;
  o2.patience = 24;

  s.plate = [
    { id: 'bun', state: COOK_STATE.READY },
    { id: 'patty', state: COOK_STATE.GOLDEN },
    { id: 'cheese', state: COOK_STATE.READY },
  ];

  setBurnerItem(s.burners[0], 'egg', 0.62, COOK_STATE.GOLDEN);
  setBurnerItem(s.burners[1], 'noodle', 0.28, COOK_STATE.RAW);
  return { screen: SCREEN.PLAY };
}

function stageServeScene(world) {
  // Continue directly from the exact rush world: advance 4.0 s (240 ticks) of live play,
  // adding Greens mid-way and serving the Sunrise Burger through the real serve path.
  stageRushScene(world);
  for (let i = 0; i < 120; i += 1) world.step(STEP);
  world.selectStation(0); // Greens (key 1) finishes Sunrise Burger
  for (let i = 0; i < 120; i += 1) world.step(STEP);
  world.servePlate();
  return { screen: SCREEN.PLAY };
}

function stageResultsScene(world) {
  const s = world.state;
  world.reset({ empty: true, shiftNumber: 1 });

  // Serves 1-3: 26 + 32 + 37 = 95 coins (2 perfect)
  replayServe(world, 'salad', 48, 64);
  replayServe(world, 'omelette', 44, 62);
  replayServe(world, 'burger', 28, 62);

  // 2 orders expire mid-shift -> 2 strikes, combo resets to 0
  s.orders = [];
  world.spawnOrder('salad', 58).patience = 0.01;
  world.spawnOrder('pancakes', 58).patience = 0.01;
  s.nextSpawnIn = 99;
  world.step(STEP);

  // Serves 4-9 (streak 1..6 -> bestCombo 6): 32 + 30 + 31 + 47 + 40 + 33 = 213 coins (total 308)
  replayServe(world, 'pancakes', 40, 60);
  replayServe(world, 'noodle_bowl', 26, 58);
  replayServe(world, 'salad', 39, 56);
  replayServe(world, 'burger', 42, 56);
  replayServe(world, 'noodle_bowl', 38, 54);
  replayServe(world, 'omelette', 34, 52);

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

export function stageShot(name, world) {
  if (name === 'rush') return stageRushScene(world);
  if (name === 'serve') return stageServeScene(world);
  if (name === 'results') return stageResultsScene(world);
  return stageTitleScene(world);
}
