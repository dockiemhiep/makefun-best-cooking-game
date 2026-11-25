// Lightweight WebAudio synthesizer for The Golden Ladle — zero audio files, zero network calls.
// Lazy-initializes AudioContext on the first user gesture and persists mute preference safely.
import { STORAGE } from './config.js';

function readMuted() {
  try {
    return window.localStorage.getItem(STORAGE.muted) === '1';
  } catch {
    return false;
  }
}

function saveMuted(muted) {
  try {
    window.localStorage.setItem(STORAGE.muted, muted ? '1' : '0');
  } catch {
    // Private browsing or file:// storage restriction — keep in-memory state only.
  }
}

export function createAudio() {
  let ctx = null;
  let noiseBuffer = null;
  let muted = readMuted();

  function ensureContext() {
    if (muted) return null;
    if (ctx === null) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function getNoiseBuffer(ac) {
    if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
    const len = Math.floor(ac.sampleRate * 0.25);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buf;
    return buf;
  }

  function tone(freq, freqEnd, duration, type, peakGain, delay = 0) {
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.015);
  }

  function noiseBurst(centerHz, q, duration, peakGain, delay = 0) {
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = getNoiseBuffer(ac);
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerHz, now);
    filter.Q.setValueAtTime(q, now);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  function clickPop() {
    tone(540, 260, 0.055, 'triangle', 0.11);
  }

  function sizzleTick() {
    noiseBurst(3800, 1.4, 0.095, 0.055);
  }

  function goldenDing() {
    tone(1175, 1175, 0.28, 'sine', 0.13, 0);
    tone(1760, 1760, 0.24, 'triangle', 0.06, 0.02);
  }

  function serveChime(comboMult = 1) {
    const shift = comboMult >= 3 ? 1.12 : comboMult === 2 ? 1.06 : 1.0;
    tone(587 * shift, 587 * shift, 0.18, 'triangle', 0.12, 0);
    tone(740 * shift, 740 * shift, 0.2, 'triangle', 0.12, 0.06);
    tone(880 * shift, 880 * shift, 0.28, 'sine', 0.13, 0.12);
  }

  function coinSparkle() {
    tone(1568, 1568, 0.11, 'sine', 0.075, 0.05);
    tone(1976, 1976, 0.12, 'sine', 0.075, 0.11);
    tone(2349, 2349, 0.16, 'sine', 0.08, 0.17);
  }

  function errorBuzz() {
    tone(175, 130, 0.11, 'sawtooth', 0.065, 0);
    tone(145, 110, 0.14, 'triangle', 0.075, 0.09);
  }

  function trashWhoosh() {
    noiseBurst(900, 0.9, 0.14, 0.075);
    tone(260, 140, 0.1, 'triangle', 0.06);
  }

  function strikeAlarm() {
    tone(440, 392, 0.16, 'triangle', 0.11, 0);
    tone(330, 262, 0.28, 'sawtooth', 0.07, 0.14);
  }

  function shiftEnd(won) {
    if (won) {
      tone(523, 523, 0.18, 'triangle', 0.11, 0);
      tone(659, 659, 0.18, 'triangle', 0.11, 0.11);
      tone(784, 784, 0.2, 'triangle', 0.11, 0.22);
      tone(1047, 1047, 0.42, 'sine', 0.13, 0.33);
    } else {
      tone(392, 370, 0.22, 'triangle', 0.1, 0);
      tone(349, 311, 0.24, 'triangle', 0.1, 0.18);
      tone(294, 247, 0.36, 'triangle', 0.1, 0.38);
    }
  }

  function toggleMute() {
    muted = !muted;
    saveMuted(muted);
    if (!muted) clickPop();
    return muted;
  }

  return {
    get muted() {
      return muted;
    },
    toggleMute,
    clickPop,
    sizzleTick,
    goldenDing,
    serveChime,
    coinSparkle,
    errorBuzz,
    trashWhoosh,
    strikeAlarm,
    shiftEnd,
  };
}
