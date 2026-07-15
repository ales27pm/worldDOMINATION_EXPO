export type ContinentId = "northAmerica" | "southAmerica" | "europe" | "africa" | "asia" | "australia";

export type TerritoryId =
  | "alaska"
  | "northwestTerritory"
  | "greenland"
  | "alberta"
  | "ontario"
  | "quebec"
  | "westernUS"
  | "easternUS"
  | "centralAmerica"
  | "hawaii"
  | "venezuela"
  | "peru"
  | "brazil"
  | "argentina"
  | "falklandIslands"
  | "iceland"
  | "scandinavia"
  | "greatBritain"
  | "northernEurope"
  | "westernEurope"
  | "southernEurope"
  | "ukraine"
  | "svalbard"
  | "northAfrica"
  | "egypt"
  | "eastAfrica"
  | "congo"
  | "southAfrica"
  | "madagascar"
  | "westAfrica"
  | "ural"
  | "siberia"
  | "yakutsk"
  | "kamchatka"
  | "irkutsk"
  | "mongolia"
  | "japan"
  | "afghanistan"
  | "china"
  | "middleEast"
  | "india"
  | "siam"
  | "philippines"
  | "indonesia"
  | "newGuinea"
  | "westernAustralia"
  | "easternAustralia"
  | "newZealand";

export interface TerritoryDef {
  id: TerritoryId;
  name: string;
  x: number;
  y: number;
  continent: ContinentId;
  neighbors: TerritoryId[];
  isExtra: boolean;
}

export interface ContinentDef {
  id: ContinentId;
  name: string;
  bonus: number;
  color: string;
}

export type GeneralId =
  | "campbell"
  | "mackenzie"
  | "wellington"
  | "bonaparte"
  | "marmont"
  | "barbacena"
  | "dErlon"
  | "maransin"
  | "solignac"
  | "sherbrooke"
  | "aubert"
  | "spencer"
  | "taupin"
  | "freire"
  | "vauban"
  | "baird";

export interface GeneralDef {
  id: GeneralId;
  name: string;
  aggression: number;
  riskTolerance: number;
  unpredictability: number;
  honorLevel: number;
  difficulty: number;
  description: string;
}

export type Objective = "domination60" | "domination80" | "domination100" | "capital" | "mission";

/** Territory allocation systems (manual, Chapter 7). */
export type Allocation = "random" | "grab" | "election";

/** Turn structure (manual, Chapter 5 vs Chapter 9): sequential turns, or every commander acting at once. */
export type TurnStyle = "classic" | "sameTime";

/** Live state of a territory election auction (manual, Chapter 7). */
export interface ElectionState {
  /** Territory currently up for election. */
  territory: TerritoryId;
  /** Territories still awaiting their elections. */
  queue: TerritoryId[];
  /** Current highest bid in Election Points (0 = no bids yet). */
  bid: number;
  /** Player id holding the highest bid, if any. */
  highBidder: number | null;
  /** Player ids who have withdrawn from the current auction. */
  passed: number[];
  /** Remaining Election Points per player. */
  points: number[];
  /** Territories whose one-time influence has already been spent. */
  influenceUsed: TerritoryId[];
}

/** I-Com alliance levels (manual, Chapter 9). */
export type AllianceLevel = 1 | 2 | 3;

export interface Alliance {
  a: number;
  b: number;
  level: AllianceLevel;
  /**
   * Classic RISK (manual, Ch. 9 "I-Com"): a pact "lasts for the duration of
   * the current player's turn. At the end of the recipient's next turn, the
   * alliance is deemed over." `expiresAfterPlayerId` is the recipient (`b`);
   * the pact lapses right after that player's turn ends in round
   * `expiresAfterRound`. Same Time RISK pacts instead always expire at the
   * end of the round they were forged in regardless of these fields — see
   * `finishSameTimeRound`, which is why they're left at -1/the forge round.
   */
  expiresAfterPlayerId: number;
  expiresAfterRound: number;
  /**
   * Level II pacts forbid attacking the ally's territories, but the manual
   * grants one exception: "a single attack into an insignificant territory
   * for RISK card purposes." This flags once that one-time allowance has
   * been spent for the life of this pact; a further attack breaks it.
   */
  insignificantAttackUsed?: boolean;
}

/** An AI general's alliance offer awaiting the human commander's reply. */
export interface PendingProposal {
  from: number;
  to: number;
  level: AllianceLevel;
}

/** Per-round census used for the post-game statistics graph (manual, Chapter 9). */
export interface TurnSnapshot {
  turn: number;
  /** Indexed by player id. */
  counts: { territories: number; troops: number }[];
}

/** RISK II card trading rule sets (manual, Chapter 8). */
export type CardRule = "ascending" | "ascendingByOne" | "setValue";

export type CardType = "infantry" | "cavalry" | "artillery" | "wild";

export interface RiskCard {
  id: string;
  type: CardType;
  territory: TerritoryId | null;
}

export type Mission =
  | { kind: "conquerContinents"; continents: [ContinentId, ContinentId] }
  | { kind: "occupyTerritoryCount"; count: number }
  | { kind: "occupyFortified"; count: number; minArmies: number }
  | { kind: "destroyPlayer"; targetPlayerId: number; fallbackCount: number }
  /** Same Time Mission 3 (manual, Chapter 6): hold a continent + presence in every other continent. */
  | { kind: "continentPlusPresence"; continent: ContinentId }
  /** Same Time Mission 5: hold a continent + N other territories (need not be connected to it). */
  | { kind: "continentPlusConnected"; continent: ContinentId; count: number }
  /** Same Time Mission 6: hold a continent + 3 specific named territories elsewhere. */
  | { kind: "continentPlusNamed"; continent: ContinentId; territories: [TerritoryId, TerritoryId, TerritoryId] };

export interface PlayerSetup {
  name: string;
  colorIdx: number;
  isHuman: boolean;
  generalId: GeneralId | null;
}

export interface GameSetup {
  players: PlayerSetup[];
  objective: Objective;
  useExtraTerritories: boolean;
  /** Card trading rule set; older saves may miss it (treated as "ascending"). */
  cardRule?: CardRule;
  /** Territory allocation system; older saves may miss it (treated as "random"). */
  allocation?: Allocation;
  /** RISK II Tournament game number (1–16) when playing a tournament battle. */
  tournamentGame?: number;
  /** Turn structure; older saves may miss it (treated as "classic"). */
  turnStyle?: TurnStyle;
  /** Same Time only: caps armies placed per territory per round (manual, Chapter 9). */
  restrictedReinforcement?: boolean;
}

export interface PlayerState {
  id: number;
  name: string;
  color: string;
  colorName: string;
  isHuman: boolean;
  generalId: GeneralId | null;
  alive: boolean;
  killedBy: number | null;
  cards: RiskCard[];
  capital: TerritoryId | null;
  mission: Mission | null;
  conqueredThisTurn: boolean;
  /** AI memory: resentment toward each rival (attacks, threats, betrayals). */
  grudges: Record<number, number>;
}

export interface TerritoryState {
  owner: number;
  armies: number;
}

export type GamePhase =
  | "territoryGrab"
  | "election"
  | "initialDeploy"
  | "chooseCapital"
  | "reinforcement"
  | "attack"
  | "fortify"
  | "sameTimeReinforce"
  | "sameTimeBattle"
  | "sameTimeMove"
  | "gameOver";

/** Same Time RISK's 5 army-size-keyed dice (manual, Ch. 9, "The 5 Battle Dice"). */
export type DiceTier = "white" | "yellow" | "orange" | "red" | "black";

/**
 * Die colour for battle-report display. Classic RISK dice are NOT
 * army-size-tiered — the manual (Ch. 9) fixes them by role: "The Attacking
 * Player: The 3 Red Dice" / "The Defending Player: The 2 Blue Dice",
 * regardless of how many battalions are committed. Same Time RISK is the
 * one that colours dice by committed army size via `DiceTier`.
 */
export type DieColor = DiceTier | "classicAttack" | "classicDefend";

/** One dice exchange within a battle — the unit the battle view steps through on each tap. */
export interface BattleRoundResult {
  attackerRolls: number[];
  defenderRolls: number[];
  attackerLosses: number;
  defenderLosses: number;
  attackerTier?: DieColor;
  defenderTier?: DieColor;
}

export interface BattleReport {
  from: TerritoryId;
  to: TerritoryId;
  attacker: number;
  defender: number;
  attackerRolls: number[];
  defenderRolls: number[];
  attackerLosses: number;
  defenderLosses: number;
  rounds: number;
  conquered: boolean;
  attackerTier: DieColor;
  defenderTier: DieColor;
  /** Garrison sizes when the assault began — for the battle-scene plaques.
      Absent in reports saved before this field existed. */
  attackerArmiesBefore?: number;
  defenderArmiesBefore?: number;
  /** Every dice exchange fought in this battle, in order, so the battle view
      can reveal one at a time on tap instead of only the final round with an
      aggregate loss count. Absent on reports from older saves — the view
      falls back to a single combined round built from the aggregate fields. */
  roundResults?: BattleRoundResult[];
}

export interface PendingOccupy {
  from: TerritoryId;
  to: TerritoryId;
  min: number;
  max: number;
}

/** A queued Same Time attack order — locked in, then resolved simultaneously with every rival's orders. */
export interface AttackOrder {
  id: string;
  player: number;
  from: TerritoryId;
  to: TerritoryId;
  count: number;
  /** Pre-declared follow-on target (manual's "surge attack") — pressed only if this order wins with survivors to spare. */
  surgeTo: TerritoryId | null;
}

/** A queued Same Time tactical transfer between two of a player's own linked territories. */
export interface TacticalOrder {
  id: string;
  player: number;
  from: TerritoryId;
  to: TerritoryId;
  count: number;
}

/** Live state of a Same Time round — reinforcements, staged orders, and battle playback (manual, Chapter 9). */
export interface SameTimeState {
  /** Reinforcements left to place this round, indexed by player id. */
  reinforcementsRemaining: number[];
  /** This round's placements per player, so each can undo before readying up. */
  deployLog: DeployLogEntry[][];
  /** Players who have confirmed their reinforcement placements this round. */
  readyReinforce: boolean[];
  /** Queued attack orders awaiting simultaneous resolution. */
  orders: AttackOrder[];
  /** Players who have confirmed their attack orders this round. */
  readyBattle: boolean[];
  /** Resolved battle reports awaiting sequential playback, oldest first. */
  playback: BattleReport[];
  /** Queued tactical transfers awaiting simultaneous resolution. */
  moves: TacticalOrder[];
  /** Players who have confirmed their tactical moves this round. */
  readyMove: boolean[];
}

/** One reinforcement placement, kept so the player can undo before attacking. */
export interface DeployLogEntry {
  territory: TerritoryId;
  count: number;
}

export type LogTone = "info" | "gold" | "crimson" | "battle";

export interface LogEntry {
  id: number;
  turn: number;
  text: string;
  tone: LogTone;
}

export interface GameState {
  setup: GameSetup;
  players: PlayerState[];
  territories: Record<TerritoryId, TerritoryState>;
  activeIds: TerritoryId[];
  deck: RiskCard[];
  currentPlayer: number;
  phase: GamePhase;
  turn: number;
  reinforcementsRemaining: number;
  mustTrade: boolean;
  tradesCompleted: number;
  pendingOccupy: PendingOccupy | null;
  lastBattle: BattleReport | null;
  winner: number | null;
  winReason: string | null;
  battlesFought: number;
  awaitingHandoff: boolean;
  log: LogEntry[];
  logCounter: number;
  /** Standing I-Com alliances. */
  alliances: Alliance[];
  /** An AI general's offer awaiting the human's response (blocks the AI turn). */
  pendingProposal: PendingProposal | null;
  /** Opponent ids the current player has already messaged this turn. */
  proposalsMade: number[];
  /** Armies left to place per player during Territory Grab setup. */
  initialRemaining: number[];
  /** Live election auction, when allocation is "election". */
  election: ElectionState | null;
  /** Round-by-round census for the post-game statistics graph. */
  history: TurnSnapshot[];
  /** The one tactical move (manual, Chapter 5) has been spent this turn. */
  fortifyUsed: boolean;
  /** This turn's reinforcement placements, undoable until the attack begins. */
  deployLog: DeployLogEntry[];
  /** Same Time round state; null in Classic games. */
  sameTime: SameTimeState | null;
  /** Same Time only: players who won a simultaneous draw together (manual, Chapter 9). Null for a solo winner. */
  coWinners: number[] | null;
  /** Capital RISK: capitals stay secret (manual, Chapter 6) until every army is placed and every capital chosen. */
  capitalsRevealed: boolean;
}

export type GameAction =
  | { type: "CLAIM_TERRITORY"; territory: TerritoryId }
  | { type: "PLACE_INITIAL"; territory: TerritoryId }
  | { type: "ELECTION_BID"; raise: 5 | 10 }
  | { type: "ELECTION_PASS" }
  | { type: "PROPOSE_ALLIANCE"; target: number; level: AllianceLevel }
  | { type: "SEND_THREAT"; target: number }
  | { type: "RESPOND_PROPOSAL"; accept: boolean }
  | { type: "CHOOSE_CAPITAL"; territory: TerritoryId }
  | { type: "TRADE_CARDS"; cardIds: string[] }
  | { type: "AUTO_TRADE" }
  | { type: "DEPLOY"; territory: TerritoryId; count: number }
  | { type: "UNDO_DEPLOY" }
  | { type: "ATTACK"; from: TerritoryId; to: TerritoryId; allOut: boolean }
  | { type: "OCCUPY"; count: number }
  | { type: "END_ATTACK" }
  | { type: "FORTIFY"; from: TerritoryId; to: TerritoryId; count: number }
  | { type: "END_TURN" }
  | { type: "ACKNOWLEDGE_HANDOFF" }
  // Same Time RISK — every action below acts on state.currentPlayer, which
  // rotates between not-yet-ready players within a round rather than a
  // single turn owner (manual, Chapter 9).
  | { type: "ST_READY_REINFORCE" }
  | { type: "ST_QUEUE_ATTACK"; from: TerritoryId; to: TerritoryId; count: number; surgeTo: TerritoryId | null }
  | { type: "ST_CANCEL_ATTACK"; orderId: string }
  | { type: "ST_READY_BATTLE" }
  | { type: "ST_ACK_PLAYBACK" }
  | { type: "ST_QUEUE_MOVE"; from: TerritoryId; to: TerritoryId; count: number }
  | { type: "ST_CANCEL_MOVE"; orderId: string }
  | { type: "ST_READY_MOVE" };

export const PLAYER_COLORS: { hex: string; name: string }[] = [
  { hex: "#e63333", name: "Red" },
  { hex: "#3366e6", name: "Blue" },
  { hex: "#33bf4d", name: "Green" },
  { hex: "#f2cc1a", name: "Yellow" },
  { hex: "#9933cc", name: "Purple" },
  { hex: "#f2801a", name: "Orange" },
  { hex: "#1acccc", name: "Cyan" },
  { hex: "#f24d99", name: "Pink" },
];

export const OBJECTIVE_INFO: Record<Objective, { name: string; description: string }> = {
  domination60: { name: "60% Domination", description: "Occupy 25 of 42 territories (29 of 48) to win." },
  domination80: { name: "80% Domination", description: "Occupy 33 of 42 territories (38 of 48) to win." },
  domination100: { name: "World Domination", description: "Conquer every territory on the map." },
  capital: {
    name: "Capital RISK",
    description: "Choose a capital, hold it, and capture 2–4 enemy capitals (by player count).",
  },
  mission: { name: "Mission RISK", description: "Complete your secret mission before your rivals." },
};

export const ALLOCATION_INFO: Record<Allocation, { name: string; description: string }> = {
  random: {
    name: "Random Allocation",
    description: "Territories are dealt evenly and starting armies are placed automatically.",
  },
  grab: {
    name: "Territory Grab",
    description: "Commanders take turns claiming territories, then muster their starting armies by hand.",
  },
  election: {
    name: "Election",
    description:
      "Bid Election Points (~100 per territory) territory by territory. Neighbouring holdings lend one-time influence; unused points trade for battalions at 50 apiece.",
  },
};

export const TURN_STYLE_INFO: Record<TurnStyle, { name: string; description: string }> = {
  classic: {
    name: "Classic RISK",
    description: "Commanders act one at a time, in turn order.",
  },
  sameTime: {
    name: "Same Time RISK",
    description:
      "Every commander stages reinforcements and attacks in secret, then the round resolves for everyone at once.",
  },
};

export const ALLIANCE_LEVEL_INFO: Record<AllianceLevel, { name: string; description: string }> = {
  1: {
    name: "Level I Pact",
    description: "Neither side attacks the other's wholly-owned continents or largest connected empire.",
  },
  2: {
    name: "Level II Pact",
    description: "Neither side attacks the other's territories.",
  },
  3: {
    name: "Level III Pact",
    description: "Total non-aggression — no attacks of any kind. Break it and suffer the consequences.",
  },
};

export const CARD_RULE_INFO: Record<CardRule, { name: string; description: string }> = {
  ascending: {
    name: "Ascending Armies",
    description: "Sets are worth 4, 6, 8, 10, 12, 15 armies — then +5 for every set thereafter.",
  },
  ascendingByOne: {
    name: "Ascending by One",
    description: "The first set is worth 4 armies; every set thereafter is worth one more.",
  },
  setValue: {
    name: "Set Value",
    description: "3 Infantry = 4, 3 Cavalry = 6, 3 Artillery = 8, one of each = 10 armies.",
  },
};
