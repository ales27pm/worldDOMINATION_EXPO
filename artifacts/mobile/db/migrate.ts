/**
 * One-time migration of the pre-SQLite AsyncStorage saves into the database.
 *
 * The legacy keys (worlddomination.savegame / .records / .tournament) are
 * preserved untouched; after migration the database is the source of truth.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeState } from '@/game/engine';
import type { GameState } from '@/game/types';

import {
  importLegacyRecords,
  saveTournamentProgress,
  saveCampaignState,
  loadSavedState,
} from './repository';
import { looksLikeGameState } from './types';
import type { LegacyGameRecord, TournamentSession } from './types';

const MIGRATED_KEY = 'worlddomination.dbMigrated';

const LEGACY_SAVE_KEY = 'worlddomination.savegame';
const LEGACY_RECORDS_KEY = 'worlddomination.records';
const LEGACY_TOURNAMENT_KEY = 'worlddomination.tournament';

let migration: Promise<void> | null = null;

/** Idempotent; safe to await from several contexts — runs at most once. */
export function migrateLegacyStorage(): Promise<void> {
  migration = migration ?? runMigration().catch(() => {});
  return migration;
}

async function runMigration(): Promise<void> {
  const done = await AsyncStorage.getItem(MIGRATED_KEY);
  if (done) return;

  // Saved campaign → save_slot (only when the database has no save already).
  try {
    const raw = await AsyncStorage.getItem(LEGACY_SAVE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (looksLikeGameState(parsed) && (await loadSavedState()) === null) {
        await saveCampaignState(normalizeState(parsed as GameState));
      }
    }
  } catch {
    // Corrupted legacy save — skip it.
  }

  // Records list → campaign archive + commander statistics.
  try {
    const raw = await AsyncStorage.getItem(LEGACY_RECORDS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await importLegacyRecords(parsed as LegacyGameRecord[]);
      }
    }
  } catch {
    // Corrupted legacy records — skip them.
  }

  // Tournament session → tournament table.
  try {
    const raw = await AsyncStorage.getItem(LEGACY_TOURNAMENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TournamentSession>;
      if (parsed && typeof parsed.humanName === 'string') {
        await saveTournamentProgress({
          humanName: parsed.humanName,
          currentGame: Number(parsed.currentGame ?? 0),
          totalPoints: Number(parsed.totalPoints ?? 0),
          records: Array.isArray(parsed.records) ? parsed.records : [],
          scoreSubmitted: parsed.scoreSubmitted === true,
        });
      }
    }
  } catch {
    // Corrupted legacy tournament — skip it.
  }

  await AsyncStorage.setItem(MIGRATED_KEY, '1');
}
