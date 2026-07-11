/**
 * Generates the 12 die-face sprites (red_1..6, gold_1..6) at 160×160 — big
 * enough for the largest in-app use (48pt at 3× density = 144px) — from
 * AI-painted material textures, replacing the original 22×22 RISK II scans.
 *
 * Design constraints (see components/game/RiskDie.tsx):
 *  - Tiers white/green/black render the RED sprite through a solid tintColor,
 *    which flattens all RGB to the tint and keeps only alpha. So everything
 *    that must survive tinting is encoded in ALPHA: pips are transparent
 *    holes, the edge carries a soft alpha bevel, pip rims dip slightly.
 *  - Untinted (red/yellow tiers) get the full painted look: texture, bevel
 *    light from the upper-left, engraved ink edge, shaded pip rims.
 *
 * Usage: node scripts/generate-dice.js <redTexture.png> <goldTexture.png>
 * Outputs into assets/game/dice/ (overwrites) + /tmp/dice_new_sheet.png.
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

// 160px covers the largest in-app size (48pt at 3× density = 144px) while
// keeping the bundled weight reasonable; all geometry scales from a 256 base.
const SIZE = 160;
const S = SIZE / 256;
const CORNER = 52 * S;      // rounded-corner radius
const EDGE_FEATHER = 1.4;   // px of anti-aliased silhouette edge
const BEVEL_DEPTH = 12 * S; // px band used for light/shadow at the rim
const INK = [46, 28, 14];   // engraved outline colour
const PIP_R = 27 * S;       // pip hole radius
const PIP_FEATHER = 1.6;    // soft pip edge
const PIP_RIM = 6 * S;      // shaded ring width around each pip

const P = { A: 72 * S, B: 128 * S, C: 184 * S }; // classic 3×3 pip grid
const PIP_LAYOUT = {
  1: [[P.B, P.B]],
  2: [[P.A, P.A], [P.C, P.C]],
  3: [[P.A, P.A], [P.B, P.B], [P.C, P.C]],
  4: [[P.A, P.A], [P.C, P.A], [P.A, P.C], [P.C, P.C]],
  5: [[P.A, P.A], [P.C, P.A], [P.B, P.B], [P.A, P.C], [P.C, P.C]],
  6: [[P.A, P.A], [P.A, P.B], [P.A, P.C], [P.C, P.A], [P.C, P.B], [P.C, P.C]],
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smooth = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

function readPng(p) { return PNG.sync.read(fs.readFileSync(p)); }
function writePng(p, png) { fs.writeFileSync(p, PNG.sync.write(png)); }

/** Bilinear sample from src png at floating-point (x, y). */
function sample(src, x, y) {
  const x0 = clamp(Math.floor(x), 0, src.width - 1);
  const y0 = clamp(Math.floor(y), 0, src.height - 1);
  const x1 = Math.min(x0 + 1, src.width - 1);
  const y1 = Math.min(y0 + 1, src.height - 1);
  const fx = x - x0, fy = y - y0;
  const px = (xx, yy) => {
    const i = (yy * src.width + xx) * 4;
    return [src.data[i], src.data[i + 1], src.data[i + 2]];
  };
  const a = px(x0, y0), b = px(x1, y0), c = px(x0, y1), d = px(x1, y1);
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const top = a[k] + (b[k] - a[k]) * fx;
    const bot = c[k] + (d[k] - c[k]) * fx;
    out[k] = top + (bot - top) * fy;
  }
  return out;
}

/** Signed distance to the rounded-rect silhouette (negative = inside). */
function roundedRectSdf(x, y) {
  const half = SIZE / 2;
  const b = half - CORNER;                    // inner box half-extent
  const qx = Math.abs(x - half + 0.5) - b;
  const qy = Math.abs(y - half + 0.5) - b;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - CORNER;
}

function buildDie(tex, face) {
  // Center-crop the texture to a square region.
  const side = Math.min(tex.width, tex.height);
  const sx0 = (tex.width - side) / 2;
  const sy0 = (tex.height - side) / 2;
  const png = new PNG({ width: SIZE, height: SIZE });
  const pips = PIP_LAYOUT[face];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const d = roundedRectSdf(x, y); // negative inside
      if (d > EDGE_FEATHER) { png.data[i + 3] = 0; continue; }

      // Base colour from texture.
      let [r, g, b] = sample(tex, sx0 + ((x + 0.5) / SIZE) * side, sy0 + ((y + 0.5) / SIZE) * side);

      // Silhouette alpha with feathered edge.
      let a = smooth((EDGE_FEATHER - d) / (EDGE_FEATHER * 2));

      const depth = -d; // px inside the silhouette
      // Alpha bevel: outer band slightly translucent so tinted dice keep a rim.
      a *= 0.80 + 0.20 * smooth(depth / 7);

      // Colour bevel: light from upper-left, shadow lower-right.
      if (depth < BEVEL_DEPTH) {
        const e = 1 - depth / BEVEL_DEPTH;                    // 1 at edge → 0 inside
        const s = ((SIZE - x) + (SIZE - y) - SIZE) / SIZE;    // +1 top-left → −1 bottom-right
        const f = 1 + e * 0.28 * s;
        r *= f; g *= f; b *= f;
      }
      // Engraved ink outline hugging the silhouette.
      if (depth < 2.4) {
        const k = 0.75 * (1 - depth / 2.4);
        r = r * (1 - k) + INK[0] * k;
        g = g * (1 - k) + INK[1] * k;
        b = b * (1 - k) + INK[2] * k;
      }

      // Pips: transparent holes with a shaded, slightly translucent rim.
      for (const [cx, cy] of pips) {
        const pd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (pd < PIP_R - PIP_FEATHER) { a = 0; break; }
        if (pd < PIP_R) {
          a *= smooth((pd - (PIP_R - PIP_FEATHER)) / PIP_FEATHER);
        }
        if (pd >= PIP_R && pd < PIP_R + PIP_RIM) {
          const t = 1 - (pd - PIP_R) / PIP_RIM;               // 1 at hole → 0 outside
          const dark = 1 - 0.5 * t * t;
          r *= dark; g *= dark; b *= dark;
          a *= 1 - 0.12 * t;                                  // rim survives tinting
        }
      }

      png.data[i] = clamp(Math.round(r), 0, 255);
      png.data[i + 1] = clamp(Math.round(g), 0, 255);
      png.data[i + 2] = clamp(Math.round(b), 0, 255);
      png.data[i + 3] = clamp(Math.round(a * 255), 0, 255);
    }
  }
  return png;
}

/** Downscale (box filter) — for the preview contact sheet only. */
function scaleDown(src, size) {
  const out = new PNG({ width: size, height: size });
  const k = src.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = Math.floor(y * k); sy < Math.min((y + 1) * k, src.height); sy++) {
        for (let sx = Math.floor(x * k); sx < Math.min((x + 1) * k, src.width); sx++) {
          const i = (sy * src.width + sx) * 4;
          const al = src.data[i + 3];
          r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al;
          a += al; n++;
        }
      }
      const o = (y * size + x) * 4;
      out.data[o] = a ? r / a : 0;
      out.data[o + 1] = a ? g / a : 0;
      out.data[o + 2] = a ? b / a : 0;
      out.data[o + 3] = n ? a / n : 0;
    }
  }
  return out;
}

/** Simulate RN tintColor: RGB → tint, alpha preserved. */
function tinted(src, hex) {
  const t = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const out = new PNG({ width: src.width, height: src.height });
  src.data.copy(out.data);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = t[0]; out.data[i + 1] = t[1]; out.data[i + 2] = t[2];
  }
  return out;
}

function pasteOver(dst, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const di = ((y + oy) * dst.width + (x + ox)) * 4;
      const a = src.data[si + 3] / 255;
      for (let k = 0; k < 3; k++) {
        dst.data[di + k] = src.data[si + k] * a + dst.data[di + k] * (1 - a);
      }
      dst.data[di + 3] = 255;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const [redTexPath, goldTexPath] = process.argv.slice(2);
if (!redTexPath || !goldTexPath) {
  console.error('Usage: node scripts/generate-dice.js <redTexture.png> <goldTexture.png>');
  process.exit(1);
}
const outDir = path.join(__dirname, '..', 'assets', 'game', 'dice');
const redTex = readPng(redTexPath);
const goldTex = readPng(goldTexPath);

const dice = { red: [], gold: [] };
for (const [name, tex] of [['red', redTex], ['gold', goldTex]]) {
  for (let face = 1; face <= 6; face++) {
    const die = buildDie(tex, face);
    dice[name].push(die);
    writePng(path.join(outDir, `${name}_${face}.png`), die);
  }
}
console.log('wrote 12 sprites to', outDir);

// Contact sheet: red row, gold row, then tint simulations (white/green/black tiers).
const CELL = 96, PAD = 12;
const rows = [
  dice.red.map((d) => scaleDown(d, CELL)),
  dice.gold.map((d) => scaleDown(d, CELL)),
  dice.red.map((d) => tinted(scaleDown(d, CELL), '#c8c8c8')),
  dice.red.map((d) => tinted(scaleDown(d, CELL), '#4ade80')),
  dice.red.map((d) => tinted(scaleDown(d, CELL), '#404040')),
];
const sheet = new PNG({ width: 6 * (CELL + PAD) + PAD, height: rows.length * (CELL + PAD) + PAD });
for (let i = 0; i < sheet.data.length; i += 4) { // walnut background
  sheet.data[i] = 37; sheet.data[i + 1] = 26; sheet.data[i + 2] = 19; sheet.data[i + 3] = 255;
}
rows.forEach((row, ry) => row.forEach((cell, cx) => {
  pasteOver(sheet, cell, PAD + cx * (CELL + PAD), PAD + ry * (CELL + PAD));
}));
writePng('/tmp/dice_new_sheet.png', sheet);
console.log('contact sheet: /tmp/dice_new_sheet.png');
