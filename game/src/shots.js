// Minimal Stage 3 bridge for title preview; full 4-scene shot staging lands in Stage 4.
import { COOK_STATE } from './recipes.js';
import { SCREEN } from './render.js';

export function stageShot(name, world) {
  world.reset({ empty: true, shiftNumber: 1 });
  world.spawnOrder('burger', 54);
  world.spawnOrder('salad', 60);
  world.spawnOrder('pancakes', 48);
  world.state.plate.push({ id: 'greens', state: COOK_STATE.READY });
  world.state.plate.push({ id: 'tomato', state: COOK_STATE.READY });
  return { screen: name === 'rush' ? SCREEN.PLAY : SCREEN.TITLE };
}
