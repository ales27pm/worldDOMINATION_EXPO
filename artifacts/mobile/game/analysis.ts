import { continentTerritories, TERRITORY_MAP } from "./mapData";
import type { Alliance, ContinentId, GameState, TerritoryId } from "./types";

function activeNeighbors(state: GameState, id: TerritoryId): TerritoryId[] {
  const active = new Set(state.activeIds);
  return (TERRITORY_MAP[id]?.neighbors ?? []).filter((n) => active.has(n));
}

export function borderThreat(state: GameState, id: TerritoryId, playerId: number): number {
  return activeNeighbors(state, id)
    .filter((n) => state.territories[n].owner !== playerId)
    .reduce((sum, n) => sum + state.territories[n].armies, 0);
}

export function totalTroops(state: GameState, playerId: number): number {
  return state.activeIds.reduce(
    (sum, id) => (state.territories[id].owner === playerId ? sum + state.territories[id].armies : sum),
    0,
  );
}

export function largestEmpire(state: GameState, playerId: number): Set<TerritoryId> {
  const owned = new Set(state.activeIds.filter((id) => state.territories[id].owner === playerId));
  const visited = new Set<TerritoryId>();
  let best: TerritoryId[] = [];
  for (const start of owned) {
    if (visited.has(start)) continue;
    const group: TerritoryId[] = [];
    const queue: TerritoryId[] = [start];
    visited.add(start);
    while (queue.length > 0) {
      const current = queue.pop();
      if (!current) break;
      group.push(current);
      for (const neighbor of activeNeighbors(state, current)) {
        if (owned.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    if (group.length > best.length) best = group;
  }
  return new Set(best);
}

export function wholeContinents(state: GameState, playerId: number): ContinentId[] {
  const groups = continentTerritories(state.setup.useExtraTerritories);
  return (Object.keys(groups) as ContinentId[]).filter(
    (c) => groups[c].length > 0 && groups[c].every((id) => state.territories[id].owner === playerId),
  );
}

export function protectedByLevelOne(state: GameState, defenderId: number, territory: TerritoryId): boolean {
  const continent = TERRITORY_MAP[territory]?.continent;
  if (continent && wholeContinents(state, defenderId).includes(continent)) return true;
  return largestEmpire(state, defenderId).has(territory);
}

export function allianceBetween(state: GameState, x: number, y: number): Alliance | null {
  return state.alliances.find((a) => (a.a === x && a.b === y) || (a.a === y && a.b === x)) ?? null;
}

export function grudgeLabel(grudge: number): { label: string; hostile: boolean } {
  if (grudge >= 1) return { label: "Vengeful", hostile: true };
  if (grudge >= 0.4) return { label: "Wary", hostile: true };
  return { label: "Cordial", hostile: false };
}
