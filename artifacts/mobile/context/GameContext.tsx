import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createGame, gameReducer, normalizeState } from '../game/engine';
import type { GameAction, GameSetup, GameState } from '../game/types';

const SAVE_KEY = 'worlddomination.savegame';
const RECORDS_KEY = 'worlddomination.records';

export interface GameRecord {
  id: string;
  date: string;
  playerName: string;
  won: boolean;
  turns: number;
  territories: number;
  totalPlayers: number;
  objective: string;
}

interface GameContextValue {
  game: GameState | null;
  startGame: (setup: GameSetup) => void;
  dispatch: (action: GameAction) => void;
  abandonGame: () => void;
  records: GameRecord[];
  loadingSave: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loadingSave, setLoadingSave] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved game and records on mount
  useEffect(() => {
    async function load() {
      try {
        const [savedGame, savedRecords] = await Promise.all([
          AsyncStorage.getItem(SAVE_KEY),
          AsyncStorage.getItem(RECORDS_KEY),
        ]);
        if (savedGame) {
          const parsed = JSON.parse(savedGame) as GameState;
          setGame(normalizeState(parsed));
        }
        if (savedRecords) {
          setRecords(JSON.parse(savedRecords) as GameRecord[]);
        }
      } catch {
        // Corrupted save — ignore
      } finally {
        setLoadingSave(false);
      }
    }
    void load();
  }, []);

  // Auto-save whenever game changes (debounced)
  useEffect(() => {
    if (!game) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      AsyncStorage.setItem(SAVE_KEY, JSON.stringify(game)).catch(() => {});
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [game]);

  const startGame = useCallback((setup: GameSetup) => {
    const newGame = createGame(setup);
    setGame(newGame);
  }, []);

  const dispatch = useCallback((action: GameAction) => {
    setGame((prev) => {
      if (!prev) return prev;
      return gameReducer(prev, action);
    });
  }, []);

  const abandonGame = useCallback(async () => {
    if (game) {
      // Save a record if game is over
      if (game.phase === 'gameOver') {
        const human = game.players.find((p) => p.isHuman);
        if (human) {
          const record: GameRecord = {
            id: `${Date.now()}`,
            date: new Date().toLocaleDateString(),
            playerName: human.name,
            won: game.winner === human.id,
            turns: game.turn,
            territories: game.activeIds.filter((id) => game.territories[id].owner === human.id).length,
            totalPlayers: game.players.length,
            objective: game.setup.objective,
          };
          const newRecords = [record, ...records].slice(0, 50);
          setRecords(newRecords);
          await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(newRecords)).catch(() => {});
        }
      }
    }
    setGame(null);
    await AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
  }, [game, records]);

  return (
    <GameContext.Provider value={{ game, startGame, dispatch, abandonGame, records, loadingSave }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
