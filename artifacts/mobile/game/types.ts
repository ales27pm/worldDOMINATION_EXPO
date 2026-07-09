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
export type Allocation = "random" | "grab" | "election";
export type AllianceLevel = 1 | 2 | 3;
export type CardRule = "ascending" | "ascendingByOne" | "setValue";
export type CardType = "infantry" | "cavalry" | "artillery" | "wild";
export type DiceTier = "white" | "yellow" | "green" | "red" | "black";
export type GamePhase =
  | "territoryGrab"
  | "election"
  | "initialDeploy"
  | "chooseCapital"
  | "reinforcement"
  | "attack"
  | "fortify"
  | "gameOver";
export type LogTone = "info" | "gold" | "crimson" | "battle";

export interface ElectionState {
  territory: TerritoryId;
  queue: TerritoryId[];
  bid: number;
  highBidder: number | null;
  passed: number[];
  points: number[];
  influenceUsed: TerritoryId[];
}

export interface Alliance {
  a: number;
  b: number;
  level: AllianceLevel;
  expiresOnRound: number;
}

export interface PendingProposal {
  from: number;
  to: number;
  level: AllianceLevel;
}

export interface TurnSnapshot {
  turn: number;
  counts: { territories: number; troops: number }[];
}

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
  cardRule?: CardRule;
  allocation?: Allocation;
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
  grudges: Record<number, number>;
}

export interface TerritoryState {
  owner: number;
  armies: number;
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
  attackerTier: DiceTier;
  defenderTier: DiceTier;
}

export interface PendingOccupy {
  from: TerritoryId;
  to: TerritoryId;
  min: number;
  max: number;
}

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
  alliances: Alliance[];
  pendingProposal: PendingProposal | null;
  proposalsMade: number[];
  initialRemaining: number[];
  election: ElectionState | null;
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

// ─── Constants used by the engine ────────────────────────────────────────────

export const PLAYER_COLORS: { hex: string; name: string }[] = [
  { hex: "#c0392b", name: "Red" },
  { hex: "#2980b9", name: "Blue" },
  { hex: "#27ae60", name: "Green" },
  { hex: "#f39c12", name: "Gold" },
  { hex: "#8e44ad", name: "Purple" },
  { hex: "#16a085", name: "Teal" },
  { hex: "#e67e22", name: "Orange" },
  { hex: "#c0392b", name: "Crimson" },
];

export const OBJECTIVE_INFO: Record<Objective, { name: string }> = {
  domination60: { name: "60% Domination" },
  domination80: { name: "80% Domination" },
  domination100: { name: "World Domination" },
  capital: { name: "Capital RISK" },
  mission: { name: "Secret Mission" },
};

export const ALLIANCE_LEVEL_INFO: Record<AllianceLevel, { name: string }> = {
  1: { name: "Non-Aggression Pact" },
  2: { name: "Military Alliance" },
  3: { name: "Grand Alliance" },
};
