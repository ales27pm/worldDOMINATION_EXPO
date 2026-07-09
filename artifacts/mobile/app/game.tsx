import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { aiNextAction } from '@/game/ai';
import { allianceBetween } from '@/game/analysis';
import { electionBudget } from '@/game/engine';
import { TERRITORY_MAP } from '@/game/mapData';
import { Colors } from '@/constants/colors';
import type { GameState, TerritoryId } from '@/game/types';
import GameMap from '@/components/game/GameMap';
import GamePanel from '@/components/game/GamePanel';
import PlayerRoster from '@/components/game/PlayerRoster';
import BattleReportCard from '@/components/game/BattleReport';
import CardHand from '@/components/game/CardHand';
import {
  DispatchLog,
  HandoffOverlay,
  OccupyOverlay,
  ProposalOverlay,
  VictoryOverlay,
} from '@/components/game/GameOverlays';

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { game, dispatch, abandonGame } = useGame();

  const [selected, setSelected] = useState<TerritoryId | null>(null);
  const [deployAmount, setDeployAmount] = useState(1);
  const [allOut, setAllOut] = useState(true);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  // Redirect if no game
  useEffect(() => {
    if (!game) router.replace('/');
  }, [game]);

  if (!game) return null;

  const player = game.players[game.currentPlayer];
  const isHumanTurn = player?.isHuman ?? false;
  const isHumanActive = isHumanTurn && !game.awaitingHandoff && !game.pendingProposal;

  // ── AI Loop ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!game || game.phase === 'gameOver') return;
    if (isHumanTurn || game.awaitingHandoff || game.pendingProposal) return;
    if (game.pendingOccupy) {
      // AI handles occupy immediately
      const timer = setTimeout(() => {
        const action = aiNextAction(game);
        if (action) dispatch(action);
      }, 100);
      return () => clearTimeout(timer);
    }
    const delay = game.phase === 'initialDeploy' || game.phase === 'territoryGrab' ? 100 : 180;
    const timer = setTimeout(() => {
      const action = aiNextAction(game);
      if (action) dispatch(action);
    }, delay);
    return () => clearTimeout(timer);
  }, [game, isHumanTurn, dispatch]);

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
        // Show attackable source territories
        for (const id of game.activeIds) {
          const ter = game.territories[id];
          if (ter.owner !== player.id || ter.armies < 2) continue;
          const neighbors = game.activeIds.filter(
            (n) => game.territories[n].owner !== player.id,
          );
          // Show if has armies (neighbor check is approximate for performance)
          if (ter.armies >= 2) inter.add(id);
        }
      } else {
        // Show this territory as interactive
        const selTer = game.territories[selected];
        if (selTer?.owner === player.id && selTer.armies >= 2) {
          inter.add(selected);
          // Show attackable neighbors as targets
          const def = TERRITORY_MAP[selected];
          if (def) {
            for (const n of def.neighbors) {
              if (!activeSet.has(n)) continue;
              const nt = game.territories[n as TerritoryId];
              if (nt?.owner !== player.id) {
                // Check alliance
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
        // Show territories with armies to move
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
        // Attack!
        dispatch({ type: 'ATTACK', from: selected, to: id, allOut });
        setSelected(null);
        return;
      }
      // Select source
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
    if ((phase === 'reinforcement') && ter.owner === player?.id) {
      setSelected(id === selected ? null : id);
      return;
    }
    // Deselect on empty tap
    if (id !== selected) setSelected(null);
  }, [game, selected, targets, allOut, deployAmount, isHumanActive, dispatch, player]);

  // ── Victory exit ───────────────────────────────────────────────────────────
  const handleVictoryExit = useCallback(async () => {
    await abandonGame();
    router.replace('/');
  }, [abandonGame, router]);

  // ── Election UI (simple) ───────────────────────────────────────────────────
  const renderElectionPanel = () => {
    const election = game.election;
    if (!election || game.phase !== 'election') return null;
    if (game.currentPlayer !== player?.id) return null;
    const tName = TERRITORY_MAP[election.territory]?.name ?? election.territory;
    const budget = electionBudget(game, player.id);
    const points = election.points[player.id] ?? 0;
    return (
      <View style={styles.electionPanel}>
        <Text style={styles.electionTitle}>AUCTION: {tName}</Text>
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
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top safe area + mini status */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => {
              Alert.alert('Exit Campaign', 'Return to main menu? Progress is auto-saved.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: () => router.replace('/') },
              ]);
            }}
            style={styles.exitBtn}
          >
            <Text style={styles.exitText}>← Menu</Text>
          </Pressable>
          <View style={styles.turnInfo}>
            <Text style={styles.turnText}>Turn {game.turn}</Text>
            <Text style={styles.phaseText}>{phaseLabel(game.phase)}</Text>
          </View>
          <View style={styles.playerCount}>
            <Text style={styles.aliveText}>
              {game.players.filter((p) => p.alive).length}/{game.players.length} Alive
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* MAP */}
      <View style={styles.mapContainer}>
        <GameMap
          game={game}
          selected={selected}
          targets={targets}
          interactive={interactive}
          onTerritoryTap={handleTerritoryTap}
        />
      </View>

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
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
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
        </SafeAreaView>
      )}

      {/* Roster overlay (side panel) */}
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

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'territoryGrab': return 'CLAIMING';
    case 'election': return 'ELECTION';
    case 'initialDeploy': return 'INITIAL DEPLOY';
    case 'chooseCapital': return 'CHOOSE CAPITAL';
    case 'reinforcement': return 'REINFORCE';
    case 'attack': return 'ATTACK';
    case 'fortify': return 'FORTIFY';
    case 'gameOver': return 'GAME OVER';
    default: return phase.toUpperCase();
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: { backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  exitBtn: { padding: 4 },
  exitText: { color: Colors.gold, fontFamily: 'Inter_500Medium', fontSize: 13 },
  turnInfo: { flex: 1, alignItems: 'center', gap: 2 },
  turnText: { color: Colors.text, fontFamily: 'Inter_700Bold', fontSize: 14 },
  phaseText: { color: Colors.goldDim, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 2 },
  playerCount: { alignItems: 'flex-end' },
  aliveText: { color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12 },
  mapContainer: { flex: 1 },
  battleContainer: { paddingHorizontal: 12, paddingVertical: 4 },
  bottomBar: { backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border },

  // Election
  electionPanel: {
    backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.goldDim,
    padding: 12, gap: 6,
  },
  electionTitle: { color: Colors.gold, fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 2 },
  electionBid: { color: Colors.text, fontFamily: 'Inter_500Medium', fontSize: 14 },
  electionPoints: { color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12 },
  electionBtns: { flexDirection: 'row', gap: 8 },
  bidBtn: { backgroundColor: Colors.gold, paddingVertical: 8, paddingHorizontal: 16 },
  bidBtnText: { color: Colors.bg, fontFamily: 'Inter_700Bold', fontSize: 13 },
  passBtn: { borderWidth: 1, borderColor: Colors.border, paddingVertical: 8, paddingHorizontal: 16 },
  passBtnText: { color: Colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 13 },

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
  rosterTitle: { color: Colors.gold, fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 3 },
  rosterClose: { color: Colors.textMuted, fontSize: 18, padding: 4 },
});
