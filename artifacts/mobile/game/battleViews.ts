import { Image } from "expo-image";

import type { TerritoryId } from "./types";
import { assetUrl } from "../lib/assetUrl";

/**
 * Original RISK II battle-view backdrops, recovered from the game's GFX
 * archive — one aerial 800x600 painting per territory (48 in all), keyed by
 * territory id and served from object storage at public/battle-views.
 */
export function battleViewUrl(id: TerritoryId): string {
  return assetUrl(`public/battle-views/${id}.webp`);
}

/** Warm the image cache so the fly-to scene appears without a loading blink. */
export function preloadBattleViews(ids: Iterable<TerritoryId>): void {
  for (const id of ids) {
    Image.prefetch(battleViewUrl(id));
  }
}
