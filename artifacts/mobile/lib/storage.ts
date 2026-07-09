/**
 * App Storage URL helpers
 * Bucket: replit-objstore-6751d8fb-0a63-427b-867d-c26722039490
 * Public prefix: public/
 */

const BUCKET_ID = 'replit-objstore-6751d8fb-0a63-427b-867d-c26722039490';
const BASE = `https://replit.com/object-storage/storage/v1/b/${BUCKET_ID}/o`;

/** Encode a bucket object path (e.g. "public/risk/dice/red_1.png") into a fetch URL */
export function storageUrl(objectPath: string): string {
  const encoded = objectPath.split('/').map(encodeURIComponent).join('%2F');
  return `${BASE}/${encoded}?alt=media`;
}

// ─── Dice ─────────────────────────────────────────────────────────────────────
// Red (attacker): 1, 4, 5, 6 in storage; 2 & 3 fall back to bundled sprites
// Gold (defender): 1–5 in storage; 6 falls back to bundled white_6
export const DICE_URLS = {
  red: {
    1: storageUrl('public/risk/dice/red_1.png'),
    4: storageUrl('public/risk/dice/red_4.png'),
    5: storageUrl('public/risk/dice/red_5.png'),
    6: storageUrl('public/risk/dice/red_6.png'),
  },
  gold: {
    1: storageUrl('public/risk/dice/gold_1.png'),
    2: storageUrl('public/risk/dice/gold_2.png'),
    3: storageUrl('public/risk/dice/gold_3.png'),
    4: storageUrl('public/risk/dice/gold_4.png'),
    5: storageUrl('public/risk/dice/gold_5.png'),
  },
} as const;

// ─── Fireworks animation frames (f00–f20) ─────────────────────────────────────
export const FIREWORKS_FRAMES: string[] = Array.from({ length: 21 }, (_, i) =>
  storageUrl(`public/risk/fireworks/f${String(i).padStart(2, '0')}.png`),
);

// ─── Per-territory battle-view backgrounds ────────────────────────────────────
export function battleViewUrl(territoryId: string): string {
  return storageUrl(`public/battle-views/${territoryId}.webp`);
}

// ─── Sound effects ────────────────────────────────────────────────────────────
export const SFX_URLS = {
  dice:    storageUrl('public/risk/sfx/dice_roll.mp3'),
  cannon:  storageUrl('public/risk/sfx/cannon_a.mp3'),
  conquest:storageUrl('public/risk/sfx/fanfare.mp3'),
  card:    storageUrl('public/risk/sfx/whoosh.mp3'),
  tap:     storageUrl('public/risk/sfx/click.mp3'),
  victory: storageUrl('public/risk/sfx/trumpet.mp3'),
  deploy:  storageUrl('public/risk/sfx/thud.mp3'),
  clash:   storageUrl('public/risk/sfx/clash_a.mp3'),
  roar:    storageUrl('public/risk/sfx/roar.mp3'),
  defeat:  storageUrl('public/risk/sfx/defeat.mp3'),
  volley:  storageUrl('public/risk/sfx/volley_short.mp3'),
  chime:   storageUrl('public/risk/sfx/chime.mp3'),
} as const;

export type SfxName = keyof typeof SFX_URLS;
