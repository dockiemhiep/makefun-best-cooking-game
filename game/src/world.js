// Pure simulation and kitchen state machine for The Golden Ladle.
// No DOM, canvas, or audio dependencies — fully deterministic from the injected RNG.
import { RULES } from './config.js';
import {
  COOK_STATE,
  INGREDIENT_BY_ID,
  INGREDIENTS,
  RECIPE_BY_ID,
  RECIPES,
  evaluatePlateForRecipe,
  isPlateSubsetOfRecipe,
  missingStepsForRecipe,
} from './recipes.js';

/** Bitmask events emitted by actions and world.step() for audio + screen-reader announcements. */
export const EVT = {
  NONE: 0,
  CLICK: 1 << 0,
  SIZZLE: 1 << 1,
  GOLDEN: 1 << 2,
  BURNT: 1 << 3,
  SERVE: 1 << 4,
  COIN: 1 << 5,
  ERROR: 1 << 6,
  STRIKE: 1 << 7,
  TRASH: 1 << 8,
  WON: 1 << 9,
  FAILED: 1 << 10,
};

export const OUTCOME = {
  PLAYING: 'playing',
  WON: 'won',
  FAILED: 'failed',
};

export function getComboMultiplier(combo) {
  if (combo >= 3) return 3;
  if (combo === 2) return 2;
  return 1;
}

export function getStarsForCoins(coins) {
  const [one, two, three] = RULES.starThresholds;
  if (coins >= three) return 3;
  if (coins >= two) return 2;
  if (coins >= one) return 1;
  return 0;
}

function emptyBurner(index) {
  return {
    index,
    item: null, // { id, elapsed, duration, progress, state, goldenNotified, burntNotified }
    sizzleAccum: 0,
  };
}

export function createWorld(random) {
  let nextOrderUid = 1;
  let nextPopupUid = 1;

  const state = {
    shiftNumber: 1,
    timeLeft: RULES.shiftSeconds,
    elapsed: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    servedCount: 0,
    perfectCount: 0,
    strikes: 0,
    outcome: OUTCOME.PLAYING,
    failReason: '',
    orders: [],
    burners: [emptyBurner(0), emptyBurner(1)],
    plate: [],
    popups: [],
    particles: [],
    serveHighlight: null, // { slotIndex, recipeName, coinsEarned, tip, comboMult, perfect, timer }
    stoveShake: 0,
    plateShake: 0,
    strikeFlash: 0,
    stationPulse: new Array(INGREDIENTS.length).fill(0),
    burnerPulse: [0, 0],
    hintOverride: null, // { text, tone: 'info'|'good'|'warn'|'error', timer }
    nextSpawnIn: RULES.firstOrderDelay,
    ordersSpawned: 0,
    lastRecipeId: null,
  };

  function setHintOverride(text, tone = 'info', duration = 3.2) {
    state.hintOverride = { text, tone, timer: duration };
  }

  function addPopup(text, subtext, x, y, tone = 'gold', life = 1.6) {
    state.popups.push({
      id: nextPopupUid++,
      text,
      subtext,
      x,
      y,
      tone,
      age: 0,
      life,
    });
  }

  function spawnSparkles(cx, cy, count, palette = 'gold') {
    const colors =
      palette === 'gold'
        ? ['#f5cf6b', '#fff1b5', '#47c77e', '#e8a825']
        : ['#d4a045', '#fff4cf', '#ffffff'];
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (random() - 0.5) * 0.45;
      const speed = 55 + random() * 115;
      state.particles.push({
        x: cx + (random() - 0.5) * 26,
        y: cy + (random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 45,
        size: 3 + random() * 4,
        color: colors[i % colors.length],
        age: 0,
        life: 0.65 + random() * 0.45,
      });
    }
  }

  function pickRecipe() {
    // Keep early shift welcoming and avoid repeating the exact same recipe back-to-back.
    const activeIds = new Set(state.orders.map((o) => o.recipeId));
    const pool = RECIPES.filter((r) => r.id !== state.lastRecipeId);
    const fresh = pool.filter((r) => !activeIds.has(r.id));
    const candidates = fresh.length > 0 ? fresh : pool;
    const chosen = candidates[Math.floor(random() * candidates.length)];
    state.lastRecipeId = chosen.id;
    return chosen;
  }

  function nextPatienceSeconds() {
    const shiftProgress = Math.min(1, Math.max(0, state.elapsed / RULES.shiftSeconds));
    const shiftDifficulty = Math.min(6, (state.shiftNumber - 1) * 2.5);
    const minP = RULES.patienceStartMin + (RULES.patienceEndMin - RULES.patienceStartMin) * shiftProgress - shiftDifficulty;
    const maxP = RULES.patienceStartMax + (RULES.patienceEndMax - RULES.patienceStartMax) * shiftProgress - shiftDifficulty;
    return Math.max(38, minP + random() * (maxP - minP));
  }

  function nextSpawnInterval() {
    const shiftProgress = Math.min(1, Math.max(0, state.elapsed / RULES.shiftSeconds));
    const shiftBoost = Math.min(1.5, (state.shiftNumber - 1) * 0.5);
    const maxI = RULES.spawnIntervalMax - shiftProgress * 2.5 - shiftBoost;
    const minI = Math.max(7.5, RULES.spawnIntervalMin - shiftProgress * 1.2 - shiftBoost * 0.5);
    return minI + random() * Math.max(0.5, maxI - minI);
  }

  function spawnOrder(forcedRecipeId = null, forcedPatience = null) {
    if (state.orders.length >= RULES.maxOrders) return null;
    const recipe = forcedRecipeId ? RECIPE_BY_ID[forcedRecipeId] : pickRecipe();
    const maxPatience = forcedPatience ?? nextPatienceSeconds();
    const order = {
      id: nextOrderUid++,
      recipeId: recipe.id,
      patience: maxPatience,
      maxPatience,
      enteredAt: state.elapsed,
    };
    state.orders.push(order);
    state.ordersSpawned += 1;
    return order;
  }

  function reset(options = {}) {
    const shiftNumber = options.shiftNumber ?? state.shiftNumber ?? 1;
    state.shiftNumber = shiftNumber;
    state.timeLeft = RULES.shiftSeconds;
    state.elapsed = 0;
    state.coins = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.servedCount = 0;
    state.perfectCount = 0;
    state.strikes = 0;
    state.outcome = OUTCOME.PLAYING;
    state.failReason = '';
    state.orders = [];
    state.burners = [emptyBurner(0), emptyBurner(1)];
    state.plate = [];
    state.popups = [];
    state.particles = [];
    state.serveHighlight = null;
    state.stoveShake = 0;
    state.plateShake = 0;
    state.strikeFlash = 0;
    state.stationPulse.fill(0);
    state.burnerPulse = [0, 0];
    state.hintOverride = null;
    state.ordersSpawned = 0;
    state.lastRecipeId = null;

    if (!options.empty) {
      spawnOrder();
      state.nextSpawnIn = RULES.secondOrderDelay;
    } else {
      state.nextSpawnIn = RULES.firstOrderDelay;
    }
  }

  /**
   * Find the best matching active order for `plate` (prioritizing lowest remaining patience
   * when duplicate dishes exist on the board).
   */
  function findMatchingOrder(plate = state.plate) {
    let best = null;
    for (let i = 0; i < state.orders.length; i += 1) {
      const order = state.orders[i];
      const recipe = RECIPE_BY_ID[order.recipeId];
      const evaluation = evaluatePlateForRecipe(plate, recipe);
      if (!evaluation.matched) continue;
      if (best === null || order.patience < best.order.patience) {
        best = { index: i, order, recipe, evaluation };
      }
    }
    return best;
  }

  function selectStation(index) {
    if (state.outcome !== OUTCOME.PLAYING) return EVT.NONE;
    const spec = INGREDIENTS[index];
    if (!spec) return EVT.NONE;

    state.stationPulse[index] = 1;

    if (spec.cookable) {
      const freeBurner = state.burners.find((b) => b.item === null);
      if (!freeBurner) {
        state.stoveShake = 0.36;
        setHintOverride('Both burners are busy — click a burner (Q/W) to plate what is cooking.', 'error', 3.0);
        return EVT.ERROR;
      }
      freeBurner.item = {
        id: spec.id,
        elapsed: 0,
        duration: spec.cookTime,
        progress: 0,
        state: COOK_STATE.RAW,
        goldenNotified: false,
        burntNotified: false,
      };
      freeBurner.sizzleAccum = 0;
      state.burnerPulse[freeBurner.index] = 1;
      setHintOverride(
        `Cooking ${spec.name} on Burner ${freeBurner.index + 1} — take it off (${freeBurner.index === 0 ? 'Q' : 'W'}) in the green zone.`,
        'info',
        2.6,
      );
      return EVT.CLICK | EVT.SIZZLE;
    }

    if (state.plate.length >= RULES.maxPlateItems) {
      state.plateShake = 0.34;
      setHintOverride('The plate is full — click SERVE (Space) or Trash (T).', 'error', 2.8);
      return EVT.ERROR;
    }

    state.plate.push({ id: spec.id, state: COOK_STATE.READY });
    return EVT.CLICK;
  }

  function takeBurner(burnerIndex) {
    if (state.outcome !== OUTCOME.PLAYING) return EVT.NONE;
    const burner = state.burners[burnerIndex];
    if (!burner) return EVT.NONE;

    if (!burner.item) {
      setHintOverride(
        `Burner ${burnerIndex + 1} is empty — click Patty (5), Egg (6), Noodle (7), or Batter (9) to cook.`,
        'info',
        2.6,
      );
      return EVT.CLICK;
    }

    if (state.plate.length >= RULES.maxPlateItems) {
      state.plateShake = 0.34;
      setHintOverride('The plate is full — trash it (T) before moving more food.', 'error', 2.8);
      return EVT.ERROR;
    }

    const item = burner.item;
    const spec = INGREDIENT_BY_ID[item.id];
    state.plate.push({ id: item.id, state: item.state });
    burner.item = null;
    burner.sizzleAccum = 0;
    state.burnerPulse[burnerIndex] = 1;

    if (item.state === COOK_STATE.BURNT) {
      setHintOverride(
        `The ${spec.name.toLowerCase()} is burnt — trash the plate (T) and start again.`,
        'error',
        3.6,
      );
      return EVT.CLICK | EVT.ERROR;
    }
    if (item.state === COOK_STATE.RAW) {
      setHintOverride(
        `The ${spec.name.toLowerCase()} was taken off raw — trash the plate (T) and cook until golden.`,
        'warn',
        3.6,
      );
      return EVT.CLICK | EVT.ERROR;
    }
    setHintOverride(`Golden ${spec.name} plated!`, 'good', 2.0);
    return EVT.CLICK;
  }

  function trashPlate() {
    if (state.outcome !== OUTCOME.PLAYING) return EVT.NONE;
    if (state.plate.length === 0) {
      setHintOverride('The plate is already clean.', 'info', 2.0);
      return EVT.CLICK;
    }
    state.plate = [];
    setHintOverride('Plate cleared — ready for the next dish.', 'info', 2.0);
    return EVT.TRASH;
  }

  function servePlate() {
    if (state.outcome !== OUTCOME.PLAYING) return EVT.NONE;

    if (state.plate.length === 0) {
      state.plateShake = 0.32;
      setHintOverride('The plate is empty — add ingredients to match an order on the board.', 'error', 2.8);
      return EVT.ERROR;
    }

    const match = findMatchingOrder(state.plate);
    if (match) {
      const { index, order, recipe, evaluation } = match;
      if (!evaluation.ok && evaluation.badItem) {
        const badSpec = INGREDIENT_BY_ID[evaluation.badItem.id];
        const itemLabel = badSpec.name.toLowerCase();
        state.plateShake = 0.4;
        if (evaluation.badItem.state === COOK_STATE.BURNT) {
          setHintOverride(`The ${itemLabel} is burnt — trash the plate (T) and start again.`, 'error', 4.0);
        } else {
          setHintOverride(`The ${itemLabel} is raw — trash the plate (T) and cook it to golden.`, 'error', 4.0);
        }
        return EVT.ERROR;
      }

      // Valid exact golden serve!
      const patienceRatio = Math.max(0, Math.min(1, order.patience / order.maxPatience));
      state.combo += 1;
      if (state.combo > state.bestCombo) state.bestCombo = state.combo;
      const comboMult = getComboMultiplier(state.combo);
      const baseTip = Math.max(1, Math.round(recipe.maxTip * patienceRatio));
      const tip = baseTip * comboMult;
      const perfect = patienceRatio >= RULES.perfectPatienceRatio;
      const perfectBonus = perfect ? RULES.perfectBonus : 0;
      const totalEarned = recipe.price + tip + perfectBonus;

      state.coins += totalEarned;
      state.servedCount += 1;
      if (perfect) state.perfectCount += 1;

      state.serveHighlight = {
        slotIndex: index,
        recipeId: recipe.id,
        recipeName: recipe.name,
        coinsEarned: totalEarned,
        basePrice: recipe.price,
        tip,
        perfectBonus,
        comboMult,
        combo: state.combo,
        perfect,
        timer: 1.5,
      };

      state.orders.splice(index, 1);
      state.plate = [];
      if (state.orders.length === 0) {
        state.nextSpawnIn = Math.min(state.nextSpawnIn, RULES.emptyBoardRespawn);
      }

      const subParts = [];
      if (perfect) subParts.push('Perfect');
      if (comboMult > 1) subParts.push(`x${comboMult} Tip`);
      else subParts.push(`+${tip} tip`);
      state.serveHighlight.subtext = subParts.join(' · ');
      spawnSparkles(740, 424, 16, 'gold');

      setHintOverride(
        `Served ${recipe.name}! +${totalEarned} coins${comboMult > 1 ? ` (x${comboMult} combo!)` : ''}`,
        'good',
        3.0,
      );
      return EVT.SERVE | EVT.COIN;
    }

    // No active order matched — provide a helpful specific hint.
    state.plateShake = 0.36;
    const offBoardMatch = RECIPES.find((r) => evaluatePlateForRecipe(state.plate, r).matched);
    if (offBoardMatch) {
      setHintOverride(`No active order asks for ${offBoardMatch.name} — check the board or trash (T).`, 'error', 3.4);
      return EVT.ERROR;
    }

    // Check if the plate is a valid partial build toward an active order.
    let bestPartial = null;
    for (let i = 0; i < state.orders.length; i += 1) {
      const recipe = RECIPE_BY_ID[state.orders[i].recipeId];
      if (!isPlateSubsetOfRecipe(state.plate, recipe)) continue;
      const missing = missingStepsForRecipe(state.plate, recipe);
      if (bestPartial === null || missing.length < bestPartial.missing.length) {
        bestPartial = { recipe, missing };
      }
    }
    if (bestPartial && bestPartial.missing.length > 0) {
      const nextStep = bestPartial.missing[0];
      const spec = INGREDIENT_BY_ID[nextStep.id];
      const cookedNote = nextStep.cooked ? ' (cooked golden)' : '';
      setHintOverride(
        `${bestPartial.recipe.name} still needs ${spec.name}${cookedNote} (${spec.key}).`,
        'warn',
        3.2,
      );
      return EVT.ERROR;
    }

    setHintOverride('Plate does not match any active order — trash it (T) and start fresh.', 'error', 3.2);
    return EVT.ERROR;
  }

  /** Contextual one-line guidance teaching the loop whenever no explicit feedback message is active. */
  function getHint() {
    if (state.hintOverride) {
      return { text: state.hintOverride.text, tone: state.hintOverride.tone };
    }

    // 1. Urgent burnt or golden burner states
    for (let i = 0; i < state.burners.length; i += 1) {
      const item = state.burners[i].item;
      if (!item) continue;
      const spec = INGREDIENT_BY_ID[item.id];
      const key = i === 0 ? 'Q' : 'W';
      if (item.state === COOK_STATE.BURNT) {
        return {
          text: `The ${spec.name.toLowerCase()} on Burner ${i + 1} is burnt — click it (${key}) then trash (T).`,
          tone: 'error',
        };
      }
    }
    for (let i = 0; i < state.burners.length; i += 1) {
      const item = state.burners[i].item;
      if (!item) continue;
      const spec = INGREDIENT_BY_ID[item.id];
      const key = i === 0 ? 'Q' : 'W';
      if (item.state === COOK_STATE.GOLDEN) {
        return {
          text: `The ${spec.name.toLowerCase()} is golden — click Burner ${i + 1} (${key}) to plate it!`,
          tone: 'good',
        };
      }
    }

    // 2. Check if plate has a spoiled/raw item
    for (let i = 0; i < state.plate.length; i += 1) {
      const item = state.plate[i];
      const spec = INGREDIENT_BY_ID[item.id];
      if (!spec.cookable) continue;
      if (item.state === COOK_STATE.BURNT) {
        return {
          text: `The ${spec.name.toLowerCase()} is burnt — trash the plate (T) and start again.`,
          tone: 'error',
        };
      }
      if (item.state === COOK_STATE.RAW) {
        return {
          text: `The ${spec.name.toLowerCase()} is raw — trash the plate (T) and cook it to golden.`,
          tone: 'warn',
        };
      }
    }

    // 3. Plate ready to serve!
    const readyMatch = findMatchingOrder(state.plate);
    if (readyMatch && readyMatch.evaluation.ok) {
      return {
        text: `${readyMatch.recipe.name} is ready — click SERVE (Space)!`,
        tone: 'good',
      };
    }

    // 4. Guide the next step for the best-matching active order
    if (state.orders.length === 0) {
      return { text: 'Fresh order ticket arriving — get ready at the counter!', tone: 'info' };
    }

    let targetOrder = state.orders[0];
    let targetRecipe = RECIPE_BY_ID[targetOrder.recipeId];
    if (state.plate.length > 0) {
      let best = null;
      for (let i = 0; i < state.orders.length; i += 1) {
        const ord = state.orders[i];
        const rec = RECIPE_BY_ID[ord.recipeId];
        if (!isPlateSubsetOfRecipe(state.plate, rec)) continue;
        const rem = missingStepsForRecipe(state.plate, rec).length;
        if (best === null || rem < best.rem) best = { ord, rec, rem };
      }
      if (best) {
        targetOrder = best.ord;
        targetRecipe = best.rec;
      } else {
        return {
          text: 'Plate ingredients do not fit an open order — click Trash (T) to clear it.',
          tone: 'warn',
        };
      }
    }

    const missing = missingStepsForRecipe(state.plate, targetRecipe);
    if (missing.length > 0) {
      // Account for items already cooking on burners so we don't tell the player to cook a duplicate
      const cookingCounts = Object.create(null);
      for (let i = 0; i < state.burners.length; i += 1) {
        const it = state.burners[i].item;
        if (it && it.state !== COOK_STATE.BURNT) {
          cookingCounts[it.id] = (cookingCounts[it.id] || 0) + 1;
        }
      }
      const unstarted = [];
      for (let i = 0; i < missing.length; i += 1) {
        const step = missing[i];
        if (step.cooked && cookingCounts[step.id] > 0) {
          cookingCounts[step.id] -= 1;
        } else {
          unstarted.push(step);
        }
      }

      if (unstarted.length === 0) {
        return {
          text: `Wait for the burner ring to enter green, then click Q/W to finish ${targetRecipe.name}.`,
          tone: 'info',
        };
      }

      // Prioritize starting cookable items first if a burner is free, else guide first missing step
      const freeBurner = state.burners.some((b) => b.item === null);
      const nextStep =
        (freeBurner && unstarted.find((s) => s.cooked)) ||
        unstarted.find((s) => !s.cooked) ||
        unstarted[0];
      const spec = INGREDIENT_BY_ID[nextStep.id];
      const verb = state.plate.length === 0 && !nextStep.cooked ? 'start' : missing.length === 1 ? 'finish' : 'build';
      if (nextStep.cooked) {
        return {
          text: `Click ${spec.name.toUpperCase()} (${spec.key}) to cook it for ${targetRecipe.name}.`,
          tone: 'info',
        };
      }
      return {
        text: `Click ${spec.name.toUpperCase()} (${spec.key}) to ${verb} the ${targetRecipe.name}.`,
        tone: 'info',
      };
    }

    return { text: 'Click an ingredient (1-0) to start cooking.', tone: 'info' };
  }

  function step(dt) {
    let events = EVT.NONE;
    if (state.outcome !== OUTCOME.PLAYING) {
      return events;
    }

    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.timeLeft - dt);

    // Decay transient UI feedback timers
    if (state.stoveShake > 0) state.stoveShake = Math.max(0, state.stoveShake - dt);
    if (state.plateShake > 0) state.plateShake = Math.max(0, state.plateShake - dt);
    if (state.strikeFlash > 0) state.strikeFlash = Math.max(0, state.strikeFlash - dt);
    for (let i = 0; i < state.stationPulse.length; i += 1) {
      if (state.stationPulse[i] > 0) state.stationPulse[i] = Math.max(0, state.stationPulse[i] - dt * 4.5);
    }
    for (let i = 0; i < state.burnerPulse.length; i += 1) {
      if (state.burnerPulse[i] > 0) state.burnerPulse[i] = Math.max(0, state.burnerPulse[i] - dt * 4.0);
    }
    if (state.hintOverride) {
      state.hintOverride.timer -= dt;
      if (state.hintOverride.timer <= 0) state.hintOverride = null;
    }
    if (state.serveHighlight) {
      state.serveHighlight.timer -= dt;
      if (state.serveHighlight.timer <= 0) state.serveHighlight = null;
    }

    // Update popups & particles
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const p = state.popups[i];
      p.age += dt;
      p.y -= 28 * dt;
      if (p.age >= p.life) state.popups.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.age += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 180 * dt;
      if (pt.age >= pt.life) state.particles.splice(i, 1);
    }

    // Advance stove burners
    for (let i = 0; i < state.burners.length; i += 1) {
      const burner = state.burners[i];
      const item = burner.item;
      if (!item) continue;
      item.elapsed += dt;
      item.progress = Math.min(1, item.elapsed / item.duration);

      if (item.progress >= RULES.burnStart) {
        item.state = COOK_STATE.BURNT;
        if (!item.burntNotified) {
          item.burntNotified = true;
          events |= EVT.BURNT;
          const spec = INGREDIENT_BY_ID[item.id];
          setHintOverride(
            `The ${spec.name.toLowerCase()} on Burner ${i + 1} burnt! Click ${i === 0 ? 'Q' : 'W'} and trash it (T).`,
            'error',
            3.5,
          );
        }
      } else if (item.progress >= RULES.goldenStart) {
        item.state = COOK_STATE.GOLDEN;
        if (!item.goldenNotified) {
          item.goldenNotified = true;
          events |= EVT.GOLDEN;
        }
      } else {
        item.state = COOK_STATE.RAW;
      }

      // Gentle periodic sizzle tick while actively cooking before burning
      if (item.state !== COOK_STATE.BURNT) {
        burner.sizzleAccum += dt;
        if (burner.sizzleAccum >= 1.35) {
          burner.sizzleAccum -= 1.35;
          events |= EVT.SIZZLE;
        }
      }
    }

    // Advance active orders & check patience timeouts
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        const recipe = RECIPE_BY_ID[order.recipeId];
        state.orders.splice(i, 1);
        state.strikes += 1;
        state.combo = 0;
        state.strikeFlash = 0.7;
        events |= EVT.STRIKE;
        addPopup('Strike!', `${recipe.shortName} timed out`, 222 + i * 418, 150, 'error', 1.6);
        setHintOverride(
          `${recipe.name} timed out — Strike ${state.strikes} of ${RULES.maxStrikes}!`,
          'error',
          3.4,
        );
        if (state.strikes >= RULES.maxStrikes) {
          state.outcome = OUTCOME.FAILED;
          state.failReason = 'Three customers left — shift failed.';
          return events | EVT.FAILED;
        }
      }
    }

    // Spawn new orders up to 3 active
    if (state.orders.length < RULES.maxOrders) {
      state.nextSpawnIn -= dt;
      if (state.nextSpawnIn <= 0) {
        spawnOrder();
        state.nextSpawnIn = nextSpawnInterval();
      }
    }

    // Check shift timer completion
    if (state.timeLeft <= 0) {
      if (state.coins >= RULES.coinGoal) {
        state.outcome = OUTCOME.WON;
        events |= EVT.WON;
      } else {
        state.outcome = OUTCOME.FAILED;
        state.failReason = `Shift ended at ${state.coins} / ${RULES.coinGoal} coins.`;
        events |= EVT.FAILED;
      }
    }

    return events;
  }

  reset();

  return {
    state,
    reset,
    step,
    selectStation,
    takeBurner,
    trashPlate,
    servePlate,
    spawnOrder,
    findMatchingOrder,
    getHint,
    addPopup,
    spawnSparkles,
  };
}
