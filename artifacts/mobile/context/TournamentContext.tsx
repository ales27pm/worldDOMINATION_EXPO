/**
 * TournamentContext — manages an in-progress tournament session.
 *
 * A session is created when the player starts the tournament, persisted to
 * the on-device database, and destroyed when they resign or start a new run.
 * When a run concludes (eliminated or all 16 games played) the final score
 * is engraved in the 12-slot high-score ledger.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { migrateLegacyStorage } from '@/db/migrate';
import {
  clearTournamentProgress,
  getTournamentProgress,
  saveTournamentProgress,
  submitHighScore,
} from '@/db/repository';
import type { TournamentGameRecord, TournamentSession } from '@/db/types';
import type { TournamentResult } from '@/game/tournament';
import { TOURNAMENT_LENGTH } from '@/game/tournament';

export type { TournamentGameRecord, TournamentSession };

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
    async function load() {
      try {
        await migrateLegacyStorage();
        const stored = await getTournamentProgress();
        if (stored) setSession(stored);
      } catch {
        // Unreadable session — start fresh
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const persist = useCallback((s: TournamentSession | null) => {
    if (s) {
      saveTournamentProgress(s).catch(() => {});
    } else {
      clearTournamentProgress().catch(() => {});
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
      if (!session) return;
      const records: TournamentGameRecord[] = [
        ...session.records,
        { gameIndex: session.currentGame, result },
      ];
      let next: TournamentSession = {
        ...session,
        records,
        currentGame: session.currentGame + 1,
        totalPoints: session.totalPoints + result.points,
      };
      const ended = next.currentGame >= TOURNAMENT_LENGTH || result.eliminated;
      if (ended && !next.scoreSubmitted && next.totalPoints > 0) {
        next = { ...next, scoreSubmitted: true };
        const completed = result.eliminated
          ? Math.max(0, next.records.length - 1)
          : next.records.length;
        submitHighScore(next.humanName, next.totalPoints, completed).catch(() => {});
      }
      setSession(next);
      persist(next);
    },
    [session, persist],
  );

  const endTournament = useCallback(() => {
    // Resigning mid-run still banks the score, like the web's Resign action.
    if (session && !session.scoreSubmitted && session.totalPoints > 0 && !sessionEnded(session)) {
      submitHighScore(session.humanName, session.totalPoints, session.records.length).catch(() => {});
    }
    setSession(null);
    persist(null);
  }, [session, persist]);

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
