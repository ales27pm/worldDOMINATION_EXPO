#!/usr/bin/env node
/* eslint-disable */
/**
 * Dice sprite generator — classic RISK II style (solid body, white pips).
 *
 * Emits LAYERED sprites at 160×160 (covers the largest in-app use,
 * 48pt @3× = 144px):
 *   body.png            one neutral-white die body, NO pips. RiskDie tints it
 *                       per rank (tintColor flattens RGB, alpha survives), so
 *                       all 3-D modelling — edge bevel, corner rounding,
 *                       lower-right falloff — is encoded in the ALPHA channel.
 *   pip_light_1..6.png  white pips + soft dark seat-ring, transparent body.
 *                       Overlaid UNtinted on dark bodies (yellow/green/red/black).
 *   pip_dark_1..6.png   near-black pips for the white/ivory die (a classic
 *                       white die has black pips).
 *
 * Classic reference (user's RISK II gameplay video): attacker navy die,
 * defender red die, both with flat plastic bodies and bright white pips.
 * Side identity in our port comes from the plaque backing; the die BODY
 * colour carries the rank tier, so the sprites stay side-neutral.
 *
 * Usage: node scripts/generate-dice.js
 * Outputs into assets/game/dice/ (overwrites) + /tmp/dice_new_sheet.png
 * (contact sheet simulating all five rank tints × six faces).
 * After regenerating, restart the expo workflow so Metro re-hashes assets.
 */
const fs = require('fs');
const path = require('path');

/** pngjs ships with the workspace deps; fall back to the pnpm store. */
function loadPngjs() {
  try {
    return require('pngjs');
  } catch {
    const store = path.join(__dirname, '..', '..', '..', 'node_modules', '.pnpm');
    const entry = fs.existsSync(store)
      ? fs.readdirSync(store).find((d) => d.startsWith('pngjs@'))
      : undefined;
    if (entry) return require(path.join(store, entry, 'node_modules', 'pngjs'));
    throw new Error('pngjs not found — run `pnpm add -w -D pngjs` and retry.');
  }
}
const { PNG } = loadPngjs();

const SIZE = 160;
const S = SIZE / 256; // geometry authored on a 256 grid

// ── Geometry ──────────────────────────────────────────────────────────────────
const CORNER = 46 * S;   // rounded-corner radius
const MARGIN = 10 * S;   // transparent margin around the body
const BEVEL  = 26 * S;   // width of the alpha bevel ramp at the silhouette
const PIP_R  = 21 * S;   // pip radius (faces 1-5)
const PIP_R6 = 18 * S;   // slightly smaller pips on the 6 face

/** Classic pip layouts on a unit square (0..1). */
const PIP_LAYOUTS = {
  1: [[0.5, 0.5]],
  2: [[0.3, 0.3], [0.7, 0.7]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
  5: [[0.29, 0.29], [0.71, 0.29], [0.5, 0.5], [0.29, 0.71], [0.71, 0.71]],
  6: [[0.3, 0.26], [0.7, 0.26], [0.3, 0.5], [0.7, 0.5], [0.3, 0.74], [0.7, 0.74]],
};

/** Signed distance to the rounded-rect body (negative = inside). */
function bodySdf(x, y) {
  const half = SIZE / 2 - MARGIN;
  const cx = Math.abs(x - SIZE / 2) - (half - CORNER);
  const cy = Math.abs(y - SIZE / 2) - (half - CORNER);
  const ox = Math.max(cx, 0);
  const oy = Math.max(cy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(cx, cy), 0) - CORNER;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** 0→1 smooth ramp of `d` across [e0, e1]. */
function smooth(e0, e1, d) {
  const t = clamp01((d - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

function newImage() {
  return new PNG({ width: SIZE, height: SIZE });
}

function setPx(img, x, y, r, g, b, a) {
  const i = (y * SIZE + x) * 4;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
  img.data[i + 3] = a;
}

// ── Body sprite ───────────────────────────────────────────────────────────────
function renderBody() {
  const img = newImage();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = bodySdf(x, y);
      if (d > 0.75) { setPx(img, x, y, 0, 0, 0, 0); continue; }
      // Silhouette with 1.5px anti-aliased edge.
      let alpha = smooth(0.75, -0.75, d);
      // Edge bevel: alpha ramps up across BEVEL px, shaped by the light
      // direction (upper-left brighter ≈ thinner ramp, lower-right deeper).
      const nx = (x - SIZE / 2) / (SIZE / 2);
      const ny = (y - SIZE / 2) / (SIZE / 2);
      const lightDot = clamp01(0.5 - 0.5 * ((nx + ny) / Math.SQRT2)); // 1 = toward light
      const bevelDepth = 0.34 + 0.3 * (1 - lightDot); // shadow side digs deeper
      const bevel = 1 - bevelDepth * smooth(-BEVEL, 0.0, d);
      // Gentle face falloff toward lower-right for a matte plastic read.
      const faceShade = 1 - 0.1 * clamp01((nx + ny) / 2 + 0.5);
      alpha *= bevel * faceShade;
      setPx(img, x, y, 255, 255, 255, Math.round(255 * clamp01(alpha)));
    }
  }
  return img;
}

// ── Pip sprites ───────────────────────────────────────────────────────────────
/**
 * variant 'light': white pip, soft dark seat-ring (reads as a printed pip with
 * a shadow seat on light bodies; the ring disappears on dark bodies).
 * variant 'dark': near-black pip with a faint white rim-light below-right.
 */
function renderPips(face, variant) {
  const img = newImage();
  const pr = face === 6 ? PIP_R6 : PIP_R;
  const pips = PIP_LAYOUTS[face].map(([u, v]) => ({
    x: MARGIN + u * (SIZE - 2 * MARGIN),
    y: MARGIN + v * (SIZE - 2 * MARGIN),
  }));
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (const p of pips) {
        const d = Math.hypot(x - p.x, y - p.y);
        if (variant === 'light') {
          const ring = 0.4 * smooth(pr + 3.5 * S, pr + 1 * S, d) * smooth(pr - 1.5 * S, pr + 1 * S, d);
          const core = smooth(pr + 0.75, pr - 0.75, d);
          if (core > 0) {
            // White core over any ring contribution.
            const shade = 1 - 0.12 * clamp01((y - p.y + pr) / (2 * pr)); // subtle top-lit dome
            const cr = Math.round(255 * shade);
            r = cr; g = cr; b = Math.round(255 * Math.min(1, shade + 0.02));
            a = Math.max(a, core);
          } else if (ring > 0 && a < ring) {
            r = 52; g = 34; b = 20; // dark seat ring
            a = ring;
          }
        } else {
          const core = smooth(pr + 0.75, pr - 0.75, d);
          if (core > 0) {
            const shade = 0.16 * clamp01((y - p.y + pr) / (2 * pr));
            const cr = Math.round(24 + 26 * shade);
            r = cr; g = Math.round(cr * 0.92); b = Math.round(cr * 0.85);
            a = Math.max(a, core);
          }
        }
      }
      setPx(img, x, y, r, g, b, Math.round(255 * clamp01(a)));
    }
  }
  return img;
}

// ── Contact sheet (simulates RiskDie's two-layer tint compositing) ───────────
const TIER_SIM = [
  { name: 'white',  body: [0xec, 0xe7, 0xdc], pips: 'dark' },
  { name: 'yellow', body: [0xd3, 0xa5, 0x34], pips: 'light' },
  { name: 'green',  body: [0x3d, 0x8b, 0x40], pips: 'light' },
  { name: 'red',    body: [0xb3, 0x27, 0x2d], pips: 'light' },
  { name: 'black',  body: [0x2f, 0x2b, 0x28], pips: 'light' },
];

function buildSheet(body, pipSets) {
  const CELL = 84;
  const PAD = 10;
  const sheet = new PNG({
    width: PAD + 6 * (CELL + PAD),
    height: PAD + TIER_SIM.length * (CELL + PAD),
  });
  // Parchment backdrop so alpha edges are visible.
  for (let i = 0; i < sheet.data.length; i += 4) {
    sheet.data[i] = 0x8a; sheet.data[i + 1] = 0x74; sheet.data[i + 2] = 0x52; sheet.data[i + 3] = 255;
  }
  TIER_SIM.forEach((tier, row) => {
    for (let face = 1; face <= 6; face++) {
      const ox = PAD + (face - 1) * (CELL + PAD);
      const oy = PAD + row * (CELL + PAD);
      const pips = pipSets[tier.pips][face - 1];
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const sx = Math.min(SIZE - 1, Math.round((x / CELL) * SIZE));
          const sy = Math.min(SIZE - 1, Math.round((y / CELL) * SIZE));
          const si = (sy * SIZE + sx) * 4;
          // Layer 1: body tinted → RGB = tint, A = body alpha.
          const bodyA = body.data[si + 3] / 255;
          let r = tier.body[0], g = tier.body[1], b = tier.body[2], a = bodyA;
          // Layer 2: pips over.
          const pipA = pips.data[si + 3] / 255;
          if (pipA > 0) {
            r = Math.round(pips.data[si] * pipA + r * (1 - pipA));
            g = Math.round(pips.data[si + 1] * pipA + g * (1 - pipA));
            b = Math.round(pips.data[si + 2] * pipA + b * (1 - pipA));
            a = Math.max(a, pipA);
          }
          const di = ((oy + y) * sheet.width + (ox + x)) * 4;
          const bg = sheet.data[di];
          sheet.data[di] = Math.round(r * a + bg * (1 - a));
          sheet.data[di + 1] = Math.round(g * a + sheet.data[di + 1] * (1 - a));
          sheet.data[di + 2] = Math.round(b * a + sheet.data[di + 2] * (1 - a));
          sheet.data[di + 3] = 255;
        }
      }
    }
  });
  return sheet;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'assets', 'game', 'dice');
fs.mkdirSync(outDir, { recursive: true });

const body = renderBody();
const pipSets = { light: [], dark: [] };
for (let face = 1; face <= 6; face++) {
  pipSets.light.push(renderPips(face, 'light'));
  pipSets.dark.push(renderPips(face, 'dark'));
}

function save(img, file) {
  fs.writeFileSync(file, PNG.sync.write(img));
  console.log('wrote', file, fs.statSync(file).size, 'bytes');
}

save(body, path.join(outDir, 'body.png'));
for (let face = 1; face <= 6; face++) {
  save(pipSets.light[face - 1], path.join(outDir, `pip_light_${face}.png`));
  save(pipSets.dark[face - 1], path.join(outDir, `pip_dark_${face}.png`));
}

// Remove the previous single-layer sprites (superseded).
for (const set of ['red', 'gold']) {
  for (let face = 1; face <= 6; face++) {
    const old = path.join(outDir, `${set}_${face}.png`);
    if (fs.existsSync(old)) { fs.unlinkSync(old); console.log('removed', old); }
  }
}

save(buildSheet(body, pipSets), '/tmp/dice_new_sheet.png');
console.log('done');
