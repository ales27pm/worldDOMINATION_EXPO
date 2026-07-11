import { allianceBetween, protectedByLevelOne, totalTroops } from "./analysis";
import { buildDeck, findBestSet, isValidSet, shuffle, tradeValue } from "./cards";
import { resolveBattleRound, tierForAttacker, tierForDefender } from "./dice";
import { GENERALS } from "./generals";
import { activeTerritories, continentTerritories, CONTINENTS, TERRITORY_MAP } from "./mapData";
import { generateMissions } from "./missions";
import { missionAchieved } from "./missions";
import { friendlyReachableSet, restrictedReinforcementCap, resolveSameTimeRound, sameTimeReinforcementsFor } from "./sameTime";
import type {
  AllianceLevel,
  AttackOrder,
  BattleReport,
  ContinentId,
  ElectionState,
  GameAction,
  GameSetup,
  GameState,
  LogTone,
  PlayerState,
  TacticalOrder,
  TerritoryId,
  TerritoryState,
} from "./types";
import { ALLIANCE_LEVEL_INFO, OBJECTIVE_INFO, PLAYER_COLORS } from "./types";

const INITIAL_ARMIES: Record<number, number> = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20, 7: 17, 8: 15 };

/** Armies placed per click during the Territory Grab initial muster. */
const INITIAL_PLACE_CHUNK = 4;

/** Election Points per active territory (manual, Chapter 7). */
const POINTS_PER_TERRITORY = 100;

/** One-time influence each neighbouring holding lends to an election. */
const INFLUENCE_VALUE = 10;

/** Unused Election Points per extra battalion at the end of the elections. */
const POINTS_PER_BATTALION = 50;

/** Exact RISK II victory thresholds (manual, Chapter 6) keyed by active territory count. */
const DOMINATION_TARGETS: Record<"domination60" | "domination80", Record<number, number>> = {
  domination60: { 42: 25, 48: 29 },
  domination80: { 42: 33, 48: 38 },
};

/** Capital RISK: opposing capitals to capture — 3-4 players: 2, 5-6: 3, 7-8: 4 (manual, Chapter 6). */
function requiredCapitalCaptures(playerCount: number): number {
  if (playerCount <= 4) return 2;
  if (playerCount <= 6) return 3;
  return 4;
}

function humansCount(players: PlayerState[]): number {
  return players.filter((p) => p.isHuman && p.alive).length;
}

function ownedIds(state: GameState, playerId: number): TerritoryId[] {
  return state.activeIds.filter((id) => state.territories[id].owner === playerId);
}

function addLog(state: GameState, text: string, tone: LogTone): void {
  state.logCounter += 1;
  state.log = [{ id: state.logCounter, turn: state.turn, text, tone }, ...state.log].slice(0, 80);
}

/** Deepen an AI general's grudge against a rival, weighted by their memory. */
function bumpGrudge(state: GameState, holderId: number, againstId: number, amount: number): void {
  const holder = state.players[holderId];
  if (!holder || holder.isHuman) return;
  const general = holder.generalId ? GENERALS[holder.generalId] : null;
  const memory = general ? 0.4 + general.honorLevel * 0.3 + (1 - general.unpredictability) * 0.3 : 0.7;
  const current = holder.grudges[againstId] ?? 0;
  holder.grudges = { ...holder.grudges, [againstId]: Math.min(3, current + amount * memory) };
}

/** Append a per-round census for the post-game statistics graph. */
function recordSnapshot(state: GameState): void {
  const counts = state.players.map((p) => {
    const owned = ownedIds(state, p.id);
    return {
      territories: owned.length,
      troops: owned.reduce((sum, id) => sum + state.territories[id].armies, 0),
    };
  });
  state.history = [...state.history, { turn: state.turn, counts }].slice(-300);
}

/** Reinforcements: max(3, owned / 3) plus continent bonuses. */
export function reinforcementsFor(state: GameState, playerId: number): number {
  const owned = ownedIds(state, playerId);
  let total = Math.max(3, Math.floor(owned.length / 3));
  const groups = continentTerritories(state.setup.useExtraTerritories);
  for (const continentId of Object.keys(groups) as ContinentId[]) {
    const members = groups[continentId];
    if (members.length > 0 && members.every((id) => state.territories[id].owner === playerId)) {
      total += CONTINENTS[continentId].bonus;
    }
  }
  return total;
}

export function continentBonusesFor(state: GameState, playerId: number): ContinentId[] {
  const groups = continentTerritories(state.setup.useExtraTerritories);
  return (Object.keys(groups) as ContinentId[]).filter(
    (c) => groups[c].length > 0 && groups[c].every((id) => state.territories[id].owner === playerId),
  );
}

function startTurn(state: GameState): void {
  const player = state.players[state.currentPlayer];
  if (!player) return;
  state.phase = "reinforcement";
  state.reinforcementsRemaining = reinforcementsFor(state, player.id);
  state.mustTrade = player.cards.length >= 5;
  state.pendingOccupy = null;
  state.proposalsMade = [];
  state.fortifyUsed = false;
  state.deployLog = [];
  player.conqueredThisTurn = false;
  state.awaitingHandoff = player.isHuman && humansCount(state.players) > 1;
  addLog(state, `${player.name} musters ${state.reinforcementsRemaining} reinforcements.`, "info");
}

function drawCard(state: GameState, player: PlayerState): void {
  if (state.deck.length === 0) {
    state.deck = buildDeck(state.activeIds);
  }
  const card = state.deck.pop();
  if (card) {
    player.cards = [...player.cards, card];
  }
}

/** Whether a player's own objective (not elimination) is satisfied right now, and why. */
function objectiveReason(state: GameState, playerId: number): string | null {
  const player = state.players[playerId];
  if (!player) return null;
  const total = state.activeIds.length;
  const owned = ownedIds(state, playerId).length;
  const objective = state.setup.objective;
  if (objective === "domination60" || objective === "domination80") {
    const target = DOMINATION_TARGETS[objective][total] ?? Math.round(total * (objective === "domination60" ? 0.6 : 0.8));
    if (owned >= target) {
      return `${objective === "domination60" ? "60%" : "80%"} Domination — ${owned} of ${total} territories held`;
    }
  }
  if (objective === "domination100" && owned === total) {
    return "World Domination";
  }
  if (objective === "capital") {
    const own = player.capital;
    const opposing = state.players.filter((p) => p.id !== playerId && p.capital !== null);
    const required = Math.min(opposing.length, requiredCapitalCaptures(state.players.length));
    const captured = opposing.filter(
      (p) => p.capital !== null && state.territories[p.capital].owner === playerId,
    ).length;
    if (own !== null && required > 0 && state.territories[own].owner === playerId && captured >= required) {
      return `Capital RISK — ${captured} enemy capitals seized while holding their own`;
    }
  }
  if (objective === "mission" && player.mission && missionAchieved(player.mission, state, playerId)) {
    return "their secret mission";
  }
  return null;
}

function checkVictory(state: GameState, playerId: number): void {
  if (state.phase === "gameOver") return;
  const player = state.players[playerId];
  if (!player) return;
  const aliveOthers = state.players.filter((p) => p.alive && p.id !== playerId);

  const declare = (reason: string): void => {
    state.phase = "gameOver";
    state.winner = playerId;
    state.winReason = reason;
    state.awaitingHandoff = false;
    addLog(state, `${player.name} achieves ${reason}. The campaign is won.`, "gold");
  };

  if (aliveOthers.length === 0) {
    declare("total conquest — every rival destroyed");
    return;
  }
  const reason = objectiveReason(state, playerId);
  if (reason) declare(reason);
}

/**
 * Same Time victory check: every alive commander's objective is evaluated
 * together after a round resolves, since several could cross the line in
 * the same round. A single achiever wins outright; several achievers share
 * a draw-win (manual, Chapter 9).
 */
function resolveSameTimeVictory(state: GameState): void {
  if (state.phase === "gameOver") return;
  const alive = state.players.filter((p) => p.alive);
  if (alive.length <= 1 && state.players.length > 1) {
    const winner = alive[0];
    if (!winner) return;
    state.phase = "gameOver";
    state.winner = winner.id;
    state.coWinners = null;
    state.winReason = "total conquest — every rival destroyed";
    state.awaitingHandoff = false;
    addLog(state, `${winner.name} achieves total conquest — every rival destroyed. The campaign is won.`, "gold");
    return;
  }
  const achievers = alive
    .map((p) => ({ player: p, reason: objectiveReason(state, p.id) }))
    .filter((x): x is { player: PlayerState; reason: string } => x.reason !== null);
  if (achievers.length === 0) return;
  state.phase = "gameOver";
  state.awaitingHandoff = false;
  if (achievers.length === 1) {
    const { player, reason } = achievers[0];
    state.winner = player.id;
    state.coWinners = null;
    state.winReason = reason;
    addLog(state, `${player.name} achieves ${reason}. The campaign is won.`, "gold");
    return;
  }
  state.winner = null;
  state.coWinners = achievers.map((a) => a.player.id);
  state.winReason = `a simultaneous ${achievers[0]?.reason ?? "victory"}`;
  addLog(
    state,
    `${achievers.map((a) => a.player.name).join(" and ")} cross the finish line together — a shared victory!`,
    "gold",
  );
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    territories: { ...state.territories },
    deck: [...state.deck],
    log: [...state.log],
    alliances: [...state.alliances],
    proposalsMade: [...state.proposalsMade],
    initialRemaining: [...state.initialRemaining],
    history: [...state.history],
    deployLog: [...state.deployLog],
    election: state.election
      ? {
          ...state.election,
          queue: [...state.election.queue],
          passed: [...state.election.passed],
          points: [...state.election.points],
          influenceUsed: [...state.election.influenceUsed],
        }
      : null,
    sameTime: state.sameTime
      ? {
          ...state.sameTime,
          reinforcementsRemaining: [...state.sameTime.reinforcementsRemaining],
          deployLog: state.sameTime.deployLog.map((entries) => [...entries]),
          readyReinforce: [...state.sameTime.readyReinforce],
          orders: [...state.sameTime.orders],
          readyBattle: [...state.sameTime.readyBattle],
          playback: [...state.sameTime.playback],
          moves: [...state.sameTime.moves],
          readyMove: [...state.sameTime.readyMove],
        }
      : null,
    coWinners: state.coWinners ? [...state.coWinners] : null,
  };
}

/** Fill defaults for campaigns saved before diplomacy/allocation/history existed. */
export function normalizeState(raw: GameState): GameState {
  return {
    ...raw,
    alliances: raw.alliances ?? [],
    pendingProposal: raw.pendingProposal ?? null,
    proposalsMade: raw.proposalsMade ?? [],
    initialRemaining: raw.initialRemaining ?? raw.players.map(() => 0),
    history: raw.history ?? [],
    election: raw.election ?? null,
    fortifyUsed: raw.fortifyUsed ?? false,
    deployLog: raw.deployLog ?? [],
    sameTime: raw.sameTime ?? null,
    coWinners: raw.coWinners ?? null,
    players: raw.players.map((p) => ({ ...p, grudges: p.grudges ?? {} })),
  };
}

function setTerritory(state: GameState, id: TerritoryId, value: TerritoryState): void {
  state.territories = { ...state.territories, [id]: value };
}

/** Create a fresh campaign from setup. */
export function createGame(setup: GameSetup): GameState {
  const defs = activeTerritories(setup.useExtraTerritories);
  const activeIds = defs.map((d) => d.id);
  const players: PlayerState[] = setup.players.map((p, i) => {
    const color = PLAYER_COLORS[p.colorIdx] ?? PLAYER_COLORS[0];
    return {
      id: i,
      name: p.name.trim() === "" ? `Commander ${i + 1}` : p.name.trim(),
      color: color?.hex ?? "#e63333",
      colorName: color?.name ?? "Red",
      isHuman: p.isHuman,
      generalId: p.isHuman ? null : p.generalId,
      alive: true,
      killedBy: null,
      cards: [],
      capital: null,
      mission: null,
      conqueredThisTurn: false,
      grudges: {},
    };
  });

  const allocation = setup.allocation ?? "random";
  const initial = INITIAL_ARMIES[players.length] ?? 25;
  const territories = {} as Record<TerritoryId, TerritoryState>;

  if (allocation === "grab" || allocation === "election") {
    for (const id of activeIds) territories[id] = { owner: -1, armies: 0 };
  } else {
    const dealt = shuffle(activeIds);
    dealt.forEach((id, i) => {
      territories[id] = { owner: i % players.length, armies: 1 };
    });

    const neighborsOf = (id: TerritoryId): TerritoryId[] => defs.find((d) => d.id === id)?.neighbors ?? [];
    for (const player of players) {
      const owned = activeIds.filter((id) => territories[id].owner === player.id);
      let remaining = initial - owned.length;
      while (remaining > 0 && owned.length > 0) {
        const weighted = owned.flatMap((id) => {
          const borders = neighborsOf(id).some((n) => territories[n].owner !== player.id);
          return borders ? [id, id, id] : [id];
        });
        const pick = weighted[Math.floor(Math.random() * weighted.length)];
        if (!pick) break;
        territories[pick] = { ...territories[pick], armies: territories[pick].armies + 1 };
        remaining -= 1;
      }
    }
  }

  if (setup.objective === "mission") {
    const missions = generateMissions(players);
    players.forEach((p, i) => {
      p.mission = missions[i] ?? null;
    });
  }

  const state: GameState = {
    setup,
    players,
    territories,
    activeIds,
    deck: buildDeck(activeIds),
    currentPlayer: 0,
    phase: "reinforcement",
    turn: 1,
    reinforcementsRemaining: 0,
    mustTrade: false,
    tradesCompleted: 0,
    pendingOccupy: null,
    lastBattle: null,
    winner: null,
    winReason: null,
    battlesFought: 0,
    awaitingHandoff: false,
    log: [],
    logCounter: 0,
    alliances: [],
    pendingProposal: null,
    proposalsMade: [],
    initialRemaining: players.map(() => initial),
    history: [],
    election: null,
    fortifyUsed: false,
    deployLog: [],
    sameTime: null,
    coWinners: null,
  };
  addLog(state, `The campaign of MDCCCXII begins — ${OBJECTIVE_INFO[setup.objective].name}.`, "gold");
  if (setup.turnStyle === "sameTime") {
    addLog(state, "Same Time RISK — every commander plans and moves at once.", "info");
  }
  if (allocation === "grab") {
    state.phase = "territoryGrab";
    addLog(state, "Territory Grab — commanders take turns claiming their ground.", "gold");
  } else if (allocation === "election") {
    beginElections(state);
  } else {
    beginCampaign(state);
  }
  return state;
}

/**
 * Election setup (manual, Chapter 7): every player is granted one random
 * territory, the rest go to auction with ~100 Election Points per territory
 * shared out (rounded down to the nearest 10 per player).
 */
function beginElections(state: GameState): void {
  const dealt = shuffle(state.activeIds);
  state.players.forEach((player, i) => {
    const seed = dealt[i];
    if (seed) setTerritory(state, seed, { owner: player.id, armies: 1 });
  });
  const open = shuffle(state.activeIds.filter((id) => state.territories[id].owner === -1));
  const perPlayer =
    Math.floor((state.activeIds.length * POINTS_PER_TERRITORY) / state.players.length / 10) * 10;
  const [first, ...queue] = open;
  if (!first) {
    beginCampaign(state);
    return;
  }
  state.phase = "election";
  state.currentPlayer = 0;
  state.election = {
    territory: first,
    queue,
    bid: 0,
    highBidder: null,
    passed: [],
    points: state.players.map(() => perPlayer),
    influenceUsed: [],
  };
  addLog(
    state,
    `The elections begin — each commander holds ${perPlayer} Election Points. Expect to pay around 100 a territory.`,
    "gold",
  );
}

/**
 * Neighbouring territories owned by a player whose one-time influence is
 * still unspent — each is worth 10 points toward this election.
 */
export function influenceSources(state: GameState, playerId: number, territory: TerritoryId): TerritoryId[] {
  const used = new Set(state.election?.influenceUsed ?? []);
  const active = new Set(state.activeIds);
  return (TERRITORY_MAP[territory]?.neighbors ?? []).filter(
    (n) => active.has(n) && state.territories[n].owner === playerId && !used.has(n),
  );
}

/** The most a player can raise to, counting points plus available influence. */
export function electionBudget(state: GameState, playerId: number): number {
  const election = state.election;
  if (!election) return 0;
  return (
    (election.points[playerId] ?? 0) +
    influenceSources(state, playerId, election.territory).length * INFLUENCE_VALUE
  );
}

/** Hand the floor to the next eligible bidder, or resolve the auction. */
function advanceElection(state: GameState): void {
  const election = state.election;
  if (!election) return;
  const total = state.players.length;
  for (let step = 1; step <= total; step += 1) {
    const candidate = (state.currentPlayer + step) % total;
    if (election.passed.includes(candidate)) continue;
    if (candidate === election.highBidder) continue;
    state.currentPlayer = candidate;
    return;
  }
  resolveAuction(state);
}

/** Award the auctioned territory, spending influence first, then points. */
function resolveAuction(state: GameState): void {
  const election = state.election;
  if (!election) return;
  const name = TERRITORY_MAP[election.territory]?.name ?? election.territory;

  if (election.highBidder === null) {
    // Nobody bid — the territory is allocated at random (manual, Chapter 7).
    const lucky = Math.floor(Math.random() * state.players.length);
    setTerritory(state, election.territory, { owner: lucky, armies: 1 });
    addLog(state, `No bids for ${name} — it falls to ${state.players[lucky]?.name ?? "?"} by lot.`, "info");
    nextAuction(state, lucky);
    return;
  }

  const winner = election.highBidder;
  const sources = influenceSources(state, winner, election.territory);
  const influenceApplied = Math.min(sources.length, Math.floor(election.bid / INFLUENCE_VALUE));
  const spentSources = sources.slice(0, influenceApplied);
  const cost = Math.max(0, election.bid - influenceApplied * INFLUENCE_VALUE);
  state.election = {
    ...election,
    points: election.points.map((p, i) => (i === winner ? Math.max(0, p - cost) : p)),
    influenceUsed: [...election.influenceUsed, ...spentSources],
  };
  setTerritory(state, election.territory, { owner: winner, armies: 1 });
  addLog(
    state,
    `${state.players[winner]?.name ?? "?"} wins the election for ${name} at ${election.bid} points${
      influenceApplied > 0 ? ` (${influenceApplied * INFLUENCE_VALUE} covered by influence)` : ""
    }.`,
    "gold",
  );
  nextAuction(state, winner);
}

/** Open the next auction, or conclude the elections when the docket is empty. */
function nextAuction(state: GameState, lastWinner: number): void {
  const election = state.election;
  if (!election) return;
  const [next, ...rest] = election.queue;
  if (!next) {
    finishElections(state);
    return;
  }
  state.election = { ...election, territory: next, queue: rest, bid: 0, highBidder: null, passed: [] };
  state.currentPlayer = (lastWinner + 1) % state.players.length;
}

/**
 * Elections concluded: unused points trade for battalions (1 per 50, capped
 * at territories owned), then the initial muster begins.
 */
function finishElections(state: GameState): void {
  const election = state.election;
  if (!election) return;
  const initial = INITIAL_ARMIES[state.players.length] ?? 25;
  const bonuses = state.players.map((player) => {
    const owned = ownedIds(state, player.id).length;
    return Math.min(Math.floor((election.points[player.id] ?? 0) / POINTS_PER_BATTALION), owned);
  });
  state.initialRemaining = state.players.map((player) => {
    const owned = ownedIds(state, player.id).length;
    return Math.max(0, initial - owned) + (bonuses[player.id] ?? 0);
  });
  for (const player of state.players) {
    const bonus = bonuses[player.id] ?? 0;
    if (bonus > 0) {
      addLog(
        state,
        `${player.name} trades ${bonus * POINTS_PER_BATTALION} unused points for ${bonus} extra ${bonus === 1 ? "battalion" : "battalions"}.`,
        "info",
      );
    }
  }
  state.election = null;
  addLog(state, "The elections conclude. Muster your starting armies.", "gold");
  state.phase = "initialDeploy";
  state.currentPlayer = state.players.length - 1;
  advanceInitialDeploy(state);
}

/** AI generals pick their most defensible holding as capital (Capital RISK). */
function assignAiCapitals(state: GameState): void {
  for (const player of state.players) {
    if (player.isHuman || player.capital !== null) continue;
    const owned = ownedIds(state, player.id);
    let pick: TerritoryId | null = null;
    let bestScore = -Infinity;
    for (const id of owned) {
      const hostileBorders = (TERRITORY_MAP[id]?.neighbors ?? []).filter(
        (n) => state.activeIds.includes(n) && state.territories[n].owner !== player.id,
      ).length;
      const score = state.territories[id].armies * 2 - hostileBorders;
      if (score > bestScore) {
        bestScore = score;
        pick = id;
      }
    }
    player.capital = pick;
  }
}

/** Transition from allocation into the campaign proper (capitals, first turn). */
function beginCampaign(state: GameState): void {
  if (state.setup.objective === "capital") assignAiCapitals(state);
  recordSnapshot(state);
  const firstChooser =
    state.setup.objective === "capital"
      ? state.players.findIndex((p) => p.isHuman && p.capital === null)
      : -1;
  if (firstChooser >= 0) {
    state.phase = "chooseCapital";
    state.currentPlayer = firstChooser;
    addLog(state, "Commanders, choose your capital cities.", "gold");
  } else if (state.setup.turnStyle === "sameTime") {
    startSameTimeRound(state);
  } else {
    state.currentPlayer = 0;
    startTurn(state);
  }
}

function endTurn(state: GameState): void {
  const player = state.players[state.currentPlayer];
  if (!player) return;
  if (player.conqueredThisTurn) {
    drawCard(state, player);
    addLog(state, `${player.name} earns a Risk card for the turn's conquests.`, "info");
  }
  let next = state.currentPlayer;
  let wrapped = false;
  for (let step = 1; step <= state.players.length; step += 1) {
    const candidate = (state.currentPlayer + step) % state.players.length;
    const candidatePlayer = state.players[candidate];
    if (candidatePlayer?.alive) {
      next = candidate;
      if (candidate <= state.currentPlayer) {
        state.turn += 1;
        wrapped = true;
      }
      break;
    }
  }
  if (wrapped) {
    recordSnapshot(state);
    const lapsed = state.alliances.filter(
      (a) => a.expiresOnRound < state.turn || !state.players[a.a]?.alive || !state.players[a.b]?.alive,
    );
    if (lapsed.length > 0) {
      state.alliances = state.alliances.filter((a) => !lapsed.includes(a));
      for (const a of lapsed) {
        addLog(
          state,
          `The pact between ${state.players[a.a]?.name ?? "?"} and ${state.players[a.b]?.name ?? "?"} has lapsed.`,
          "info",
        );
      }
    }
  }
  state.currentPlayer = next;
  state.lastBattle = null;
  startTurn(state);
  checkVictory(state, next);
}

function performTrade(state: GameState, cardIds: string[]): void {
  const player = state.players[state.currentPlayer];
  const sameTimeReinforce = state.phase === "sameTimeReinforce" && state.sameTime;
  if (!player || (state.phase !== "reinforcement" && !sameTimeReinforce)) return;
  const cards = cardIds
    .map((id) => player.cards.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);
  if (!isValidSet(cards)) return;
  const bonus = tradeValue(cards, state.setup.cardRule ?? "ascending", state.tradesCompleted);
  if (bonus <= 0) return;
  player.cards = player.cards.filter((c) => !cardIds.includes(c.id));
  state.tradesCompleted += 1;
  const ownedCard = cards.find((c) => c.territory !== null && state.territories[c.territory].owner === player.id);
  if (ownedCard?.territory) {
    const territory = state.territories[ownedCard.territory];
    setTerritory(state, ownedCard.territory, { ...territory, armies: territory.armies + 2 });
  }
  if (sameTimeReinforce && state.sameTime) {
    state.sameTime.reinforcementsRemaining = state.sameTime.reinforcementsRemaining.map((n, i) =>
      i === player.id ? n + bonus : n,
    );
  } else {
    state.reinforcementsRemaining += bonus;
    state.mustTrade = player.cards.length >= 5;
  }
  addLog(state, `${player.name} trades a card set for ${bonus} armies.`, "gold");
}

/** Chance an AI general accepts a pact, from honor, grudges, level and relative strength. */
function allianceAcceptChance(state: GameState, proposerId: number, targetId: number, level: AllianceLevel): number {
  const target = state.players[targetId];
  const general = target?.generalId ? GENERALS[target.generalId] : null;
  if (!target || !general) return 0;
  const grudge = target.grudges[proposerId] ?? 0;
  let chance = 0.35 + general.honorLevel * 0.45 - (level - 1) * 0.12 - grudge * 0.3;
  if (totalTroops(state, proposerId) > totalTroops(state, targetId) * 1.3) chance += 0.15;
  return Math.min(0.95, Math.max(0.05, chance));
}

function forgeAlliance(state: GameState, a: number, b: number, level: AllianceLevel): void {
  state.alliances = [...state.alliances, { a, b, level, expiresOnRound: state.turn + 1 }];
  addLog(
    state,
    `${state.players[a]?.name ?? "?"} and ${state.players[b]?.name ?? "?"} forge a ${ALLIANCE_LEVEL_INFO[level].name}.`,
    "gold",
  );
}

/** Advance the grab/initial-deploy rotation; hands over to the campaign when done. */
function advanceInitialDeploy(state: GameState): void {
  const total = state.players.length;
  for (let step = 1; step <= total; step += 1) {
    const candidate = (state.currentPlayer + step) % total;
    if ((state.initialRemaining[candidate] ?? 0) > 0) {
      state.currentPlayer = candidate;
      return;
    }
  }
  addLog(state, "All starting armies are in the field. To war!", "gold");
  beginCampaign(state);
}

/** Next alive player (searching forward from the current focus) who hasn't confirmed this sub-phase yet. */
function nextNotReady(state: GameState, ready: boolean[]): number | null {
  const total = state.players.length;
  for (let step = 0; step < total; step += 1) {
    const candidate = (state.currentPlayer + step) % total;
    const p = state.players[candidate];
    if (p?.alive && !ready[candidate]) return candidate;
  }
  return null;
}

/** Pass-and-play only needs a handoff screen between two different human commanders. */
function focusSameTimeActor(state: GameState): void {
  const actor = state.players[state.currentPlayer];
  state.awaitingHandoff = Boolean(actor?.isHuman) && humansCount(state.players) > 1;
}

/** Open a fresh Same Time round: everyone musters reinforcements in secret. */
function startSameTimeRound(state: GameState): void {
  state.phase = "sameTimeReinforce";
  state.pendingOccupy = null;
  state.lastBattle = null;
  state.sameTime = {
    reinforcementsRemaining: state.players.map((p) => (p.alive ? sameTimeReinforcementsFor(state, p.id) : 0)),
    deployLog: state.players.map(() => []),
    readyReinforce: state.players.map(() => false),
    orders: [],
    readyBattle: state.players.map(() => false),
    playback: [],
    moves: [],
    readyMove: state.players.map(() => false),
  };
  const firstAlive = state.players.findIndex((p) => p.alive);
  state.currentPlayer = firstAlive >= 0 ? firstAlive : 0;
  addLog(state, `Round ${state.turn} — commanders muster reinforcements in secret.`, "gold");
  focusSameTimeReinforce(state);
}

function focusSameTimeReinforce(state: GameState): void {
  const st = state.sameTime;
  if (!st) return;
  const next = nextNotReady(state, st.readyReinforce);
  if (next === null) {
    beginSameTimeBattle(state);
    return;
  }
  state.currentPlayer = next;
  focusSameTimeActor(state);
}

function beginSameTimeBattle(state: GameState): void {
  const st = state.sameTime;
  if (!st) return;
  state.phase = "sameTimeBattle";
  st.orders = [];
  st.readyBattle = state.players.map(() => false);
  st.playback = [];
  const firstAlive = state.players.findIndex((p) => p.alive);
  state.currentPlayer = firstAlive >= 0 ? firstAlive : 0;
  addLog(state, "Reinforcements are in place — commanders stage their attack orders.", "gold");
  focusSameTimeBattle(state);
}

function focusSameTimeBattle(state: GameState): void {
  const st = state.sameTime;
  if (!st) return;
  const next = nextNotReady(state, st.readyBattle);
  if (next === null) {
    resolveSameTimeBattlePhase(state);
    return;
  }
  state.currentPlayer = next;
  focusSameTimeActor(state);
}

/** Log every resolved battle and settle any eliminations from the round's combined casualties. */
function applySameTimeCasualties(state: GameState, reports: BattleReport[]): void {
  for (const report of reports) {
    const attackerName = state.players[report.attacker]?.name ?? "?";
    if (report.conquered) {
      addLog(
        state,
        `${attackerName} storms ${report.to} from ${report.from} (${report.defenderLosses} defenders slain).`,
        "battle",
      );
    } else if (report.rounds > 0) {
      addLog(
        state,
        `Clash at ${report.to}: ${attackerName} loses ${report.attackerLosses}, defender loses ${report.defenderLosses}.`,
        "battle",
      );
    }
  }
  // Same Time can eliminate several commanders in one round (A takes B's
  // last territory while C simultaneously takes A's) — so who's eliminated
  // is computed once, order-independently, from the round's final board
  // rather than one player at a time as we mutate `alive` in place.
  const eliminatedIds = new Set<number>();
  for (const victim of state.players) {
    if (!victim.alive) continue;
    const stillOwns = state.activeIds.some((id) => state.territories[id].owner === victim.id);
    if (!stillOwns) eliminatedIds.add(victim.id);
  }

  // The player whose attack directly ended each victim (used for kill
  // credit / tournament scoring, regardless of whether that killer also
  // dies this same round).
  const directKiller = new Map<number, number>();
  for (const victimId of eliminatedIds) {
    const killerReport = [...reports].reverse().find((r) => r.conquered && r.defender === victimId);
    if (killerReport) directKiller.set(victimId, killerReport.attacker);
  }

  // Cards must land on a commander who is still standing after the round.
  // If the direct killer was themselves eliminated this same round, follow
  // their killer onward until reaching a survivor (or give up on a cycle /
  // dead end — the spoils are simply lost, not orphaned on a dead player).
  const finalRecipient = (victimId: number): number | null => {
    const visited = new Set<number>([victimId]);
    let cur = directKiller.get(victimId) ?? null;
    while (cur !== null && eliminatedIds.has(cur)) {
      if (visited.has(cur)) return null;
      visited.add(cur);
      cur = directKiller.get(cur) ?? null;
    }
    return cur;
  };

  for (const victimId of eliminatedIds) {
    const victim = state.players[victimId];
    victim.alive = false;
    const killerId = directKiller.get(victimId) ?? null;
    victim.killedBy = killerId;
    const recipientId = finalRecipient(victimId);
    const recipient = recipientId !== null ? state.players[recipientId] : null;
    if (recipient && victim.cards.length > 0) {
      recipient.cards = [...recipient.cards, ...victim.cards];
    }
    victim.cards = [];
    const killerName = killerId !== null ? state.players[killerId]?.name : null;
    addLog(
      state,
      `${victim.name} has been destroyed${killerName ? ` by ${killerName}` : ""}.`,
      "crimson",
    );
  }
}

/** Every attack order across every commander resolves at once (manual, Chapter 9). */
function resolveSameTimeBattlePhase(state: GameState): void {
  const st = state.sameTime;
  if (!st) return;
  const result = resolveSameTimeRound(state.territories, st.orders);
  state.territories = result.territories;
  state.battlesFought += result.reports.length;
  for (const playerId of result.conquerors) {
    const p = state.players[playerId];
    if (p) p.conqueredThisTurn = true;
  }
  applySameTimeCasualties(state, result.reports);
  st.orders = [];
  st.playback = result.reports;
  if (st.playback.length === 0) {
    beginSameTimeMove(state);
  }
}

function beginSameTimeMove(state: GameState): void {
  const st = state.sameTime;
  if (!st) return;
  state.phase = "sameTimeMove";
  st.moves = [];
  st.readyMove = state.players.map(() => false);
  const firstAlive = state.players.findIndex((p) => p.alive);
  state.currentPlayer = firstAlive >= 0 ? firstAlive : 0;
  addLog(state, "The field falls quiet — commanders reposition their armies.", "gold");
  focusSameTimeMove(state);
}

function focusSameTimeMove(state: GameState): void {
  const st = state.sameTime;
  if (!st) return;
  const next = nextNotReady(state, st.readyMove);
  if (next === null) {
    finishSameTimeRound(state);
    return;
  }
  state.currentPlayer = next;
  focusSameTimeActor(state);
}

/** Apply queued tactical moves, hand out conquest cards, check for a win, and open the next round. */
function finishSameTimeRound(state: GameState): void {
  const st = state.sameTime;
  if (!st) return;
  for (const move of st.moves) {
    const from = state.territories[move.from];
    const to = state.territories[move.to];
    if (!from || !to || from.owner !== move.player || to.owner !== move.player) continue;
    const count = Math.min(move.count, from.armies - 1);
    if (count <= 0) continue;
    setTerritory(state, move.from, { ...from, armies: from.armies - count });
    setTerritory(state, move.to, { ...state.territories[move.to], armies: state.territories[move.to].armies + count });
  }
  for (const p of state.players) {
    if (p.alive && p.conqueredThisTurn) {
      drawCard(state, p);
      addLog(state, `${p.name} earns a Risk card for the round's conquests.`, "info");
      p.conqueredThisTurn = false;
    }
  }
  resolveSameTimeVictory(state);
  if (state.phase === "gameOver") return;
  recordSnapshot(state);
  state.turn += 1;
  const lapsed = state.alliances.filter(
    (a) => a.expiresOnRound < state.turn || !state.players[a.a]?.alive || !state.players[a.b]?.alive,
  );
  if (lapsed.length > 0) {
    state.alliances = state.alliances.filter((a) => !lapsed.includes(a));
    for (const a of lapsed) {
      addLog(
        state,
        `The pact between ${state.players[a.a]?.name ?? "?"} and ${state.players[a.b]?.name ?? "?"} has lapsed.`,
        "info",
      );
    }
  }
  startSameTimeRound(state);
}

export function gameReducer(previous: GameState, action: GameAction): GameState {
  if (previous.phase === "gameOver" && action.type !== "ACKNOWLEDGE_HANDOFF") return previous;
  const state = cloneState(previous);
  const player = state.players[state.currentPlayer];
  if (!player) return previous;

  switch (action.type) {
    case "ACKNOWLEDGE_HANDOFF": {
      state.awaitingHandoff = false;
      return state;
    }

    case "CLAIM_TERRITORY": {
      if (state.phase !== "territoryGrab") return previous;
      const territory = state.territories[action.territory];
      if (territory.owner !== -1) return previous;
      setTerritory(state, action.territory, { owner: player.id, armies: 1 });
      state.initialRemaining = state.initialRemaining.map((n, i) => (i === player.id ? n - 1 : n));
      const remainingOpen = state.activeIds.some((id) => state.territories[id].owner === -1);
      if (remainingOpen) {
        state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
      } else {
        addLog(state, "Every territory is claimed. Muster your starting armies.", "gold");
        state.phase = "initialDeploy";
        state.currentPlayer = state.players.length - 1;
        advanceInitialDeploy(state);
      }
      return state;
    }

    case "ELECTION_BID": {
      const election = state.election;
      if (state.phase !== "election" || !election) return previous;
      if (election.passed.includes(player.id)) return previous;
      const newBid = election.bid + action.raise;
      if (newBid > electionBudget(state, player.id)) return previous;
      state.election = { ...election, bid: newBid, highBidder: player.id };
      advanceElection(state);
      return state;
    }

    case "ELECTION_PASS": {
      const election = state.election;
      if (state.phase !== "election" || !election) return previous;
      if (election.highBidder === player.id || election.passed.includes(player.id)) return previous;
      state.election = { ...election, passed: [...election.passed, player.id] };
      advanceElection(state);
      return state;
    }

    case "PLACE_INITIAL": {
      if (state.phase !== "initialDeploy") return previous;
      const territory = state.territories[action.territory];
      if (territory.owner !== player.id) return previous;
      const remaining = state.initialRemaining[player.id] ?? 0;
      if (remaining <= 0) return previous;
      const chunk = Math.min(INITIAL_PLACE_CHUNK, remaining);
      setTerritory(state, action.territory, { ...territory, armies: territory.armies + chunk });
      state.initialRemaining = state.initialRemaining.map((n, i) => (i === player.id ? n - chunk : n));
      advanceInitialDeploy(state);
      return state;
    }

    case "PROPOSE_ALLIANCE": {
      if (state.phase !== "reinforcement" || state.pendingProposal) return previous;
      if (state.players.filter((p) => p.isHuman && p.alive).length !== 1) return previous;
      const target = state.players[action.target];
      if (!target || !target.alive || target.id === player.id) return previous;
      if (state.proposalsMade.includes(target.id)) return previous;
      if (allianceBetween(state, player.id, target.id)) return previous;
      state.proposalsMade = [...state.proposalsMade, target.id];
      if (target.isHuman) {
        state.pendingProposal = { from: player.id, to: target.id, level: action.level };
        addLog(state, `${player.name} proposes a ${ALLIANCE_LEVEL_INFO[action.level].name} to ${target.name}.`, "info");
      } else if (Math.random() < allianceAcceptChance(state, player.id, target.id, action.level)) {
        forgeAlliance(state, player.id, target.id, action.level);
      } else {
        addLog(state, `${target.name} declines ${player.name}'s offer of a ${ALLIANCE_LEVEL_INFO[action.level].name}.`, "crimson");
      }
      return state;
    }

    case "SEND_THREAT": {
      if (state.phase !== "reinforcement") return previous;
      if (state.players.filter((p) => p.isHuman && p.alive).length !== 1) return previous;
      const target = state.players[action.target];
      if (!target || !target.alive || target.id === player.id || target.isHuman) return previous;
      if (state.proposalsMade.includes(target.id)) return previous;
      state.proposalsMade = [...state.proposalsMade, target.id];
      bumpGrudge(state, target.id, player.id, 0.5);
      addLog(state, `${player.name} sends a menacing dispatch to ${target.name}. It will not be forgotten.`, "crimson");
      return state;
    }

    case "RESPOND_PROPOSAL": {
      const proposal = state.pendingProposal;
      if (!proposal) return previous;
      state.pendingProposal = null;
      if (action.accept) {
        forgeAlliance(state, proposal.from, proposal.to, proposal.level);
      } else {
        bumpGrudge(state, proposal.from, proposal.to, 0.15);
        addLog(
          state,
          `${state.players[proposal.to]?.name ?? "?"} rebuffs ${state.players[proposal.from]?.name ?? "?"}'s offer.`,
          "info",
        );
      }
      return state;
    }

    case "CHOOSE_CAPITAL": {
      if (state.phase !== "chooseCapital" || state.awaitingHandoff) return previous;
      const territory = state.territories[action.territory];
      if (territory.owner !== player.id || player.capital !== null) return previous;
      player.capital = action.territory;
      addLog(state, `${player.name} establishes a capital city.`, "info");
      const nextChooser = state.players.findIndex((p) => p.isHuman && p.alive && p.capital === null);
      if (nextChooser >= 0) {
        state.currentPlayer = nextChooser;
        state.awaitingHandoff = humansCount(state.players) > 1;
      } else {
        addLog(state, "All capitals are disclosed. Defend your own — and march on theirs.", "gold");
        if (state.setup.turnStyle === "sameTime") {
          startSameTimeRound(state);
        } else {
          state.currentPlayer = 0;
          startTurn(state);
        }
      }
      return state;
    }

    case "TRADE_CARDS": {
      performTrade(state, action.cardIds);
      return state;
    }

    case "AUTO_TRADE": {
      const set = findBestSet(player.cards, state.setup.cardRule ?? "ascending");
      if (set) performTrade(state, set.map((c) => c.id));
      return state;
    }

    case "DEPLOY": {
      if (state.phase === "sameTimeReinforce") {
        const st = state.sameTime;
        if (!st || state.awaitingHandoff || player.cards.length >= 5) return previous;
        const territory = state.territories[action.territory];
        if (territory.owner !== player.id) return previous;
        const remaining = st.reinforcementsRemaining[player.id] ?? 0;
        let count = Math.min(Math.max(1, action.count), remaining);
        if (state.setup.restrictedReinforcement) {
          const cap = restrictedReinforcementCap(state, player.id, action.territory);
          const alreadyPlaced = st.deployLog[player.id]?.reduce(
            (sum, entry) => (entry.territory === action.territory ? sum + entry.count : sum),
            0,
          ) ?? 0;
          count = Math.min(count, Math.max(0, cap - alreadyPlaced));
        }
        if (count <= 0) return previous;
        setTerritory(state, action.territory, { ...territory, armies: territory.armies + count });
        st.reinforcementsRemaining = st.reinforcementsRemaining.map((n, i) => (i === player.id ? n - count : n));
        st.deployLog = st.deployLog.map((entries, i) =>
          i === player.id ? [...entries, { territory: action.territory, count }] : entries,
        );
        return state;
      }
      if (state.phase !== "reinforcement" || state.mustTrade || state.awaitingHandoff) return previous;
      const territory = state.territories[action.territory];
      if (territory.owner !== player.id) return previous;
      const count = Math.min(Math.max(1, action.count), state.reinforcementsRemaining);
      if (count <= 0) return previous;
      setTerritory(state, action.territory, { ...territory, armies: territory.armies + count });
      state.reinforcementsRemaining -= count;
      state.deployLog = [...state.deployLog, { territory: action.territory, count }];
      if (state.reinforcementsRemaining === 0) {
        state.phase = "attack";
        state.deployLog = [];
      }
      return state;
    }

    case "UNDO_DEPLOY": {
      if (state.phase === "sameTimeReinforce") {
        const st = state.sameTime;
        if (!st || state.awaitingHandoff) return previous;
        const log = st.deployLog[player.id] ?? [];
        const last = log[log.length - 1];
        if (!last) return previous;
        const territory = state.territories[last.territory];
        if (territory.owner !== player.id || territory.armies - last.count < 1) return previous;
        setTerritory(state, last.territory, { ...territory, armies: territory.armies - last.count });
        st.reinforcementsRemaining = st.reinforcementsRemaining.map((n, i) =>
          i === player.id ? n + last.count : n,
        );
        st.deployLog = st.deployLog.map((entries, i) => (i === player.id ? entries.slice(0, -1) : entries));
        return state;
      }
      if (state.phase !== "reinforcement" || state.awaitingHandoff) return previous;
      const last = state.deployLog[state.deployLog.length - 1];
      if (!last) return previous;
      const territory = state.territories[last.territory];
      if (territory.owner !== player.id || territory.armies - last.count < 1) return previous;
      setTerritory(state, last.territory, { ...territory, armies: territory.armies - last.count });
      state.reinforcementsRemaining += last.count;
      state.deployLog = state.deployLog.slice(0, -1);
      return state;
    }

    case "ATTACK": {
      if (state.phase !== "attack" || state.pendingOccupy || state.awaitingHandoff) return previous;
      const from = state.territories[action.from];
      const to = state.territories[action.to];
      if (from.owner !== player.id || to.owner === player.id || from.armies < 2) return previous;
      const defenderPlayer = state.players[to.owner];
      if (!defenderPlayer) return previous;

      // I-Com: attacking an ally breaks the pact (Level I only if the target is protected).
      const alliance = allianceBetween(state, player.id, defenderPlayer.id);
      if (alliance && (alliance.level >= 2 || protectedByLevelOne(state, defenderPlayer.id, action.to))) {
        state.alliances = state.alliances.filter(
          (x) => !((x.a === alliance.a && x.b === alliance.b) || (x.a === alliance.b && x.b === alliance.a)),
        );
        bumpGrudge(state, defenderPlayer.id, player.id, 1.5);
        addLog(state, `${player.name} BREAKS the pact with ${defenderPlayer.name}. Treachery!`, "crimson");
      }
      bumpGrudge(state, defenderPlayer.id, player.id, 0.15);

      let attackerArmies = from.armies;
      let defenderArmies = to.armies;
      let attackerLosses = 0;
      let defenderLosses = 0;
      let rounds = 0;
      let lastAttackRolls: number[] = [];
      let lastDefendRolls: number[] = [];

      do {
        const round = resolveBattleRound(attackerArmies, defenderArmies);
        attackerArmies -= round.attackerLosses;
        defenderArmies -= round.defenderLosses;
        attackerLosses += round.attackerLosses;
        defenderLosses += round.defenderLosses;
        lastAttackRolls = round.attackerRolls;
        lastDefendRolls = round.defenderRolls;
        rounds += 1;
      } while (action.allOut && attackerArmies > 1 && defenderArmies > 0);

      const conquered = defenderArmies === 0;
      state.battlesFought += 1;
      setTerritory(state, action.from, { ...from, armies: attackerArmies });
      setTerritory(state, action.to, {
        owner: conquered ? player.id : to.owner,
        armies: defenderArmies,
      });

      state.lastBattle = {
        from: action.from,
        to: action.to,
        attacker: player.id,
        defender: defenderPlayer.id,
        attackerRolls: lastAttackRolls,
        defenderRolls: lastDefendRolls,
        attackerLosses,
        defenderLosses,
        rounds,
        conquered,
        attackerTier: tierForAttacker(Math.max(1, attackerArmies - 1)),
        defenderTier: tierForDefender(Math.max(1, defenderArmies)),
        attackerArmiesBefore: from.armies,
        defenderArmiesBefore: to.armies,
      };

      if (conquered) {
        player.conqueredThisTurn = true;
        bumpGrudge(state, defenderPlayer.id, player.id, 0.15);
        // Manual: the number of dice used in the winning roll sets the minimum move-in.
        const diceUsed = lastAttackRolls.length;
        state.pendingOccupy = {
          from: action.from,
          to: action.to,
          min: Math.max(1, Math.min(diceUsed, attackerArmies - 1)),
          max: attackerArmies - 1,
        };
        addLog(
          state,
          `${player.name} storms ${action.to} from ${action.from} (${defenderLosses} defenders slain).`,
          "battle",
        );

        const defenderRemaining = ownedIds(state, defenderPlayer.id).length;
        if (defenderRemaining === 0) {
          defenderPlayer.alive = false;
          defenderPlayer.killedBy = player.id;
          if (defenderPlayer.cards.length > 0) {
            player.cards = [...player.cards, ...defenderPlayer.cards];
            defenderPlayer.cards = [];
          }
          addLog(state, `${defenderPlayer.name} has been destroyed by ${player.name}.`, "crimson");
        }
        checkVictory(state, player.id);
      } else {
        addLog(
          state,
          `Battle at ${action.to}: attacker loses ${attackerLosses}, defender loses ${defenderLosses}.`,
          "battle",
        );
      }
      return state;
    }

    case "OCCUPY": {
      const pending = state.pendingOccupy;
      if (!pending) return previous;
      const from = state.territories[pending.from];
      const to = state.territories[pending.to];
      const count = Math.min(Math.max(pending.min, action.count), Math.min(pending.max, from.armies - 1));
      setTerritory(state, pending.from, { ...from, armies: from.armies - count });
      setTerritory(state, pending.to, { ...to, armies: to.armies + count });
      state.pendingOccupy = null;
      return state;
    }

    case "END_ATTACK": {
      if (state.phase !== "attack" || state.pendingOccupy) return previous;
      state.phase = "fortify";
      return state;
    }

    case "FORTIFY": {
      // The move no longer ends the turn — the player (or AI) closes it with
      // an explicit END_TURN, so a mis-tap can't burn the whole turn.
      if (state.phase !== "fortify" || state.awaitingHandoff || state.fortifyUsed) return previous;
      const from = state.territories[action.from];
      const to = state.territories[action.to];
      if (from.owner !== player.id || to.owner !== player.id) return previous;
      const count = Math.min(Math.max(1, action.count), from.armies - 1);
      if (count <= 0) return previous;
      setTerritory(state, action.from, { ...from, armies: from.armies - count });
      setTerritory(state, action.to, { ...to, armies: to.armies + count });
      state.fortifyUsed = true;
      addLog(state, `${player.name} manoeuvres ${count} armies to ${action.to}.`, "info");
      return state;
    }

    case "END_TURN": {
      // Only the combat phases may close a turn — a stray END_TURN during
      // deployment or the setup rotations would strand unplaced armies or
      // corrupt the draft order.
      if (state.awaitingHandoff || state.pendingOccupy) return previous;
      if (state.phase !== "attack" && state.phase !== "fortify") return previous;
      endTurn(state);
      return state;
    }

    case "ST_READY_REINFORCE": {
      const st = state.sameTime;
      if (state.phase !== "sameTimeReinforce" || !st || state.awaitingHandoff) return previous;
      if (player.cards.length >= 5) return previous;
      if ((st.reinforcementsRemaining[player.id] ?? 0) !== 0) return previous;
      st.readyReinforce = st.readyReinforce.map((r, i) => (i === player.id ? true : r));
      addLog(state, `${player.name} seals their orders.`, "info");
      focusSameTimeReinforce(state);
      return state;
    }

    case "ST_QUEUE_ATTACK": {
      const st = state.sameTime;
      if (state.phase !== "sameTimeBattle" || !st || state.awaitingHandoff) return previous;
      if (st.readyBattle[player.id]) return previous;
      const from = state.territories[action.from];
      const to = state.territories[action.to];
      if (!from || !to || from.owner !== player.id || to.owner === player.id) return previous;
      if (!(TERRITORY_MAP[action.from]?.neighbors ?? []).includes(action.to)) return previous;
      const alreadyCommitted = st.orders
        .filter((o) => o.player === player.id && o.from === action.from)
        .reduce((sum, o) => sum + o.count, 0);
      const available = from.armies - 1 - alreadyCommitted;
      const count = Math.min(Math.max(1, action.count), available);
      if (count <= 0) return previous;
      if (action.surgeTo && !(TERRITORY_MAP[action.to]?.neighbors ?? []).includes(action.surgeTo)) return previous;

      const defenderPlayer = state.players[to.owner];
      if (defenderPlayer) {
        const alliance = allianceBetween(state, player.id, defenderPlayer.id);
        if (alliance && (alliance.level >= 2 || protectedByLevelOne(state, defenderPlayer.id, action.to))) {
          state.alliances = state.alliances.filter(
            (x) => !((x.a === alliance.a && x.b === alliance.b) || (x.a === alliance.b && x.b === alliance.a)),
          );
          bumpGrudge(state, defenderPlayer.id, player.id, 1.5);
          addLog(state, `${player.name} BREAKS the pact with ${defenderPlayer.name}. Treachery!`, "crimson");
        }
        bumpGrudge(state, defenderPlayer.id, player.id, 0.15);
      }

      state.sameTime = {
        ...st,
        orders: [
          ...st.orders,
          {
            id: `${state.turn}-${player.id}-${action.from}-${action.to}-${st.orders.length}`,
            player: player.id,
            from: action.from,
            to: action.to,
            count,
            surgeTo: action.surgeTo,
          },
        ],
      };
      addLog(state, `${player.name} orders ${count} armies from ${action.from} against ${action.to}.`, "info");
      return state;
    }

    case "ST_CANCEL_ATTACK": {
      const st = state.sameTime;
      if (state.phase !== "sameTimeBattle" || !st || state.awaitingHandoff) return previous;
      if (st.readyBattle[player.id]) return previous;
      const order = st.orders.find((o) => o.id === action.orderId);
      if (!order || order.player !== player.id) return previous;
      st.orders = st.orders.filter((o) => o.id !== action.orderId);
      return state;
    }

    case "ST_READY_BATTLE": {
      const st = state.sameTime;
      if (state.phase !== "sameTimeBattle" || !st || state.awaitingHandoff) return previous;
      st.readyBattle = st.readyBattle.map((r, i) => (i === player.id ? true : r));
      addLog(state, `${player.name} seals their attack orders.`, "info");
      focusSameTimeBattle(state);
      return state;
    }

    case "ST_ACK_PLAYBACK": {
      const st = state.sameTime;
      if (state.phase !== "sameTimeBattle" || !st || st.playback.length === 0) return previous;
      st.playback = st.playback.slice(1);
      if (st.playback.length === 0) {
        beginSameTimeMove(state);
      }
      return state;
    }

    case "ST_QUEUE_MOVE": {
      const st = state.sameTime;
      if (state.phase !== "sameTimeMove" || !st || state.awaitingHandoff) return previous;
      if (st.readyMove[player.id]) return previous;
      const from = state.territories[action.from];
      if (!from || from.owner !== player.id) return previous;
      if (!friendlyReachableSet(state, player.id, action.from).has(action.to)) return previous;
      const alreadyCommitted = st.moves
        .filter((m) => m.player === player.id && m.from === action.from)
        .reduce((sum, m) => sum + m.count, 0);
      const available = from.armies - 1 - alreadyCommitted;
      const count = Math.min(Math.max(1, action.count), available);
      if (count <= 0) return previous;
      st.moves = [
        ...st.moves,
        {
          id: `${state.turn}-${player.id}-${action.from}-${action.to}-${st.moves.length}`,
          player: player.id,
          from: action.from,
          to: action.to,
          count,
        },
      ];
      addLog(state, `${player.name} orders ${count} armies to march from ${action.from} to ${action.to}.`, "info");
      return state;
    }

    case "ST_CANCEL_MOVE": {
      const st = state.sameTime;
      if (state.phase !== "sameTimeMove" || !st || state.awaitingHandoff) return previous;
      if (st.readyMove[player.id]) return previous;
      const move = st.moves.find((m) => m.id === action.orderId);
      if (!move || move.player !== player.id) return previous;
      st.moves = st.moves.filter((m) => m.id !== action.orderId);
      return state;
    }

    case "ST_READY_MOVE": {
      const st = state.sameTime;
      if (state.phase !== "sameTimeMove" || !st || state.awaitingHandoff) return previous;
      st.readyMove = st.readyMove.map((r, i) => (i === player.id ? true : r));
      addLog(state, `${player.name} confirms their repositioning.`, "info");
      focusSameTimeMove(state);
      return state;
    }
  }
}
