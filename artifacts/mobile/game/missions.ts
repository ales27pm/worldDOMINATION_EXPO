import { shuffle } from "./cards";
import { CONTINENTS, continentTerritories } from "./mapData";
import type { ContinentId, GameState, Mission, PlayerState, TerritoryId, TurnStyle } from "./types";

/**
 * The Classic RISK II mission deck (manual, Chapter 6):
 * 8x destroy a named player's color, 4 fixed continent pairs,
 * "occupy 24 territories" and "conquer 18 territories with 2 armies each".
 */
type MissionTemplate =
  | { kind: "destroy" }
  | { kind: "pair"; continents: [ContinentId, ContinentId] }
  | { kind: "occupy24" }
  | { kind: "fortified18" }
  | { kind: "continentPresence"; continent: ContinentId }
  | { kind: "continentConnected"; continent: ContinentId; count: number }
  | { kind: "continentNamed"; continent: ContinentId; territories: [TerritoryId, TerritoryId, TerritoryId] };

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

/**
 * The Same Time RISK mission deck (manual, Chapter 6, "The Same Time
 * Missions") — a distinct, harder deck from Classic's. The manual's Mission 2
 * ("destroy whoever currently holds {territory}", with the target re-cast
 * live as the tracked territory changes hands) isn't modeled here; two more
 * "destroy" instances stand in for it to keep the deck's size/balance intact.
 */
function buildSameTimeDeck(): MissionTemplate[] {
  const deck: MissionTemplate[] = [];
  for (let i = 0; i < 4; i += 1) deck.push({ kind: "destroy" });
  deck.push({ kind: "continentPresence", continent: "asia" });
  const pairs: [ContinentId, ContinentId][] = [
    ["asia", "southAmerica"],
    ["africa", "northAmerica"],
    ["europe", "australia"],
    ["europe", "southAmerica"],
  ];
  deck.push({ kind: "pair", continents: pairs[Math.floor(Math.random() * pairs.length)] });
  deck.push({ kind: "pair", continents: pairs[Math.floor(Math.random() * pairs.length)] });
  const connectedContinents: ContinentId[] = ["asia", "northAmerica", "europe"];
  for (let i = 0; i < 3; i += 1) {
    deck.push({ kind: "continentConnected", continent: connectedContinents[i % connectedContinents.length], count: 8 });
  }
  const namedTable: { continent: ContinentId; territories: [TerritoryId, TerritoryId, TerritoryId] }[] = [
    { continent: "asia", territories: ["northwestTerritory", "northAfrica", "northernEurope"] },
    { continent: "northAmerica", territories: ["southAfrica", "brazil", "siam"] },
    { continent: "europe", territories: ["afghanistan", "indonesia", "alaska"] },
    { continent: "southAmerica", territories: ["greenland", "ukraine", "kamchatka"] },
    { continent: "africa", territories: ["scandinavia", "alberta", "argentina"] },
    { continent: "australia", territories: ["yakutsk", "southernEurope", "eastAfrica"] },
  ];
  const namedPicks = shuffle(namedTable).slice(0, 3);
  for (const pick of namedPicks) deck.push({ kind: "continentNamed", ...pick });
  return shuffle(deck);
}

/** Deal one secret mission per player from the authentic RISK II deck for the active turn style. */
export function generateMissions(players: PlayerState[], turnStyle: TurnStyle = "classic"): Mission[] {
  const deck = turnStyle === "sameTime" ? buildSameTimeDeck() : buildClassicDeck();
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
      case "continentPresence":
        return { kind: "continentPlusPresence", continent: template.continent };
      case "continentConnected":
        return { kind: "continentPlusConnected", continent: template.continent, count: template.count };
      case "continentNamed":
        return { kind: "continentPlusNamed", continent: template.continent, territories: template.territories };
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
    case "continentPlusPresence":
      return `Conquer and hold ${CONTINENTS[mission.continent].name}, with a presence in every other continent.`;
    case "continentPlusConnected":
      return `Conquer and hold ${CONTINENTS[mission.continent].name}, plus ${mission.count} other territories of your choice.`;
    case "continentPlusNamed":
      return `Conquer and hold ${CONTINENTS[mission.continent].name}, plus the named territories elsewhere.`;
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
    case "continentPlusPresence": {
      const groups = continentTerritories(state.setup.useExtraTerritories);
      const holdsContinent = groups[mission.continent].every((id) => state.territories[id].owner === playerId);
      if (!holdsContinent) return false;
      const others = (Object.keys(groups) as ContinentId[]).filter((c) => c !== mission.continent);
      return others.every((c) => groups[c].some((id) => state.territories[id].owner === playerId));
    }
    case "continentPlusConnected": {
      const groups = continentTerritories(state.setup.useExtraTerritories);
      const holdsContinent = groups[mission.continent].every((id) => state.territories[id].owner === playerId);
      if (!holdsContinent) return false;
      const outside = new Set(groups[mission.continent]);
      const ownedOutside = state.activeIds.filter(
        (id) => !outside.has(id) && state.territories[id].owner === playerId,
      ).length;
      return ownedOutside >= mission.count;
    }
    case "continentPlusNamed": {
      const groups = continentTerritories(state.setup.useExtraTerritories);
      const holdsContinent = groups[mission.continent].every((id) => state.territories[id].owner === playerId);
      if (!holdsContinent) return false;
      return mission.territories.every((id) => state.territories[id]?.owner === playerId);
    }
  }
}
