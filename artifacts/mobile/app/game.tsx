import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { useTournament } from '@/context/TournamentContext';
import { aiNextAction } from '@/game/ai';
import { allianceBetween } from '@/game/analysis';
import { electionBudget } from '@/game/engine';
import { TERRITORY_MAP } from '@/game/mapData';
import { tournamentResult } from '@/game/tournament';
import { Colors } from '@/constants/colors';
import type { GameAction, GameState, TerritoryId } from '@/game/types';
import { preloadBattleViews } from '@/game/battleViews';
import { playActionSound, useGameSounds } from '@/hooks/useGameSounds';
import GameMap, { MAP_VIEW_LABELS, MAP_VIEW_MODES, type MapViewMode } from '@/components/game/GameMap';
import { TopBar } from '@/components/game/TopBar';
import { FieldPanel, SectionHeader } from '@/components/game/FieldPanel';
import GamePanel from '@/components/game/GamePanel';
import PlayerRoster from '@/components/game/PlayerRoster';
import BattleReportCard from '@/components/game/BattleReport';
import CardHand from '@/components/game/CardHand';
import { BattleView } from '@/components/game/BattleView';
import {
  DispatchLog,
  HandoffOverlay,
  OccupyOverlay,
  ProposalOverlay,
  VictoryOverlay,
} from '@/components/game/GameOverlays';

export default function GameScreen() {
  const router = useRouter();
  const { game, startGame } = useGame();
  const { autostart } = useLocalSearchParams<{ autostart?: string }>();

  // Redirect if no game (dev builds can auto-start a demo campaign for previews)
  useEffect(() => {
    if (game) return;
    if (__DEV__ && autostart) {
      startGame({
        players: [
          { name: 'Napoleon', colorIdx: 0, isHuman: true, generalId: null },
          { name: 'Wellington', colorIdx: 1, isHuman: false, generalId: null },
          { name: 'Kutuzov', colorIdx: 2, isHuman: false, generalId: null },
          { name: 'Blücher', colorIdx: 3, isHuman: false, generalId: null },
        ],
        objective: 'domination100',
        useExtraTerritories: true,
        cardRule: 'ascending',
        allocation: 'random',
      });
      return;
    }
    router.replace('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, autostart]);

  if (!game) return null;
  return <CampaignScreen game={game} />;
}

function CampaignScreen({ game }: { game: GameState }) {
  const router = useRouter();
  const { dispatch: rawDispatch, abandonGame } = useGame();
  const { recordResult } = useTournament();

  // Every human order gets its RISK II sound cue before it hits the engine.
  const dispatch = useCallback(
    (action: GameAction) => {
      playActionSound(action);
      rawDispatch(action);
    },
    [rawDispatch],
  );

  // State-transition sound director: battles, proposals, handoffs, victory.
  // Battle views are always enabled on mobile.
  useGameSounds(game, true);

  const [selected, setSelected] = useState<TerritoryId | null>(null);
  const [deployAmount, setDeployAmount] = useState(1);
  const [allOut, setAllOut] = useState(true);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<MapViewMode>('board');

  const player = game.players[game.currentPlayer];
  const isHumanTurn = player?.isHuman ?? false;
  const isHumanActive = isHumanTurn && !game.awaitingHandoff && !game.pendingProposal;
  const isTournamentGame = game.setup.tournamentGame !== undefined;

  // ── AI Loop ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!game || game.phase === 'gameOver') return;
    if (isHumanTurn || game.awaitingHandoff || game.pendingProposal) return;
    if (game.pendingOccupy) {
      const timer = setTimeout(() => {
        const action = aiNextAction(game);
        // AI orders bypass the human sound cue — battle audio is state-driven.
        if (action) rawDispatch(action);
      }, 100);
      return () => clearTimeout(timer);
    }
    const delay = game.phase === 'initialDeploy' || game.phase === 'territoryGrab' ? 100 : 180;
    const timer = setTimeout(() => {
      const action = aiNextAction(game);
      if (action) rawDispatch(action);
    }, delay);
    return () => clearTimeout(timer);
  }, [game, isHumanTurn, rawDispatch]);

  // ── Deselect when phase changes ────────────────────────────────────────────
  useEffect(() => {
    setSelected(null);
    setDeployAmount(1);
  }, [game.phase, game.currentPlayer]);

  // ── Territory interaction sets ─────────────────────────────────────────────
  const { interactive, targets } = useMemo(() => {
    if (!game || !player || !isHumanActive) {
      return { interactive: new Set<TerritoryId>(), targets: new Set<TerritoryId>() };
    }
    const phase = game.phase;
    const inter = new Set<TerritoryId>();
    const tgts = new Set<TerritoryId>();
    const activeSet = new Set(game.activeIds);

    if (phase === 'territoryGrab') {
      for (const id of game.activeIds) {
        if (game.territories[id].owner === -1) inter.add(id);
      }
    } else if (phase === 'chooseCapital') {
      if (!player.capital) {
        for (const id of game.activeIds) {
          if (game.territories[id].owner === player.id) inter.add(id);
        }
      }
    } else if (phase === 'initialDeploy') {
      if ((game.initialRemaining[player.id] ?? 0) > 0) {
        for (const id of game.activeIds) {
          if (game.territories[id].owner === player.id) inter.add(id);
        }
      }
    } else if (phase === 'reinforcement' && !game.mustTrade) {
      for (const id of game.activeIds) {
        if (game.territories[id].owner === player.id) inter.add(id);
      }
    } else if (phase === 'attack') {
      if (!selected) {
        for (const id of game.activeIds) {
          const ter = game.territories[id];
          if (ter.owner !== player.id || ter.armies < 2) continue;
          if (ter.armies >= 2) inter.add(id);
        }
      } else {
        const selTer = game.territories[selected];
        if (selTer?.owner === player.id && selTer.armies >= 2) {
          inter.add(selected);
          const def = TERRITORY_MAP[selected];
          if (def) {
            for (const n of def.neighbors) {
              if (!activeSet.has(n)) continue;
              const nt = game.territories[n as TerritoryId];
              if (nt?.owner !== player.id) {
                const alliance = allianceBetween(game, player.id, nt.owner);
                if (!alliance || alliance.level < 2) {
                  tgts.add(n as TerritoryId);
                }
              }
            }
          }
        }
      }
    } else if (phase === 'fortify') {
      if (!selected) {
        for (const id of game.activeIds) {
          const ter = game.territories[id];
          if (ter.owner === player.id && ter.armies >= 2) inter.add(id);
        }
      } else {
        const selTer = game.territories[selected];
        if (selTer?.owner === player.id && selTer.armies >= 2) {
          inter.add(selected);
          const def = TERRITORY_MAP[selected];
          if (def) {
            for (const n of def.neighbors) {
              if (!activeSet.has(n)) continue;
              if (game.territories[n as TerritoryId]?.owner === player.id) tgts.add(n as TerritoryId);
            }
          }
        }
      }
    }
    return { interactive: inter, targets: tgts };
  }, [game, selected, isHumanActive]);

  // Pre-warm the cinematic backdrops as soon as an assault is possible.
  useEffect(() => {
    if (game.phase === 'attack' && targets.size > 0) preloadBattleViews(targets);
  }, [game.phase, targets]);

  // ── Territory tap handler ──────────────────────────────────────────────────
  const handleTerritoryTap = useCallback((id: TerritoryId) => {
    if (!isHumanActive) return;
    const phase = game.phase;
    const ter = game.territories[id];

    if (phase === 'territoryGrab' && ter.owner === -1) {
      dispatch({ type: 'CLAIM_TERRITORY', territory: id });
      return;
    }
    if (phase === 'chooseCapital' && ter.owner === player?.id && !player?.capital) {
      dispatch({ type: 'CHOOSE_CAPITAL', territory: id });
      return;
    }
    if (phase === 'initialDeploy' && ter.owner === player?.id) {
      dispatch({ type: 'PLACE_INITIAL', territory: id });
      return;
    }
    if (phase === 'attack') {
      if (selected && targets.has(id)) {
        dispatch({ type: 'ATTACK', from: selected, to: id, allOut });
        setSelected(null);
        return;
      }
      if (ter.owner === player?.id && ter.armies >= 2) {
        setSelected(id === selected ? null : id);
        return;
      }
    }
    if (phase === 'fortify') {
      if (selected && targets.has(id)) {
        dispatch({ type: 'FORTIFY', from: selected, to: id, count: deployAmount });
        setSelected(null);
        setDeployAmount(1);
        return;
      }
      if (ter.owner === player?.id) {
        setSelected(id === selected ? null : id);
        return;
      }
    }
    if (phase === 'reinforcement' && ter.owner === player?.id) {
      setSelected(id === selected ? null : id);
      return;
    }
    if (id !== selected) setSelected(null);
  }, [game, selected, targets, allOut, deployAmount, isHumanActive, dispatch, player]);

  // ── Victory / game-over exit ───────────────────────────────────────────────
  const handleVictoryExit = useCallback(async () => {
    if (isTournamentGame && game.phase === 'gameOver') {
      // Score this tournament battle, then return to tournament screen
      const result = tournamentResult(game);
      await abandonGame();
      recordResult(result);
      router.replace('/tournament');
    } else {
      await abandonGame();
      router.replace('/');
    }
  }, [isTournamentGame, game, abandonGame, recordResult, router]);

  // ── View mode cycle ────────────────────────────────────────────────────────
  const cycleViewMode = useCallback(() => {
    setViewMode((m) => {
      const idx = MAP_VIEW_MODES.indexOf(m);
      return MAP_VIEW_MODES[(idx + 1) % MAP_VIEW_MODES.length];
    });
  }, []);

  // ── Election UI ────────────────────────────────────────────────────────────
  const renderElectionPanel = () => {
    const election = game.election;
    if (!election || game.phase !== 'election') return null;
    if (game.currentPlayer !== player?.id) return null;
    const tName = TERRITORY_MAP[election.territory]?.name ?? election.territory;
    const budget = electionBudget(game, player.id);
    const points = election.points[player.id] ?? 0;
    return (
      <FieldPanel style={styles.electionPanel}>
        <SectionHeader index={1} title={`Auction — ${tName}`} />
        <Text style={styles.electionBid}>Current bid: {election.bid}</Text>
        <Text style={styles.electionPoints}>Your points: {points} (budget: {budget})</Text>
        <View style={styles.electionBtns}>
          {election.bid + 5 <= budget && (
            <Pressable onPress={() => dispatch({ type: 'ELECTION_BID', raise: 5 })} style={styles.bidBtn}>
              <Text style={styles.bidBtnText}>Bid +5</Text>
            </Pressable>
          )}
          {election.bid + 10 <= budget && (
            <Pressable onPress={() => dispatch({ type: 'ELECTION_BID', raise: 10 })} style={styles.bidBtn}>
              <Text style={styles.bidBtnText}>Bid +10</Text>
            </Pressable>
          )}
          {election.highBidder !== player.id && !election.passed.includes(player.id) && (
            <Pressable onPress={() => dispatch({ type: 'ELECTION_PASS' })} style={styles.passBtn}>
              <Text style={styles.passBtnText}>Pass</Text>
            </Pressable>
          )}
        </View>
      </FieldPanel>
    );
  };

  return (
    <View style={styles.container}>
      {/* MAP — full bleed behind the floating chrome */}
      <View style={StyleSheet.absoluteFillObject}>
        <GameMap
          game={game}
          selected={selected}
          targets={targets}
          interactive={interactive}
          viewMode={viewMode}
          onTerritoryTap={handleTerritoryTap}
        />
      </View>

      {/* Floating imperial command bar */}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TopBar
          game={game}
          onExit={() => {
            Alert.alert('Exit Campaign', 'Return to the hall? Progress is auto-saved.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Exit', style: 'destructive', onPress: () => router.replace(isTournamentGame ? '/tournament' : '/') },
            ]);
          }}
        />
        {/* View-mode rail (web's Layers list) */}
        <View style={styles.viewRail} pointerEvents="box-none">
          <Pressable onPress={cycleViewMode} style={styles.viewModeBtn}>
            <Text style={styles.viewModeText}>{MAP_VIEW_LABELS[viewMode].toUpperCase()}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Floating bottom chrome */}
      <SafeAreaView edges={['bottom']} style={styles.bottomChrome} pointerEvents="box-none">
        {/* Battle report (inline, shown above panel) */}
        {game.lastBattle && game.phase === 'attack' && (
          <View style={styles.battleContainer}>
            <BattleReportCard battle={game.lastBattle} game={game} />
          </View>
        )}

        {/* Election panel */}
        {game.phase === 'election' && isHumanActive && renderElectionPanel()}

        {/* Bottom action panel */}
        {game.phase !== 'gameOver' && (
          <View style={styles.bottomBar}>
            <GamePanel
            game={game}
            selected={selected}
            targets={targets}
            deployAmount={deployAmount}
            setDeployAmount={setDeployAmount}
            allOut={allOut}
            setAllOut={setAllOut}
            dispatch={dispatch}
            onOpenCards={() => setCardsOpen(true)}
            onOpenRoster={() => setRosterOpen(true)}
              onOpenLog={() => setLogOpen(true)}
            />
          </View>
        )}
      </SafeAreaView>

      {/* Roster overlay */}
      {rosterOpen && (
        <View style={styles.rosterOverlay}>
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterTitle}>COMMANDERS</Text>
            <Pressable onPress={() => setRosterOpen(false)}>
              <Text style={styles.rosterClose}>✕</Text>
            </Pressable>
          </View>
          <PlayerRoster game={game} />
        </View>
      )}

      {/* Cinematic battle overlay */}
      <BattleView game={game} />

      {/* Modals */}
      <HandoffOverlay game={game} dispatch={dispatch} />
      <OccupyOverlay game={game} dispatch={dispatch} />
      <ProposalOverlay game={game} dispatch={dispatch} />
      <VictoryOverlay game={game} onExit={handleVictoryExit} />

      <CardHand
        game={game}
        dispatch={dispatch}
        open={cardsOpen}
        onClose={() => setCardsOpen(false)}
      />

      <DispatchLog
        game={game}
        visible={logOpen}
        onClose={() => setLogOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  viewRail: { alignItems: 'flex-start', paddingLeft: 8, paddingTop: 8 },
  viewModeBtn: {
    borderWidth: 1, borderColor: 'rgba(222,190,115,0.4)',
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: 'rgba(21,13,9,0.62)',
  },
  viewModeText: { color: Colors.gold, fontFamily: 'Alegreya_600SemiBold', fontSize: 9, letterSpacing: 2 },
  bottomChrome: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
  battleContainer: { paddingHorizontal: 12, paddingVertical: 4 },
  bottomBar: {
    backgroundColor: 'rgba(37,26,19,0.94)',
    borderTopWidth: 1, borderTopColor: 'rgba(222,190,115,0.28)',
  },

  // Election (parchment field panel)
  electionPanel: { marginHorizontal: 10, marginBottom: 8 },
  electionBid: { color: Colors.ink, fontFamily: 'Alegreya_500Medium', fontSize: 14 },
  electionPoints: { color: Colors.inkMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12, marginBottom: 8 },
  electionBtns: { flexDirection: 'row', gap: 8 },
  bidBtn: { backgroundColor: Colors.crimson, paddingVertical: 8, paddingHorizontal: 16 },
  bidBtnText: { color: Colors.primaryFg, fontFamily: 'Alegreya_700Bold', fontSize: 13, letterSpacing: 1 },
  passBtn: { borderWidth: 1, borderColor: Colors.parchmentBorder, paddingVertical: 8, paddingHorizontal: 16 },
  passBtnText: { color: Colors.inkMuted, fontFamily: 'Alegreya_500Medium', fontSize: 13 },

  // Roster overlay
  rosterOverlay: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: 240,
    backgroundColor: Colors.bgModal,
    borderLeftWidth: 1, borderLeftColor: Colors.border,
    padding: 12,
    gap: 12,
    zIndex: 100,
  },
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rosterTitle: { color: Colors.gold, fontFamily: 'Alegreya_700Bold', fontSize: 12, letterSpacing: 3 },
  rosterClose: { color: Colors.textMuted, fontSize: 18, padding: 4 },
});
