// Core layout geometry, warm bistro palette, typography, and gameplay tuning for The Golden Ladle.
// The stage is a fixed 1280x720 logical space scaled uniformly to fit any desktop viewport.

export const STAGE = {
  width: 1280,
  height: 720,
};

/** Fixed simulation step: 60 updates per second regardless of display refresh rate. */
export const STEP = 1 / 60;

/** Local storage keys (always wrapped in try/catch for file:// and private browsing). */
export const STORAGE = {
  bestCoins: 'golden-ladle.best-coins',
  muted: 'golden-ladle.muted',
};

/** Shift progression, coin goals, star tiers, and order pacing. */
export const RULES = {
  shiftSeconds: 150,
  coinGoal: 130,
  starThresholds: [130, 180, 240],
  maxStrikes: 3,
  maxOrders: 3,
  maxPlateItems: 6,
  perfectPatienceRatio: 0.55,
  perfectBonus: 4,
  /** Cooking progress ratios along each burner's 0..1 ring. */
  goldenStart: 0.42,
  burnStart: 0.82,
  /** Order spawning intervals (seconds). */
  firstOrderDelay: 0.25,
  secondOrderDelay: 4.5,
  spawnIntervalMin: 9.0,
  spawnIntervalMax: 14.0,
  emptyBoardRespawn: 2.2,
  /** Order patience window (seconds), shrinking smoothly across the shift. */
  patienceStartMin: 62,
  patienceStartMax: 70,
  patienceEndMin: 45,
  patienceEndMax: 52,
};

/** Exact 1280x720 layout bands and hit rects (all aligned to 24px left/right edges). */
export const LAYOUT = {
  marginX: 24,
  contentWidth: 1232,
  hud: { x: 0, y: 0, w: 1280, h: 58 },
  muteBtn: { x: 1172, y: 11, w: 36, h: 36 },
  pauseBtn: { x: 1218, y: 11, w: 36, h: 36 },
  orderBoard: { x: 0, y: 58, w: 1280, h: 168 },
  orderRailY: 68,
  orderCard: { y: 74, w: 396, h: 144, gap: 22 },
  hintBar: { x: 24, y: 229, w: 1232, h: 30 },
  counter: { x: 0, y: 262, w: 1280, h: 458 },
  stove: { x: 24, y: 276, w: 472, h: 282 },
  burners: [
    { index: 0, key: 'Q', label: 'Burner 1', cx: 148, cy: 414, r: 86, hitR: 92 },
    { index: 1, key: 'W', label: 'Burner 2', cx: 372, cy: 414, r: 86, hitR: 92 },
  ],
  plateZone: { x: 516, y: 276, w: 448, h: 282, cx: 740, cy: 404, outerR: 108, innerR: 84 },
  serveBtn: { x: 984, y: 276, w: 272, h: 178 },
  trashBtn: { x: 984, y: 472, w: 272, h: 86 },
  prepRail: { x: 0, y: 574, w: 1280, h: 134 },
  station: { y: 584, w: 116, h: 114, gap: 8 },
};

/** Warm Parisian/Mediterranean bistro kitchen palette — high contrast, zero neon slop. */
export const PALETTE = {
  backdrop: '#1b130f',
  hudBg: '#241812',
  hudBgBottom: '#1c120d',
  brass: '#d4a045',
  brassBright: '#f1c76b',
  brassDark: '#8b6220',
  tileLight: '#f4ead8',
  tileAlt: '#eee1cb',
  tileGrout: '#d7c5a9',
  railIron: '#362720',
  cardPaper: '#fffaf0',
  cardBorder: '#d8c7ab',
  cardHighlight: '#fff4cf',
  woodTop: '#c4864d',
  woodMid: '#a56835',
  woodDark: '#7a4922',
  woodTrim: '#472a15',
  stoveBody: '#27262a',
  stoveBezel: '#5c5b63',
  stoveInner: '#18171b',
  placemat: '#2f383a',
  placematTrim: '#475456',
  porcelain: '#fdfbf7',
  porcelainShade: '#e5ddd0',
  steelBg: '#39373a',
  steelLight: '#565359',
  serveTop: '#247a52',
  serveBottom: '#18593a',
  serveReadyTop: '#2c9362',
  serveReadyBottom: '#1d6b46',
  trashTop: '#4a413d',
  trashBottom: '#352e2b',
  inkDark: '#231812',
  inkMid: '#5a4638',
  inkMuted: '#8a7462',
  creamText: '#fbf4e7',
  creamMuted: '#cbbba4',
  green: '#2d9b5f',
  greenBright: '#47c77e',
  amber: '#df9124',
  crimson: '#c94338',
  crimsonBright: '#e85b4e',
  hintBg: '#2b2019',
  hintGoodBg: '#1c3b2b',
  hintWarnBg: '#473014',
  hintErrorBg: '#4c1e1b',
};

export const FONTS = {
  display: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  ui: '"Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif',
};
