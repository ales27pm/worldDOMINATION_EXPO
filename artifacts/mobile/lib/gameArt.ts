/**
 * Game-critical artwork bundled into the app binary.
 *
 * These images used to stream from object storage at runtime. On the
 * published app, a battle or a fresh board fires dozens of image requests
 * at once; any that fail (rate limits, cold starts, dead network) leave
 * permanent holes because RN Image never retries — black battle screens,
 * unpainted boards, invisible dice. Bundling the core set makes the game
 * render correctly offline and on first launch.
 *
 * Decorative menu art (hero painting, parchment textures, wreaths) stays
 * remote — those load one at a time and degrade gracefully.
 */

/** The painted 1536×1024 RISK II world board. */
export const WORLD_BOARD = require('../assets/game/world-map.webp');

/** Original 22×22 die-face sprites, indexed [face - 1]. */
export const DICE: Record<'red' | 'gold', number[]> = {
  red: [
    require('../assets/game/dice/red_1.png'),
    require('../assets/game/dice/red_2.png'),
    require('../assets/game/dice/red_3.png'),
    require('../assets/game/dice/red_4.png'),
    require('../assets/game/dice/red_5.png'),
    require('../assets/game/dice/red_6.png'),
  ],
  gold: [
    require('../assets/game/dice/gold_1.png'),
    require('../assets/game/dice/gold_2.png'),
    require('../assets/game/dice/gold_3.png'),
    require('../assets/game/dice/gold_4.png'),
    require('../assets/game/dice/gold_5.png'),
    require('../assets/game/dice/gold_6.png'),
  ],
};

/** White-plastic playing-piece miniatures, tinted per player at render time. */
export const PIECES = {
  infantry: require('../assets/game/pieces/piece-infantry.png'),
  cavalry: require('../assets/game/pieces/piece-cavalry.png'),
  artillery: require('../assets/game/pieces/piece-artillery.png'),
} as const;

/** The original RISK II victory fireworks — 21 blue-keyed frames. */
export const FIREWORK_FRAMES: number[] = [
  require('../assets/game/fireworks/f00.png'),
  require('../assets/game/fireworks/f01.png'),
  require('../assets/game/fireworks/f02.png'),
  require('../assets/game/fireworks/f03.png'),
  require('../assets/game/fireworks/f04.png'),
  require('../assets/game/fireworks/f05.png'),
  require('../assets/game/fireworks/f06.png'),
  require('../assets/game/fireworks/f07.png'),
  require('../assets/game/fireworks/f08.png'),
  require('../assets/game/fireworks/f09.png'),
  require('../assets/game/fireworks/f10.png'),
  require('../assets/game/fireworks/f11.png'),
  require('../assets/game/fireworks/f12.png'),
  require('../assets/game/fireworks/f13.png'),
  require('../assets/game/fireworks/f14.png'),
  require('../assets/game/fireworks/f15.png'),
  require('../assets/game/fireworks/f16.png'),
  require('../assets/game/fireworks/f17.png'),
  require('../assets/game/fireworks/f18.png'),
  require('../assets/game/fireworks/f19.png'),
  require('../assets/game/fireworks/f20.png'),
];
