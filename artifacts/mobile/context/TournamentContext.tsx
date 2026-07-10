/**
 * TournamentContext — manages an in-progress tournament session.
 *
 * A session is created when the player starts the tournament, persisted to
 * AsyncStorage, and destroyed when they are eliminated or finish all 16 games.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TournamentResult } from '@/game/tournament';
import { TOURNAMENT_LENGTH } from '@/game/tournament';

const SAVE_KEY = 'worlddomination.tournament';

export interface TournamentGameRecord {
  gameIndex: number; // 0-based
  result: TournamentResult;
}

export interface TournamentSession {
  humanName: string;
  /** 0-based index of the game the player should play next (= results.length). */
  currentGame: number;
  totalPoints: number;
  records: TournamentGameRecord[];
}

interface TournamentContextValue {
  session: TournamentSession | null;
  loading: boolean;
  startTournament: (humanName: string) => void;
  recordResult: (result: TournamentResult) => void;
  endTournament: () => void;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<TournamentSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SAVE_KEY)
      .then((raw) => {
        if (raw) setSession(JSON.parse(raw) as TournamentSession);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((s: TournamentSession | null) => {
    if (s) {
      AsyncStorage.setItem(SAVE_KEY, JSON.stringify(s)).catch(() => {});
    } else {
      AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
    }
  }, []);

  const startTournament = useCallback(
    (humanName: string) => {
      const s: TournamentSession = {
        humanName: humanName.trim() || 'Commander',
        currentGame: 0,
        totalPoints: 0,
        records: [],
      };
      setSession(s);
      persist(s);
    },
    [persist],
  );

  const recordResult = useCallback(
    (result: TournamentResult) => {
      setSession((prev) => {
        if (!prev) return prev;
        const records = [
          ...prev.records,
          { gameIndex: prev.currentGame, result },
        ];
        const next: TournamentSession = {
          ...prev,
          records,
          currentGame: prev.currentGame + 1,
          totalPoints: prev.totalPoints + result.points,
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const endTournament = useCallback(() => {
    setSession(null);
    persist(null);
  }, [persist]);

  return (
    <TournamentContext.Provider
      value={{ session, loading, startTournament, recordResult, endTournament }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be inside TournamentProvider');
  return ctx;
}

/** True if the session is over (eliminated or completed all games). */
export function sessionEnded(session: TournamentSession): boolean {
  if (session.currentGame >= TOURNAMENT_LENGTH) return true;
  const last = session.records[session.records.length - 1];
  return last?.result.eliminated === true;
}
