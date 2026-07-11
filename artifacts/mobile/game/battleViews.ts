import type { TerritoryId } from "./types";
import { BATTLE_VIEW_SOURCES } from "./battleViewSources";

/**
 * Original RISK II battle-view backdrops, recovered from the game's GFX
 * archive — one aerial 800×600 painting per territory (48 in all), bundled
 * with the app so battles render without any network dependency.
 *
 * Extended-map territories without a recovered painting return undefined;
 * the battle scene falls back to a themed night-field backdrop.
 */
export function battleViewSource(id: TerritoryId): number | undefined {
  return BATTLE_VIEW_SOURCES[id];
}
