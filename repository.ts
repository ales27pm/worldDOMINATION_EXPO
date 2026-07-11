import type { Database } from "sql.js";

import { normalizeState } from "@/game/engine";
import type { GameState, Objective } from "@/game/types";

import { getDb, persistDb } from "./sqlite";

export const SAVE_VERSION = 1;

export interface SaveSummary {
  turn: number;
  objective: Objective;
  playerNames: string[];
  updatedAt: string;
}

export interface CampaignRecord {
  id: number;
  winnerName: string;
  winnerColor: string;
  winnerIsHuman: boolean;
  objective: Objective;
  winReason: string | null;
  turns: number;
  playerCount: number;
  territoryCount: number;
  battles: number;
  completedAt: string;
}

export interface CommanderRecord {
  name: string;
  isHuman: boolean;
  games: number;
  wins: number;
}

export interface TournamentProgress {
  name: string;
  currentGame: number;
  totalPoints: number;
}

export interface HighScoreRecord {
  name: string;
  isHuman: boolean;
  score: number;
  gamesCompleted: number;
}

type Row = Record<string, unknown>;

function firstRow(db: Database, sql: string, params: (string | number)[] = []): Row | null {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    return stmt.step() ? (stmt.getAsObject() as Row) : null;
  } finally {
    stmt.free();
  }
}

function allRows(db: Database, sql: string, params: (string | number)[] = []): Row[] {
  const stmt = db.prepare(sql);
  const rows: Row[] = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Row);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

function parseNames(raw: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(parsed) ? parsed.map((n) => String(n)) : [];
  } catch {
    return [];
  }
}

function looksLikeGameState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.turn === "number" &&
    typeof v.phase === "string" &&
    Array.isArray(v.players) &&
    Array.isArray(v.activeIds) &&
    typeof v.territories === "object" &&
    v.territories !== null
  );
}

/** Upsert the single autosave slot with the full serialized campaign. */
export async function saveCampaignState(state: GameState): Promise<SaveSummary> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  const playerNames = state.players.filter((p) => p.alive).map((p) => p.name);
  db.run(
    `INSERT INTO save_slot (id, state_json, turn, objective, player_names, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       state_json = excluded.state_json,
       turn = excluded.turn,
       objective = excluded.objective,
       player_names = excluded.player_names,
       updated_at = excluded.updated_at`,
    [JSON.stringify({ version: SAVE_VERSION, state }), state.turn, state.setup.objective, JSON.stringify(playerNames), updatedAt],
  );
  await persistDb();
  return { turn: state.turn, objective: state.setup.objective, playerNames, updatedAt };
}

/** Lightweight metadata about the autosave, for the main menu. */
export async function loadSaveSummary(): Promise<SaveSummary | null> {
  const db = await getDb();
  const row = firstRow(db, `SELECT turn, objective, player_names, updated_at FROM save_slot WHERE id = 1`);
  if (!row) return null;
  return {
    turn: Number(row.turn ?? 1),
    objective: String(row.objective ?? "domination100") as Objective,
    playerNames: parseNames(row.player_names),
    updatedAt: String(row.updated_at ?? ""),
  };
}

/** Restore the full saved campaign state, or null if absent/incompatible. */
export async function loadSavedState(): Promise<GameState | null> {
  const db = await getDb();
  const row = firstRow(db, `SELECT state_json FROM save_slot WHERE id = 1`);
  if (!row) return null;
  try {
    const parsed: unknown = JSON.parse(String(row.state_json ?? ""));
    if (typeof parsed !== "object" || parsed === null) return null;
    const wrapper = parsed as { version?: unknown; state?: unknown };
    if (wrapper.version !== SAVE_VERSION || !looksLikeGameState(wrapper.state)) return null;
    return normalizeState(wrapper.state);
  } catch (error) {
    console.warn("Saved campaign could not be parsed.", error);
    return null;
  }
}

/** Remove the autosave slot (campaign abandoned or concluded). */
export async function deleteSave(): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM save_slot WHERE id = 1`);
  await persistDb();
}

/** Archive a finished campaign and update lifetime commander statistics. */
export async function recordCompletedCampaign(state: GameState): Promise<void> {
  if (state.winner === null) return;
  const winner = state.players[state.winner];
  if (!winner) return;
  const db = await getDb();
  db.run(
    `INSERT INTO campaigns
       (winner_name, winner_color, winner_is_human, objective, win_reason, turns, player_count, territory_count, battles, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      winner.name,
      winner.color,
      winner.isHuman ? 1 : 0,
      state.setup.objective,
      state.winReason ?? null,
      state.turn,
      state.players.length,
      state.activeIds.length,
      state.battlesFought,
      new Date().toISOString(),
    ],
  );
  for (const player of state.players) {
    db.run(
      `INSERT INTO commander_stats (name, is_human, games, wins)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(name) DO UPDATE SET
         games = games + 1,
         wins = wins + excluded.wins,
         is_human = excluded.is_human`,
      [player.name, player.isHuman ? 1 : 0, player.id === state.winner ? 1 : 0],
    );
  }
  db.run(`DELETE FROM save_slot WHERE id = 1`);
  await persistDb();
}

/** Most recent campaigns first. */
export async function listCampaigns(): Promise<CampaignRecord[]> {
  const db = await getDb();
  const rows = allRows(
    db,
    `SELECT id, winner_name, winner_color, winner_is_human, objective, win_reason, turns, player_count, territory_count, battles, completed_at
     FROM campaigns ORDER BY id DESC LIMIT 100`,
  );
  return rows.map((row) => ({
    id: Number(row.id ?? 0),
    winnerName: String(row.winner_name ?? "Unknown"),
    winnerColor: String(row.winner_color ?? "#e63333"),
    winnerIsHuman: Number(row.winner_is_human ?? 0) === 1,
    objective: String(row.objective ?? "domination100") as Objective,
    winReason: row.win_reason === null || row.win_reason === undefined ? null : String(row.win_reason),
    turns: Number(row.turns ?? 0),
    playerCount: Number(row.player_count ?? 0),
    territoryCount: Number(row.territory_count ?? 0),
    battles: Number(row.battles ?? 0),
    completedAt: String(row.completed_at ?? ""),
  }));
}

/** The single in-progress tournament, if any. */
export async function getTournamentProgress(): Promise<TournamentProgress | null> {
  const db = await getDb();
  const row = firstRow(db, `SELECT campaign_name, current_game, total_points FROM tournament WHERE id = 1`);
  if (!row) return null;
  return {
    name: String(row.campaign_name ?? "You"),
    currentGame: Number(row.current_game ?? 1),
    totalPoints: Number(row.total_points ?? 0),
  };
}

/** Upsert the tournament progress row. */
export async function saveTournamentProgress(progress: TournamentProgress): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT INTO tournament (id, campaign_name, current_game, total_points, updated_at)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       campaign_name = excluded.campaign_name,
       current_game = excluded.current_game,
       total_points = excluded.total_points,
       updated_at = excluded.updated_at`,
    [progress.name, progress.currentGame, progress.totalPoints, new Date().toISOString()],
  );
  await persistDb();
}

/** Remove the tournament progress row (concluded or abandoned). */
export async function clearTournamentProgress(): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM tournament WHERE id = 1`);
  await persistDb();
}

/** The 12 seeded AI slots the player must fight their way onto (manual, Chapter 9). */
const SEED_HIGH_SCORES: [string, number, number][] = [
  ["Wellington", 1310, 16],
  ["Bonaparte", 1255, 16],
  ["Baird", 1140, 14],
  ["Vauban", 1010, 13],
  ["Taupin", 905, 12],
  ["Marmont", 830, 11],
  ["Mackenzie", 720, 10],
  ["Barbacena", 640, 9],
  ["Campbell", 545, 8],
  ["Sherbrooke", 450, 7],
  ["Spencer", 355, 6],
  ["D'Erlon", 260, 5],
];

async function seedHighScoresIfEmpty(db: Database): Promise<void> {
  const row = firstRow(db, `SELECT COUNT(*) AS n FROM high_scores`);
  if (Number(row?.n ?? 0) > 0) return;
  const now = new Date().toISOString();
  for (const [name, score, games] of SEED_HIGH_SCORES) {
    db.run(
      `INSERT INTO high_scores (name, is_human, score, games_completed, recorded_at) VALUES (?, 0, ?, ?, ?)`,
      [name, score, games, now],
    );
  }
  await persistDb();
}

/** Record a finished tournament run, keeping only the top 12 slots. */
export async function submitHighScore(
  name: string,
  score: number,
  gamesCompleted: number,
): Promise<void> {
  const db = await getDb();
  await seedHighScoresIfEmpty(db);
  db.run(
    `INSERT INTO high_scores (name, is_human, score, games_completed, recorded_at) VALUES (?, 1, ?, ?, ?)`,
    [name, score, gamesCompleted, new Date().toISOString()],
  );
  db.run(
    `DELETE FROM high_scores WHERE id NOT IN (SELECT id FROM high_scores ORDER BY score DESC, id ASC LIMIT 12)`,
  );
  await persistDb();
}

/** The 12-slot tournament high score table, best first. */
export async function listHighScores(): Promise<HighScoreRecord[]> {
  const db = await getDb();
  await seedHighScoresIfEmpty(db);
  const rows = allRows(
    db,
    `SELECT name, is_human, score, games_completed FROM high_scores ORDER BY score DESC, id ASC LIMIT 12`,
  );
  return rows.map((row) => ({
    name: String(row.name ?? "Unknown"),
    isHuman: Number(row.is_human ?? 0) === 1,
    score: Number(row.score ?? 0),
    gamesCompleted: Number(row.games_completed ?? 0),
  }));
}

/** Lifetime leaderboard, most victorious first. */
export async function listCommanderStats(): Promise<CommanderRecord[]> {
  const db = await getDb();
  const rows = allRows(db, `SELECT name, is_human, games, wins FROM commander_stats ORDER BY wins DESC, games DESC, name ASC`);
  return rows.map((row) => ({
    name: String(row.name ?? "Unknown"),
    isHuman: Number(row.is_human ?? 0) === 1,
    games: Number(row.games ?? 0),
    wins: Number(row.wins ?? 0),
  }));
}
