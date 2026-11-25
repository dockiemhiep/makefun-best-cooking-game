// Ingredients and recipes for The Golden Ladle.
// All 10 counter stations are listed in exact left-to-right keyboard order (1..9, 0).

export const COOK_STATE = {
  READY: 'ready',
  RAW: 'raw',
  GOLDEN: 'golden',
  BURNT: 'burnt',
};

export const INGREDIENTS = [
  { id: 'greens',   name: 'Greens',   key: '1', cookable: false, cookTime: 0,    accent: '#4d9b4a', tileBg: '#eef6ea' },
  { id: 'tomato',   name: 'Tomato',   key: '2', cookable: false, cookTime: 0,    accent: '#d84537', tileBg: '#fcede9' },
  { id: 'cheese',   name: 'Cheese',   key: '3', cookable: false, cookTime: 0,    accent: '#e8a825', tileBg: '#fdf6e2' },
  { id: 'bun',      name: 'Bun',      key: '4', cookable: false, cookTime: 0,    accent: '#c8833c', tileBg: '#faf0e3' },
  { id: 'patty',    name: 'Patty',    key: '5', cookable: true,  cookTime: 10.4, accent: '#9d4332', tileBg: '#f9ece8' },
  { id: 'egg',      name: 'Egg',      key: '6', cookable: true,  cookTime: 9.0,  accent: '#e7a428', tileBg: '#fcf6e6' },
  { id: 'noodle',   name: 'Noodle',   key: '7', cookable: true,  cookTime: 9.8,  accent: '#d49a3a', tileBg: '#faf3e4' },
  { id: 'scallion', name: 'Scallion', key: '8', cookable: false, cookTime: 0,    accent: '#3e8c4b', tileBg: '#ecf5ec' },
  { id: 'batter',   name: 'Batter',   key: '9', cookable: true,  cookTime: 9.2,  accent: '#d5a35e', tileBg: '#faf2e5' },
  { id: 'berry',    name: 'Berry',    key: '0', cookable: false, cookTime: 0,    accent: '#6a4496', tileBg: '#f3edf9' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((item) => [item.id, item]));

export const RECIPES = [
  {
    id: 'salad',
    name: 'Garden Salad',
    shortName: 'Salad',
    price: 18,
    maxTip: 5,
    steps: [
      { id: 'greens', cooked: false },
      { id: 'tomato', cooked: false },
      { id: 'egg', cooked: true },
    ],
  },
  {
    id: 'burger',
    name: 'Sunrise Burger',
    shortName: 'Burger',
    price: 28,
    maxTip: 6,
    steps: [
      { id: 'bun', cooked: false },
      { id: 'patty', cooked: true },
      { id: 'cheese', cooked: false },
      { id: 'greens', cooked: false },
    ],
  },
  {
    id: 'noodle_bowl',
    name: 'Miso Noodle Bowl',
    shortName: 'Noodle Bowl',
    price: 24,
    maxTip: 6,
    steps: [
      { id: 'noodle', cooked: true },
      { id: 'egg', cooked: true },
      { id: 'scallion', cooked: false },
    ],
  },
  {
    id: 'pancakes',
    name: 'Berry Pancake Stack',
    shortName: 'Pancakes',
    price: 24,
    maxTip: 6,
    steps: [
      { id: 'batter', cooked: true },
      { id: 'batter', cooked: true },
      { id: 'berry', cooked: false },
    ],
  },
  {
    id: 'omelette',
    name: 'Golden Omelette',
    shortName: 'Omelette',
    price: 20,
    maxTip: 5,
    steps: [
      { id: 'egg', cooked: true },
      { id: 'cheese', cooked: false },
      { id: 'tomato', cooked: false },
    ],
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));

/** Count occurrences of each ingredient ID in a list of items or recipe steps. */
export function countIngredients(list) {
  const counts = Object.create(null);
  for (let i = 0; i < list.length; i += 1) {
    const id = list[i].id;
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

/** True when `plate` contains the exact same multiset of ingredient IDs as `recipe`. */
export function matchesRecipeIngredients(plate, recipe) {
  if (plate.length !== recipe.steps.length) return false;
  const need = countIngredients(recipe.steps);
  const have = countIngredients(plate);
  for (const id in need) {
    if (have[id] !== need[id]) return false;
  }
  return true;
}

/**
 * Inspect whether `plate` matches `recipe` and check cook states for every cookable item.
 * Returns { matched, ok, badItem } where badItem is the first burnt (prioritized) or raw item.
 */
export function evaluatePlateForRecipe(plate, recipe) {
  if (!matchesRecipeIngredients(plate, recipe)) {
    return { matched: false, ok: false, badItem: null };
  }
  let rawItem = null;
  for (let i = 0; i < plate.length; i += 1) {
    const item = plate[i];
    const spec = INGREDIENT_BY_ID[item.id];
    if (!spec || !spec.cookable) continue;
    if (item.state === COOK_STATE.BURNT) {
      return { matched: true, ok: false, badItem: item };
    }
    if (item.state !== COOK_STATE.GOLDEN && rawItem === null) {
      rawItem = item;
    }
  }
  if (rawItem !== null) {
    return { matched: true, ok: false, badItem: rawItem };
  }
  return { matched: true, ok: true, badItem: null };
}

/**
 * Returns true if every item on `plate` is a valid subset of `recipe` (no extra/wrong items
 * and no burnt/raw cookable items blocking completion).
 */
export function isPlateSubsetOfRecipe(plate, recipe) {
  const need = countIngredients(recipe.steps);
  const have = countIngredients(plate);
  for (const id in have) {
    if (!need[id] || have[id] > need[id]) return false;
  }
  return true;
}

/** Return the list of recipe steps still missing from `plate` (respecting duplicate counts like 2x Batter). */
export function missingStepsForRecipe(plate, recipe) {
  const have = countIngredients(plate);
  const missing = [];
  for (let i = 0; i < recipe.steps.length; i += 1) {
    const step = recipe.steps[i];
    if (have[step.id] > 0) {
      have[step.id] -= 1;
    } else {
      missing.push(step);
    }
  }
  return missing;
}
