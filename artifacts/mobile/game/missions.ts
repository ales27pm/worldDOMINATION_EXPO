import { shuffle } from "./cards";
import { CONTINENTS, continentTerritories } from "./mapData";
import type { ContinentId, GameState, Mission, PlayerState } from "./types";

/**
 * The Classic RISK II mission deck (manual, Chapter 6):
 * 8x destroy a named player's color, 4 fixed continent pairs,
 * "occupy 24 territories" and "conquer 18 territories with 2 armies each".
 */
type MissionTemplate =
  | { kind: "destroy" }
  | { kind: "pair"; continents: [ContinentId, ContinentId] }
  | { kind: "occupy24" }
  | { kind: "fortified18" };

const OCCUPY_FALLBACK_COUNT = 24;

function buildClassicDeck(): MissionTemplate[] {
  const deck: MissionTemplate[] = [];
  for (let i = 0; i < 8; i += 1) deck.push({ kind: "destroy" });
  deck.push({ kind: "pair", continents: ["asia", "africa"] });
  deck.push({ kind: "pair", continents: ["northAmerica", "australia"] });
  deck.push({ kind: "pair", continents: ["asia", "southAmerica"] });
  deck.push({ kind: "pair", continents: ["northAmerica", "africa"] });
  deck.push({ kind: "occupy24" });
  deck.push({ kind: "fortified18" });
  return shuffle(deck);
}

/** Deal one secret mission per player from the authentic Classic RISK II deck. */
export function generateMissions(players: PlayerState[]): Mission[] {
  const deck = buildClassicDeck();
  const usedTargets = new Set<number>();
  return players.map((player) => {
    const template = deck.pop() ?? { kind: "occupy24" };
    switch (template.kind) {
      case "pair":
        return { kind: "conquerContinents", continents: template.continents };
      case "occupy24":
        return { kind: "occupyTerritoryCount", count: OCCUPY_FALLBACK_COUNT };
      case "fortified18":
        return { kind: "occupyFortified", count: 18, minArmies: 2 };
      case "destroy": {
        const others = players.filter((p) => p.id !== player.id);
        const fresh = others.filter((p) => !usedTargets.has(p.id));
        const pool = fresh.length > 0 ? fresh : others;
        const target = pool[Math.floor(Math.random() * pool.length)];
        if (!target) return { kind: "occupyTerritoryCount", count: OCCUPY_FALLBACK_COUNT };
        usedTargets.add(target.id);
        return { kind: "destroyPlayer", targetPlayerId: target.id, fallbackCount: OCCUPY_FALLBACK_COUNT };
      }
    }
  });
}

export function missionText(mission: Mission, players: PlayerState[]): string {
  switch (mission.kind) {
    case "conquerContinents": {
      const [a, b] = mission.continents;
      return `Conquer the continents of ${CONTINENTS[a].name} and ${CONTINENTS[b].name}.`;
    }
    case "occupyTerritoryCount":
      return `Occupy ${mission.count} territories of your choice.`;
    case "occupyFortified":
      return `Conquer ${mission.count} territories of your choice and occupy each with at least ${mission.minArmies} armies.`;
    case "destroyPlayer": {
      const target = players.find((p) => p.id === mission.targetPlayerId);
      return `Destroy all ${target?.colorName ?? ""} troops belonging to ${target?.name ?? "your rival"}. If they fall to another, occupy ${mission.fallbackCount} territories.`;
    }
  }
}

export function missionAchieved(mission: Mission, state: GameState, playerId: number): boolean {
  const ownedCount = state.activeIds.filter((id) => state.territories[id].owner === playerId).length;
  switch (mission.kind) {
    case "conquerContinents": {
      const groups = continentTerritories(state.setup.useExtraTerritories);
      return mission.continents.every((continent) =>
        groups[continent].every((id) => state.territories[id].owner === playerId),
      );
    }
    case "occupyTerritoryCount":
      return ownedCount >= mission.count;
    case "occupyFortified": {
      const fortified = state.activeIds.filter((id) => {
        const territory = state.territories[id];
        return territory.owner === playerId && territory.armies >= mission.minArmies;
      }).length;
      return fortified >= mission.count;
    }
    case "destroyPlayer": {
      const target = state.players[mission.targetPlayerId];
      if (!target) return false;
      if (target.alive) return false;
      if (target.killedBy === playerId) return true;
      return ownedCount >= mission.fallbackCount;
    }
  }
}
