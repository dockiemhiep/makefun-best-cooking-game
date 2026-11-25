// Unified desktop keyboard + mouse input mapped onto the 1280x720 stage.
// Keyboard: 1-0 select stations left to right, Q/W take burner 1/2, Space serve, T trash, Esc/P pause, M mute.
import { LAYOUT } from './config.js';
import { INGREDIENTS } from './recipes.js';
import { OVERLAY_RECTS, SCREEN, getStationRect } from './render.js';

function inRect(pt, rect) {
  return pt.x >= rect.x && pt.x <= rect.x + rect.w && pt.y >= rect.y && pt.y <= rect.y + rect.h;
}

function inCircle(pt, cx, cy, r) {
  const dx = pt.x - cx;
  const dy = pt.y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** Determine which interactive target sits beneath stage coordinate `pt` on `screen`. */
export function hitTestStage(pt, screen) {
  // Top HUD icon buttons work on active screens
  if (inRect(pt, LAYOUT.muteBtn)) return { id: 'mute', type: 'mute' };
  if ((screen === SCREEN.PLAY || screen === SCREEN.PAUSED) && inRect(pt, LAYOUT.pauseBtn)) {
    return { id: 'pause', type: 'pause' };
  }

  if (screen === SCREEN.TITLE) {
    if (inRect(pt, OVERLAY_RECTS.titleStart)) return { id: 'title-start', type: 'start' };
    return null;
  }

  if (screen === SCREEN.PAUSED) {
    if (inRect(pt, OVERLAY_RECTS.pauseResume)) return { id: 'pause-resume', type: 'resume' };
    if (inRect(pt, OVERLAY_RECTS.pauseRestart)) return { id: 'pause-restart', type: 'replay' };
    return null;
  }

  if (screen === SCREEN.RESULTS) {
    if (inRect(pt, OVERLAY_RECTS.resultsNext)) return { id: 'results-next', type: 'next-shift' };
    if (inRect(pt, OVERLAY_RECTS.resultsReplay)) return { id: 'results-replay', type: 'replay' };
    return null;
  }

  if (screen === SCREEN.FAILED) {
    if (inRect(pt, OVERLAY_RECTS.failedRetry)) return { id: 'failed-retry', type: 'replay' };
    return null;
  }

  // SCREEN.PLAY interactive zones
  for (let i = 0; i < INGREDIENTS.length; i += 1) {
    if (inRect(pt, getStationRect(i))) {
      return { id: `station-${i}`, type: 'station', index: i };
    }
  }
  for (let i = 0; i < LAYOUT.burners.length; i += 1) {
    const b = LAYOUT.burners[i];
    if (inCircle(pt, b.cx, b.cy, b.hitR)) {
      return { id: `burner-${i}`, type: 'burner', index: i };
    }
  }
  if (inRect(pt, LAYOUT.serveBtn)) return { id: 'serve', type: 'serve' };
  if (inRect(pt, LAYOUT.trashBtn)) return { id: 'trash', type: 'trash' };
  return null;
}

export function createInput(canvas, renderer, getScreen, onCommand) {
  let hoverId = null;

  function updateHover(clientX, clientY) {
    const pt = renderer.clientToStage(clientX, clientY);
    const hit = hitTestStage(pt, getScreen());
    hoverId = hit ? hit.id : null;
    canvas.style.cursor = hoverId ? 'pointer' : 'default';
  }

  function onPointerMove(e) {
    updateHover(e.clientX, e.clientY);
  }

  function onPointerLeave() {
    hoverId = null;
    canvas.style.cursor = 'default';
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    const pt = renderer.clientToStage(e.clientX, e.clientY);
    const screen = getScreen();
    const hit = hitTestStage(pt, screen);
    if (hit) {
      onCommand(hit);
      updateHover(e.clientX, e.clientY);
    } else if (screen === SCREEN.TITLE) {
      // Allow clicking anywhere on the title poster to begin cleanly
      onCommand({ type: 'start' });
    }
  }

  function onKeyDown(e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const screen = getScreen();
    const code = e.code;

    if (code === 'KeyM') {
      e.preventDefault();
      onCommand({ type: 'mute' });
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (screen === SCREEN.PLAY || screen === SCREEN.PAUSED) {
        e.preventDefault();
        onCommand({ type: 'pause' });
      }
      return;
    }

    if (screen === SCREEN.TITLE) {
      if (code === 'Space' || code === 'Enter') {
        e.preventDefault();
        onCommand({ type: 'start' });
      }
      return;
    }

    if (screen === SCREEN.PAUSED) {
      if (code === 'Space' || code === 'Enter') {
        e.preventDefault();
        onCommand({ type: 'resume' });
      }
      return;
    }

    if (screen === SCREEN.RESULTS) {
      if (code === 'Space' || code === 'Enter') {
        e.preventDefault();
        onCommand({ type: 'next-shift' });
      }
      return;
    }

    if (screen === SCREEN.FAILED) {
      if (code === 'Space' || code === 'Enter') {
        e.preventDefault();
        onCommand({ type: 'replay' });
      }
      return;
    }

    // SCREEN.PLAY shortcuts: 1-9, 0 for stations 0..9; Q/W burners; Space serve; T trash
    if (code.startsWith('Digit')) {
      const digit = Number.parseInt(code.slice(5), 10);
      if (digit >= 1 && digit <= 9) {
        e.preventDefault();
        onCommand({ type: 'station', index: digit - 1 });
        return;
      }
      if (digit === 0) {
        e.preventDefault();
        onCommand({ type: 'station', index: 9 });
        return;
      }
    }

    if (code === 'KeyQ') {
      e.preventDefault();
      onCommand({ type: 'burner', index: 0 });
    } else if (code === 'KeyW') {
      e.preventDefault();
      onCommand({ type: 'burner', index: 1 });
    } else if (code === 'Space') {
      e.preventDefault();
      onCommand({ type: 'serve' });
    } else if (code === 'KeyT') {
      e.preventDefault();
      onCommand({ type: 'trash' });
    }
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);

  return {
    get hoverId() {
      return hoverId;
    },
    clearHover() {
      hoverId = null;
      canvas.style.cursor = 'default';
    },
  };
}
