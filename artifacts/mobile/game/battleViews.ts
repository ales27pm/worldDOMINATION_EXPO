import type { TerritoryId } from "./types";
import { assetUrl } from "../lib/assetUrl";

/**
 * Original RISK II battle-view backdrops — one aerial painting per territory
 * (48 in all), served from object storage.
 */
export function battleViewUrl(id: TerritoryId): string {
  return assetUrl(`public/battle-views/${id}.webp`);
}
