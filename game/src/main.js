// Entrypoint for The Golden Ladle: wires simulation, high-DPI renderer, WebAudio synth,
// keyboard/mouse input, pause/results/fail screens, and deterministic ?shot=... capture mode.
import { STEP, STORAGE } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVT, getComboMultiplier, getStarsForCoins, OUTCOME } from './world.js';
import { createRenderer, SCREEN } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

function readBestCoins() {
  try {
    return Number.parseInt(window.localStorage.getItem(STORAGE.bestCoins) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestCoins(coins) {
  try {
    if (coins > readBestCoins()) {
      window.localStorage.setItem(STORAGE.bestCoins, String(coins));
    }
  } catch {
    // Storage disabled on file:// or private mode.
  }
}

function runShotMode(name) {
  const staged = stageShot(name, world);
  const ui = {
    screen: staged.screen,
    hoverId: null,
    muted: false,
  };
  let painted = 0;
  function paint() {
    renderer.resize();
    renderer.draw(world, ui);
    painted += 1;
    if (painted < 2) {
      requestAnimationFrame(paint);
    } else {
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(paint);
}

function runLiveGame() {
  const audio = createAudio();
  let screen = SCREEN.TITLE;
  let accumulator = 0;
  let lastNow = performance.now();

  // Stage an inviting warm kitchen behind the title poster before the first shift begins.
  stageShot('title', world);

  function triggerSounds(events) {
    if (!events) return;
    if (events & EVT.SERVE) audio.serveChime(getComboMultiplier(world.state.combo));
    if (events & EVT.COIN) audio.coinSparkle();
    if (events & EVT.GOLDEN) audio.goldenDing();
    if (events & EVT.SIZZLE) audio.sizzleTick();
    if (events & EVT.TRASH) audio.trashWhoosh();
    if (events & EVT.STRIKE) audio.strikeAlarm();
    if (events & EVT.ERROR) audio.errorBuzz();
    if ((events & EVT.CLICK) && !(events & (EVT.SERVE | EVT.TRASH | EVT.ERROR | EVT.SIZZLE))) {
      audio.clickPop();
    }
    if (events & EVT.WON) audio.shiftEnd(true);
    if (events & EVT.FAILED) audio.shiftEnd(false);
  }

  function startShift(shiftNumber) {
    world.reset({ shiftNumber });
    accumulator = 0;
    screen = SCREEN.PLAY;
    input.clearHover();
    audio.clickPop();
    announce(`Shift ${shiftNumber} started. Reach 130 coins before the timer ends.`);
  }

  function handleOutcome() {
    if (world.state.outcome === OUTCOME.WON && screen === SCREEN.PLAY) {
      screen = SCREEN.RESULTS;
      saveBestCoins(world.state.coins);
      const stars = getStarsForCoins(world.state.coins);
      announce(`Shift complete! ${world.state.coins} coins earned, ${stars} stars.`);
    } else if (world.state.outcome === OUTCOME.FAILED && screen === SCREEN.PLAY) {
      screen = SCREEN.FAILED;
      announce(`Shift failed. ${world.state.failReason}`);
    }
  }

  function handleCommand(cmd) {
    if (cmd.type === 'mute') {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound enabled.');
      return;
    }

    if (cmd.type === 'start') {
      startShift(1);
      return;
    }

    if (cmd.type === 'next-shift') {
      startShift(world.state.shiftNumber + 1);
      return;
    }

    if (cmd.type === 'replay') {
      startShift(world.state.shiftNumber);
      return;
    }

    if (cmd.type === 'pause') {
      if (screen === SCREEN.PLAY) {
        screen = SCREEN.PAUSED;
        audio.clickPop();
        announce('Paused.');
      } else if (screen === SCREEN.PAUSED) {
        screen = SCREEN.PLAY;
        lastNow = performance.now();
        accumulator = 0;
        audio.clickPop();
        announce('Resumed.');
      }
      return;
    }

    if (cmd.type === 'resume' && screen === SCREEN.PAUSED) {
      screen = SCREEN.PLAY;
      lastNow = performance.now();
      accumulator = 0;
      audio.clickPop();
      announce('Resumed.');
      return;
    }

    if (screen !== SCREEN.PLAY) return;

    let events = EVT.NONE;
    if (cmd.type === 'station') {
      events = world.selectStation(cmd.index);
    } else if (cmd.type === 'burner') {
      events = world.takeBurner(cmd.index);
    } else if (cmd.type === 'serve') {
      events = world.servePlate();
      if (events & EVT.SERVE) {
        announce(`Served! ${world.state.coins} coins total.`);
      }
    } else if (cmd.type === 'trash') {
      events = world.trashPlate();
    }
    triggerSounds(events);
  }

  const input = createInput(canvas, renderer, () => screen, handleCommand);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN.PLAY) {
      screen = SCREEN.PAUSED;
      announce('Paused.');
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(MAX_FRAME, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;

    if (screen === SCREEN.PLAY) {
      accumulator += dt;
      while (accumulator >= STEP && screen === SCREEN.PLAY) {
        const events = world.step(STEP);
        triggerSounds(events);
        if (events & EVT.STRIKE) {
          announce(`Order timed out. Strike ${world.state.strikes} of 3.`);
        }
        handleOutcome();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }

    renderer.draw(world, {
      screen,
      hoverId: input.hoverId,
      muted: audio.muted,
    });
  }

  announce('The Golden Ladle. Click or press Space to start your shift.');
  requestAnimationFrame(frame);
}

if (shotName) {
  runShotMode(shotName);
} else {
  runLiveGame();
}
