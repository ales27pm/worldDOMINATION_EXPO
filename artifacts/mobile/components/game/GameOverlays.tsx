import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { TERRITORY_MAP } from '@/game/mapData';
import { ALLIANCE_LEVEL_INFO } from '@/game/types';
import type { AllianceLevel, GameAction, GameState } from '@/game/types';
import { missionText } from '@/game/missions';
import { Fireworks } from './Fireworks';

// ─── Handoff Overlay ──────────────────────────────────────────────────────────
export function HandoffOverlay({ game, dispatch }: { game: GameState; dispatch: (a: GameAction) => void }) {
  if (!game.awaitingHandoff) return null;
  const player = game.players[game.currentPlayer];
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.handoffTitle}>COMMANDER'S TURN</Text>
          <View style={[styles.colorBar, { backgroundColor: player?.color ?? Colors.gold }]} />
          <Text style={styles.handoffName}>{player?.name}</Text>
          <Text style={styles.handoffPhase}>{game.phase.toUpperCase()} PHASE</Text>
          {player?.mission && (
            <View style={styles.missionBox}>
              <Text style={styles.missionLabel}>SECRET MISSION</Text>
              <Text style={styles.missionText}>{missionText(player.mission, game.players)}</Text>
            </View>
          )}
          <Pressable
            onPress={() => dispatch({ type: 'ACKNOWLEDGE_HANDOFF' })}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>⚔ TAKE COMMAND</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Occupy Overlay ───────────────────────────────────────────────────────────
export function OccupyOverlay({ game, dispatch }: { game: GameState; dispatch: (a: GameAction) => void }) {
  const pending = game.pendingOccupy;
  const [count, setCount] = useState(() => pending?.max ?? 1);
  if (!pending) return null;
  const fromName = TERRITORY_MAP[pending.from]?.name ?? pending.from;
  const toName = TERRITORY_MAP[pending.to]?.name ?? pending.to;
  const fromArmies = game.territories[pending.from]?.armies ?? 0;
  const decrement = () => setCount((c) => Math.max(pending.min, c - 1));
  const increment = () => setCount((c) => Math.min(pending.max, c + 1));
  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.occupyTitle}>OCCUPY TERRITORY</Text>
          <Text style={styles.occupyDesc}>
            March armies from <Text style={styles.bold}>{fromName}</Text> into{' '}
            <Text style={styles.bold}>{toName}</Text>
          </Text>
          <View style={styles.stepperRow}>
            <Pressable onPress={decrement} disabled={count <= pending.min} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Text style={styles.stepCount}>{count}</Text>
            <Pressable onPress={increment} disabled={count >= pending.max} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
            <Text style={styles.stepRange}>of {pending.min}–{pending.max}</Text>
          </View>
          <Text style={styles.sliderHint}>
            Leave {fromArmies - count} armies in {fromName}
          </Text>
          <Pressable
            onPress={() => dispatch({ type: 'OCCUPY', count })}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>ADVANCE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Proposal Overlay ─────────────────────────────────────────────────────────
export function ProposalOverlay({ game, dispatch }: { game: GameState; dispatch: (a: GameAction) => void }) {
  const proposal = game.pendingProposal;
  if (!proposal) return null;
  const from = game.players[proposal.from];
  const level = ALLIANCE_LEVEL_INFO[proposal.level];
  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.proposalTitle}>DIPLOMATIC DISPATCH</Text>
          <View style={[styles.colorBar, { backgroundColor: from?.color ?? Colors.gold }]} />
          <Text style={styles.proposalName}>{from?.name}</Text>
          <Text style={styles.proposalText}>
            offers you a <Text style={styles.bold}>{level.name}</Text>
          </Text>
          <Text style={styles.proposalDesc}>
            {proposal.level === 1 && 'A basic pact of non-aggression. Territories in your empire and continents are protected.'}
            {proposal.level === 2 && 'A military alliance. Neither party may attack the other\'s territories.'}
            {proposal.level === 3 && 'A grand alliance. Full mutual protection and cooperation.'}
          </Text>
          <View style={styles.proposalBtns}>
            <Pressable
              onPress={() => dispatch({ type: 'RESPOND_PROPOSAL', accept: false })}
              style={styles.refuseBtn}
            >
              <Text style={styles.refuseBtnText}>REFUSE</Text>
            </Pressable>
            <Pressable
              onPress={() => dispatch({ type: 'RESPOND_PROPOSAL', accept: true })}
              style={styles.acceptBtn}
            >
              <Text style={styles.acceptBtnText}>ACCEPT</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Victory Overlay ──────────────────────────────────────────────────────────
export function VictoryOverlay({ game, onExit }: { game: GameState; onExit: () => void }) {
  if (game.phase !== 'gameOver') return null;
  const winner = game.winner !== null ? game.players[game.winner] : null;
  const human = game.players.find((p) => p.isHuman);
  const playerWon = winner?.id === human?.id;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        {playerWon && <Fireworks />}
        <View style={[styles.sheet, styles.victorySheet]}>
          <Text style={[styles.victoryResult, playerWon ? styles.victory : styles.defeat]}>
            {playerWon ? '⚔ VICTORY' : '✕ DEFEAT'}
          </Text>
          <View style={[styles.colorBar, { backgroundColor: winner?.color ?? Colors.gold }]} />
          <Text style={styles.victoryName}>{winner?.name ?? '?'}</Text>
          <Text style={styles.victoryReason}>{game.winReason}</Text>

          <View style={styles.statsGrid}>
            <StatItem label="Turns" value={String(game.turn)} />
            <StatItem label="Battles" value={String(game.battlesFought)} />
            <StatItem
              label="Territories"
              value={String(
                winner ? game.activeIds.filter((id) => game.territories[id].owner === winner.id).length : 0,
              )}
            />
          </View>

          <Pressable onPress={onExit} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>RETURN TO MAIN MENU</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Dispatch Log Overlay ─────────────────────────────────────────────────────
export function DispatchLog({ game, visible, onClose }: { game: GameState; visible: boolean; onClose: () => void }) {
  const toneColor: Record<string, string> = {
    info: Colors.text,
    gold: Colors.gold,
    crimson: Colors.textCrimson,
    battle: '#e0a050',
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.dispatchSheet} edges={['bottom']}>
          <View style={styles.dispatchHeader}>
            <Text style={styles.title}>FIELD DISPATCH</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.logContent}>
            {game.log.map((entry) => (
              <View key={entry.id} style={styles.logEntry}>
                <Text style={styles.logTurn}>T{entry.turn}</Text>
                <Text style={[styles.logText, { color: toneColor[entry.tone] ?? Colors.text }]}>
                  {entry.text}
                </Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: {
    backgroundColor: Colors.bgModal, borderWidth: 1, borderColor: Colors.border,
    padding: 24, gap: 14, width: '100%', maxWidth: 400,
  },
  victorySheet: { gap: 16 },
  colorBar: { height: 3, borderRadius: 2, width: '100%' },
  bold: { fontFamily: 'Alegreya_700Bold', color: Colors.text },

  // Handoff
  handoffTitle: { color: Colors.goldDim, fontFamily: 'Alegreya_600SemiBold', fontSize: 11, letterSpacing: 3, textAlign: 'center' },
  handoffName: { color: Colors.gold, fontFamily: 'Alegreya_700Bold', fontSize: 28, textAlign: 'center' },
  handoffPhase: { color: Colors.textMuted, fontFamily: 'Alegreya_500Medium', fontSize: 12, letterSpacing: 2, textAlign: 'center' },
  missionBox: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 4 },
  missionLabel: { color: Colors.goldDim, fontFamily: 'Alegreya_600SemiBold', fontSize: 10, letterSpacing: 2 },
  missionText: { color: Colors.text, fontFamily: 'Alegreya_400Regular', fontSize: 13 },

  // Occupy
  occupyTitle: { color: Colors.gold, fontFamily: 'Alegreya_700Bold', fontSize: 16, letterSpacing: 2 },
  occupyDesc: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 14 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderCount: { color: Colors.gold, fontFamily: 'Alegreya_700Bold', fontSize: 28, minWidth: 40, textAlign: 'center' },
  sliderMax: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 14, minWidth: 24, textAlign: 'right' },
  sliderHint: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12, textAlign: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  stepBtn: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  stepBtnText: { color: Colors.text, fontFamily: 'Alegreya_700Bold', fontSize: 22 },
  stepCount: { color: Colors.gold, fontFamily: 'Alegreya_700Bold', fontSize: 36, minWidth: 56, textAlign: 'center' },
  stepRange: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12 },

  // Proposal
  proposalTitle: { color: Colors.goldDim, fontFamily: 'Alegreya_600SemiBold', fontSize: 11, letterSpacing: 3 },
  proposalName: { color: Colors.gold, fontFamily: 'Alegreya_700Bold', fontSize: 22 },
  proposalText: { color: Colors.text, fontFamily: 'Alegreya_400Regular', fontSize: 15 },
  proposalDesc: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 13 },
  proposalBtns: { flexDirection: 'row', gap: 12 },
  refuseBtn: { flex: 1, borderWidth: 1, borderColor: Colors.crimson, paddingVertical: 12, alignItems: 'center' },
  refuseBtnText: { color: Colors.textCrimson, fontFamily: 'Alegreya_700Bold', fontSize: 13, letterSpacing: 2 },
  acceptBtn: { flex: 1, backgroundColor: Colors.gold, paddingVertical: 12, alignItems: 'center' },
  acceptBtnText: { color: Colors.bg, fontFamily: 'Alegreya_700Bold', fontSize: 13, letterSpacing: 2 },

  // Victory
  victoryResult: { fontFamily: 'Alegreya_700Bold', fontSize: 32, textAlign: 'center', letterSpacing: 4 },
  victory: { color: Colors.gold },
  defeat: { color: Colors.textMuted },
  victoryName: { color: Colors.text, fontFamily: 'Alegreya_700Bold', fontSize: 24, textAlign: 'center' },
  victoryReason: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 13, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { color: Colors.text, fontFamily: 'Alegreya_700Bold', fontSize: 22 },
  statLabel: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 10, letterSpacing: 1 },

  // Common buttons
  primaryBtn: { backgroundColor: Colors.gold, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: Colors.bg, fontFamily: 'Alegreya_700Bold', fontSize: 14, letterSpacing: 3 },

  // Dispatch log
  dispatchSheet: { backgroundColor: Colors.bgModal, borderTopWidth: 1, borderTopColor: Colors.border, maxHeight: '70%' },
  dispatchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { color: Colors.gold, fontFamily: 'Alegreya_700Bold', fontSize: 14, letterSpacing: 3 },
  closeText: { color: Colors.textMuted, fontSize: 18, padding: 4 },
  logContent: { padding: 16, gap: 8 },
  logEntry: { flexDirection: 'row', gap: 8 },
  logTurn: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 10, minWidth: 24, paddingTop: 2 },
  logText: { flex: 1, fontFamily: 'Alegreya_400Regular', fontSize: 13, lineHeight: 18 },
});
