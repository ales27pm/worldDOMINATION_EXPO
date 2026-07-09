import { allianceBetween, borderThreat as analysisBorderThreat, protectedByLevelOne } from "./analysis";
import { findBestSet } from "./cards";
import { electionBudget } from "./engine";
import { GENERALS } from "./generals";
import { CONTINENTS, continentTerritories, TERRITORY_MAP } from "./mapData";
import type { AllianceLevel, ContinentId, GameAction, GameState, GeneralDef, TerritoryId } from "./types";

interface AttackOption {
  from: TerritoryId;
  to: TerritoryId;
  score: number;
  ratio: number;
}

function generalOf(state: GameState, playerId: number): GeneralDef {
  const generalId = state.players[playerId]?.generalId;
  return (generalId && GENERALS[generalId]) || GENERALS.spencer;
}

function activeNeighbors(state: GameState, id: TerritoryId): TerritoryId[] {
  const active = new Set(state.activeIds);
  return (TERRITORY_MAP[id]?.neighbors ?? []).filter((n) => active.has(n));
}

function borderThreat(state: GameState, id: TerritoryId, playerId: number): number {
  return analysisBorderThreat(state, id, playerId);
}

function continentValue(state: GameState, id: TerritoryId, playerId: number): number {
  const continent: ContinentId = TERRITORY_MAP[id].continent;
  const groups = continentTerritories(state.setup.useExtraTerritories);
  const members = groups[continent];
  const ownedInContinent = members.filter((m) => state.territories[m].owner === playerId).length;
  const share = members.length > 0 ? ownedInContinent / members.length : 0;
  return share * CONTINENTS[continent].bonus;
}

function bestAttack(state: GameState, playerId: number, general: GeneralDef): AttackOption | null {
  const minRatio = Math.max(0.85, 1.7 - general.aggression * 0.5 - general.riskTolerance * 0.4);
  const options: AttackOption[] = [];
  for (const from of state.activeIds) {
    const fromState = state.territories[from];
    if (fromState.owner !== playerId || fromState.armies < 3) continue;
    for (const to of activeNeighbors(state, from)) {
      const toState = state.territories[to];
      if (toState.owner === playerId) continue;
      const alliance = allianceBetween(state, playerId, toState.owner);
      if (alliance) {
        const betray = Math.random() < (1 - general.honorLevel) * 0.06;
        if (!betray) {
          if (alliance.level >= 2) continue;
          if (protectedByLevelOne(state, toState.owner, to)) continue;
        }
      }
      const ratio = (fromState.armies - 1) / Math.max(1, toState.armies);
      if (ratio < minRatio) continue;
      let score = ratio + continentValue(state, to, playerId);
      const grudge = state.players[playerId]?.grudges[toState.owner] ?? 0;
      score += grudge * (0.4 + general.aggression * 0.8);
      const target = state.players[playerId]?.mission;
      if (target?.kind === "destroyPlayer" && toState.owner === target.targetPlayerId) score += 2;
      if (state.setup.objective === "capital") {
        const isCapital = state.players.some((p) => p.capital === to && p.id !== playerId);
        if (isCapital) score += 3;
      }
      score += general.unpredictability * Math.random() * 2;
      options.push({ from, to, score, ratio });
    }
  }
  if (options.length === 0) return null;
  options.sort((a, b) => b.score - a.score);
  return options[0] ?? null;
}

export function aiNextAction(state: GameState): GameAction | null {
  const player = state.players[state.currentPlayer];
  if (!player || player.isHuman || state.phase === "gameOver") return null;
  if (state.pendingProposal) return null;
  const general = generalOf(state, player.id);

  if (state.phase === "territoryGrab") {
    const open = state.activeIds.filter((id) => state.territories[id].owner === -1);
    const scored = open.map((id) => ({
      id,
      score: continentValue(state, id, player.id) * 2 +
        activeNeighbors(state, id).filter((n) => state.territories[n].owner === player.id).length * 0.8 +
        general.unpredictability * Math.random() * 3,
    })).sort((a, b) => b.score - a.score);
    const pick = scored[0];
    return pick ? { type: "CLAIM_TERRITORY", territory: pick.id } : null;
  }

  if (state.phase === "election" && state.election) {
    const election = state.election;
    if (election.highBidder === player.id || election.passed.includes(player.id)) return null;
    const id = election.territory;
    const points = election.points[player.id] ?? 0;
    const remainingAuctions = election.queue.length + 1;
    let value = 70 +
      continentValue(state, id, player.id) * 25 +
      activeNeighbors(state, id).filter((n) => state.territories[n].owner === player.id).length * 15 +
      general.aggression * 10 + general.unpredictability * Math.random() * 35;
    if (points < remainingAuctions * 40) value *= 0.65;
    const cap = Math.min(electionBudget(state, player.id), value);
    if (election.bid + 5 <= cap) {
      const raise: 5 | 10 = election.bid + 10 <= cap ? 10 : 5;
      return { type: "ELECTION_BID", raise };
    }
    return { type: "ELECTION_PASS" };
  }

  if (state.phase === "initialDeploy") {
    const owned = state.activeIds.filter((id) => state.territories[id].owner === player.id);
    const borders = owned.filter((id) => borderThreat(state, id, player.id) > 0);
    const pool = borders.length > 0 ? borders : owned;
    const scored = pool.map((id) => ({
      id,
      score: borderThreat(state, id, player.id) * (0.5 + general.aggression * 0.5) +
        continentValue(state, id, player.id) * 2 +
        general.unpredictability * Math.random() * 6,
    })).sort((a, b) => b.score - a.score);
    const pick = scored[0];
    return pick ? { type: "PLACE_INITIAL", territory: pick.id } : null;
  }

  if (state.pendingOccupy) {
    const keepBack = general.riskTolerance < 0.4 && state.pendingOccupy.max > state.pendingOccupy.min + 2 ? 1 : 0;
    return { type: "OCCUPY", count: Math.max(state.pendingOccupy.min, state.pendingOccupy.max - keepBack) };
  }

  if (state.phase === "reinforcement") {
    const humans = state.players.filter((p) => p.isHuman && p.alive);
    if (humans.length === 1) {
      const human = humans[0];
      if (human && !state.proposalsMade.includes(human.id) && !allianceBetween(state, player.id, human.id) &&
        (player.grudges[human.id] ?? 0) < 0.6 && Math.random() < general.honorLevel * 0.12) {
        const sharesBorder = state.activeIds.some((id) =>
          state.territories[id].owner === player.id &&
          activeNeighbors(state, id).some((n) => state.territories[n].owner === human.id),
        );
        if (sharesBorder) {
          const level: AllianceLevel = general.honorLevel > 0.8 ? (Math.random() < 0.5 ? 3 : 2) : general.honorLevel > 0.5 ? 2 : 1;
          return { type: "PROPOSE_ALLIANCE", target: human.id, level };
        }
      }
    }
    const cardRule = state.setup.cardRule ?? "ascending";
    if (state.mustTrade || (player.cards.length >= 3 && findBestSet(player.cards, cardRule) !== null)) {
      const set = findBestSet(player.cards, cardRule);
      if (set) return { type: "AUTO_TRADE" };
    }
    if (state.reinforcementsRemaining > 0) {
      const owned = state.activeIds.filter((id) => state.territories[id].owner === player.id);
      const borders = owned.filter((id) => borderThreat(state, id, player.id) > 0);
      const pool = borders.length > 0 ? borders : owned;
      const scored = pool.map((id) => ({
        id,
        score: borderThreat(state, id, player.id) * (0.5 + general.aggression * 0.5) +
          continentValue(state, id, player.id) * 2 +
          general.unpredictability * Math.random() * 6,
      })).sort((a, b) => b.score - a.score);
      const pick = scored[0];
      if (pick) {
        const chunk = Math.max(1, Math.ceil(state.reinforcementsRemaining / 2));
        return { type: "DEPLOY", territory: pick.id, count: chunk };
      }
    }
    return null;
  }

  if (state.phase === "attack") {
    if (Math.random() < (1 - general.aggression) * 0.25) return { type: "END_ATTACK" };
    const attack = bestAttack(state, player.id, general);
    if (attack) {
      const allOut = attack.ratio >= 1.8 || general.riskTolerance > 0.75;
      return { type: "ATTACK", from: attack.from, to: attack.to, allOut };
    }
    return { type: "END_ATTACK" };
  }

  if (state.phase === "fortify") {
    const owned = state.activeIds.filter((id) => state.territories[id].owner === player.id);
    let best: { from: TerritoryId; to: TerritoryId; count: number; score: number } | null = null;
    for (const from of owned) {
      const fromState = state.territories[from];
      if (fromState.armies < 2) continue;
      const fromThreat = borderThreat(state, from, player.id);
      for (const to of activeNeighbors(state, from)) {
        if (state.territories[to].owner !== player.id) continue;
        const toThreat = borderThreat(state, to, player.id);
        if (toThreat <= fromThreat) continue;
        const score = toThreat - fromThreat + fromState.armies;
        if (!best || score > best.score) {
          const count = fromThreat === 0 ? fromState.armies - 1 : Math.floor((fromState.armies - 1) / 2);
          if (count >= 1) best = { from, to, count, score };
        }
      }
    }
    if (best) return { type: "FORTIFY", from: best.from, to: best.to, count: best.count };
    return { type: "END_TURN" };
  }

  return null;
}
