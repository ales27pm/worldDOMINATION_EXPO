/**
 * On-device SQLite repository (iOS / Android) — schema and semantics mirror
 * web/src/db/repository.ts (sql.js), stored via expo-sqlite.
 *
 * The tournament table carries two mobile-only columns (records_json,
 * score_submitted) so the in-run per-game ledger survives restarts.
 *
 * Metro resolves this file on native; `repository.ts` (an AsyncStorage JSON
 * store with the identical API) is the Expo-web fallback used by the preview.
 */
import * as SQLite from 'expo-sqlite';

import { normalizeState } from '@/game/engine';
import type { GameState, Objective } from '@/game/types';

import { SAVE_VERSION, SEED_HIGH_SCORES, looksLikeGameState } from './types';
import type {
  CampaignRecord,
  CommanderRecord,
  HighScoreRecord,
  LegacyGameRecord,
  SaveSummary,
  TournamentSession,
} from './types';

export * from './types';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS save_slot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state_json TEXT NOT NULL,
  turn INTEGER NOT NULL,
  objective TEXT NOT NULL,
  player_names TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  winner_name TEXT NOT NULL,
  winner_color TEXT NOT NULL,
  winner_is_human INTEGER NOT NULL,
  objective TEXT NOT NULL,
  win_reason TEXT,
  turns INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  territory_count INTEGER NOT NULL,
  battles INTEGER NOT NULL,
  completed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS commander_stats (
  name TEXT PRIMARY KEY,
  is_human INTEGER NOT NULL,
  games INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tournament (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  campaign_name TEXT NOT NULL,
  current_game INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  records_json TEXT NOT NULL DEFAULT '[]',
  score_submitted INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS high_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_human INTEGER NOT NULL,
  score INTEGER NOT NULL,
  games_completed INTEGER NOT NULL,
  recorded_at TEXT NOT NULL
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('worlddomination.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(SCHEMA);
  return db;
}

function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise = dbPromise ?? openDatabase();
  return dbPromise;
}

type Row = Record<string, unknown>;

function parseNames(raw: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? '[]'));
    return Array.isArray(parsed) ? parsed.map((n) => String(n)) : [];
  } catch {
    return [];
  }
}

// ── Saved campaign ──────────────────────────────────────────────────────────

/** Upsert the single autosave slot with the full serialized campaign. */
export async function saveCampaignState(state: GameState): Promise<SaveSummary> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  const playerNames = state.players.filter((p) => p.alive).map((p) => p.name);
  await db.runAsync(
    `INSERT INTO save_slot (id, state_json, turn, objective, player_names, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       state_json = excluded.state_json,
       turn = excluded.turn,
       objective = excluded.objective,
       player_names = excluded.player_names,
       updated_at = excluded.updated_at`,
    [
      JSON.stringify({ version: SAVE_VERSION, state }),
      state.turn,
      state.setup.objective,
      JSON.stringify(playerNames),
      updatedAt,
    ],
  );
  return { turn: state.turn, objective: state.setup.objective, playerNames, updatedAt };
}

/** Lightweight metadata about the autosave, for the main menu. */
export async function loadSaveSummary(): Promise<SaveSummary | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    `SELECT turn, objective, player_names, updated_at FROM save_slot WHERE id = 1`,
  );
  if (!row) return null;
  return {
    turn: Number(row.turn ?? 1),
    objective: String(row.objective ?? 'domination100') as Objective,
    playerNames: parseNames(row.player_names),
    updatedAt: String(row.updated_at ?? ''),
  };
}

/** Restore the full saved campaign state, or null if absent/incompatible. */
export async function loadSavedState(): Promise<GameState | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(`SELECT state_json FROM save_slot WHERE id = 1`);
  if (!row) return null;
  try {
    const parsed: unknown = JSON.parse(String(row.state_json ?? ''));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const wrapper = parsed as { version?: unknown; state?: unknown };
    if (wrapper.version !== SAVE_VERSION || !looksLikeGameState(wrapper.state)) return null;
    return normalizeState(wrapper.state);
  } catch {
    return null;
  }
}

/** Remove the autosave slot (campaign abandoned or concluded). */
export async function deleteSave(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM save_slot WHERE id = 1`);
}

// ── Campaign archive & commander statistics ─────────────────────────────────

/** Archive a finished campaign and update lifetime commander statistics. */
export async function recordCompletedCampaign(state: GameState): Promise<void> {
  if (state.winner === null) return;
  const winner = state.players[state.winner];
  if (!winner) return;
  const db = await getDb();
  await db.runAsync(
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
    await db.runAsync(
      `INSERT INTO commander_stats (name, is_human, games, wins)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(name) DO UPDATE SET
         games = games + 1,
         wins = wins + excluded.wins,
         is_human = excluded.is_human`,
      [player.name, player.isHuman ? 1 : 0, player.id === state.winner ? 1 : 0],
    );
  }
  await db.runAsync(`DELETE FROM save_slot WHERE id = 1`);
}

/** Most recent campaigns first. */
export async function listCampaigns(): Promise<CampaignRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT id, winner_name, winner_color, winner_is_human, objective, win_reason, turns, player_count, territory_count, battles, completed_at
     FROM campaigns ORDER BY id DESC LIMIT 100`,
  );
  return rows.map((row) => ({
    id: Number(row.id ?? 0),
    winnerName: String(row.winner_name ?? 'Unknown'),
    winnerColor: String(row.winner_color ?? '#e63333'),
    winnerIsHuman: Number(row.winner_is_human ?? 0) === 1,
    objective: String(row.objective ?? 'domination100') as Objective,
    winReason: row.win_reason === null || row.win_reason === undefined ? null : String(row.win_reason),
    turns: Number(row.turns ?? 0),
    playerCount: Number(row.player_count ?? 0),
    territoryCount: Number(row.territory_count ?? 0),
    battles: Number(row.battles ?? 0),
    completedAt: String(row.completed_at ?? ''),
  }));
}

/** Lifetime leaderboard, most victorious first. */
export async function listCommanderStats(): Promise<CommanderRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT name, is_human, games, wins FROM commander_stats ORDER BY wins DESC, games DESC, name ASC`,
  );
  return rows.map((row) => ({
    name: String(row.name ?? 'Unknown'),
    isHuman: Number(row.is_human ?? 0) === 1,
    games: Number(row.games ?? 0),
    wins: Number(row.wins ?? 0),
  }));
}

// ── Tournament progress ──────────────────────────────────────────────────────

/** The single in-progress tournament session, if any. */
export async function getTournamentProgress(): Promise<TournamentSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    `SELECT campaign_name, current_game, total_points, records_json, score_submitted FROM tournament WHERE id = 1`,
  );
  if (!row) return null;
  let records: TournamentSession['records'] = [];
  try {
    const parsed: unknown = JSON.parse(String(row.records_json ?? '[]'));
    if (Array.isArray(parsed)) records = parsed as TournamentSession['records'];
  } catch {
    records = [];
  }
  return {
    humanName: String(row.campaign_name ?? 'Commander'),
    currentGame: Number(row.current_game ?? 0),
    totalPoints: Number(row.total_points ?? 0),
    records,
    scoreSubmitted: Number(row.score_submitted ?? 0) === 1,
  };
}

/** Upsert the tournament progress row. */
export async function saveTournamentProgress(session: TournamentSession): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO tournament (id, campaign_name, current_game, total_points, records_json, score_submitted, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       campaign_name = excluded.campaign_name,
       current_game = excluded.current_game,
       total_points = excluded.total_points,
       records_json = excluded.records_json,
       score_submitted = excluded.score_submitted,
       updated_at = excluded.updated_at`,
    [
      session.humanName,
      session.currentGame,
      session.totalPoints,
      JSON.stringify(session.records),
      session.scoreSubmitted ? 1 : 0,
      new Date().toISOString(),
    ],
  );
}

/** Remove the tournament progress row (concluded or abandoned). */
export async function clearTournamentProgress(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tournament WHERE id = 1`);
}

// ── High scores ──────────────────────────────────────────────────────────────

async function seedHighScoresIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<Row>(`SELECT COUNT(*) AS n FROM high_scores`);
  if (Number(row?.n ?? 0) > 0) return;
  const now = new Date().toISOString();
  for (const [name, score, games] of SEED_HIGH_SCORES) {
    await db.runAsync(
      `INSERT INTO high_scores (name, is_human, score, games_completed, recorded_at) VALUES (?, 0, ?, ?, ?)`,
      [name, score, games, now],
    );
  }
}

/** Record a finished tournament run, keeping only the top 12 slots. */
export async function submitHighScore(
  name: string,
  score: number,
  gamesCompleted: number,
): Promise<void> {
  const db = await getDb();
  await seedHighScoresIfEmpty(db);
  await db.runAsync(
    `INSERT INTO high_scores (name, is_human, score, games_completed, recorded_at) VALUES (?, 1, ?, ?, ?)`,
    [name, score, gamesCompleted, new Date().toISOString()],
  );
  await db.runAsync(
    `DELETE FROM high_scores WHERE id NOT IN (SELECT id FROM high_scores ORDER BY score DESC, id ASC LIMIT 12)`,
  );
}

/** The 12-slot tournament high score table, best first. */
export async function listHighScores(): Promise<HighScoreRecord[]> {
  const db = await getDb();
  await seedHighScoresIfEmpty(db);
  const rows = await db.getAllAsync<Row>(
    `SELECT name, is_human, score, games_completed FROM high_scores ORDER BY score DESC, id ASC LIMIT 12`,
  );
  return rows.map((row) => ({
    name: String(row.name ?? 'Unknown'),
    isHuman: Number(row.is_human ?? 0) === 1,
    score: Number(row.score ?? 0),
    gamesCompleted: Number(row.games_completed ?? 0),
  }));
}

// ── Legacy import ────────────────────────────────────────────────────────────

/** One-time import of pre-SQLite AsyncStorage records into the archive. */
export async function importLegacyRecords(records: LegacyGameRecord[]): Promise<void> {
  const db = await getDb();
  for (const r of [...records].reverse()) {
    const date = new Date(r.date);
    const completedAt = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    await db.runAsync(
      `INSERT INTO campaigns
         (winner_name, winner_color, winner_is_human, objective, win_reason, turns, player_count, territory_count, battles, completed_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 0, ?)`,
      [
        r.won ? r.playerName : 'Enemy Command',
        r.won ? '#debe73' : '#8a2f2b',
        r.won ? 1 : 0,
        r.objective,
        r.turns,
        r.totalPlayers,
        r.territories > 42 ? 48 : 42,
        completedAt,
      ],
    );
    await db.runAsync(
      `INSERT INTO commander_stats (name, is_human, games, wins)
       VALUES (?, 1, 1, ?)
       ON CONFLICT(name) DO UPDATE SET
         games = games + 1,
         wins = wins + excluded.wins,
         is_human = 1`,
      [r.playerName, r.won ? 1 : 0],
    );
  }
}
