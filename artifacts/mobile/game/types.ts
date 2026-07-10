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
  /** Alliance lapses when a new round begins beyond this round number. */
  expiresOnRound: number;
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
  | { kind: "destroyPlayer"; targetPlayerId: number; fallbackCount: number };

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
  | "gameOver";

export type DiceTier = "white" | "yellow" | "green" | "red" | "black";

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
  attackerTier: DiceTier;
  defenderTier: DiceTier;
}

export interface PendingOccupy {
  from: TerritoryId;
  to: TerritoryId;
  min: number;
  max: number;
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
  | { type: "ATTACK"; from: TerritoryId; to: TerritoryId; allOut: boolean }
  | { type: "OCCUPY"; count: number }
  | { type: "END_ATTACK" }
  | { type: "FORTIFY"; from: TerritoryId; to: TerritoryId; count: number }
  | { type: "END_TURN" }
  | { type: "ACKNOWLEDGE_HANDOFF" };

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
