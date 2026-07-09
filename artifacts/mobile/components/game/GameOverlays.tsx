import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Modal, ScrollView, Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { TERRITORY_MAP } from '@/game/mapData';
import { ALLIANCE_LEVEL_INFO } from '@/game/types';
import type { AllianceLevel, GameAction, GameState } from '@/game/types';
import { missionText } from '@/game/missions';

// ─── Shared: Parchment Sheet ──────────────────────────────────────────────────
function ParchmentSheet({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.parchSheet, style]}>
      {/* Inner double-border */}
      <View style={styles.parchInner}>{children}</View>
    </View>
  );
}

// ─── Shared: Ornate Divider ───────────────────────────────────────────────────
function OrnateDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerDiamond}>◆</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── Handoff Overlay ──────────────────────────────────────────────────────────
export function HandoffOverlay({ game, dispatch }: { game: GameState; dispatch: (a: GameAction) => void }) {
  if (!game.awaitingHandoff) return null;
  const player = game.players[game.currentPlayer];
  const scaleAnim = useRef(new RNAnimated.Value(0.85)).current;

  React.useEffect(() => {
    RNAnimated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, []);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <RNAnimated.View style={[{ transform: [{ scale: scaleAnim }], width: '90%' }]}>
          <ParchmentSheet>
            {/* Wood header */}
            <LinearGradient
              colors={[Colors.wood, Colors.woodMid, Colors.wood]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.handoffHeader}
            >
              <Text style={styles.handoffLabel}>COMMANDER'S TURN</Text>
            </LinearGradient>

            {/* Player color bar */}
            <View style={[styles.colorBar, { backgroundColor: player?.color ?? Colors.gold }]} />

            {/* Player info */}
            <View style={styles.handoffBody}>
              <Text style={styles.handoffName}>{player?.name}</Text>
              <OrnateDivider />
              <Text style={styles.handoffPhase}>{game.phase.toUpperCase()} PHASE</Text>

              {player?.mission && (
                <View style={styles.missionBox}>
                  <Text style={styles.missionLabel}>⚑ SECRET MISSION</Text>
                  <Text style={styles.missionText}>{missionText(player.mission, game.players)}</Text>
                </View>
              )}

              <Pressable
                onPress={() => dispatch({ type: 'ACKNOWLEDGE_HANDOFF' })}
                style={({ pressed }) => [styles.commandBtn, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={[Colors.woodMid, Colors.wood, Colors.woodMid]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.commandBtnGrad}
                >
                  <Text style={styles.commandBtnText}>⚔  TAKE COMMAND</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ParchmentSheet>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

// ─── Occupy Overlay ───────────────────────────────────────────────────────────
export function OccupyOverlay({ game, dispatch }: { game: GameState; dispatch: (a: GameAction) => void }) {
  const pending = game.pendingOccupy;
  const [count, setCount] = useState(() => pending?.max ?? 1);
  const slideAnim = useRef(new RNAnimated.Value(200)).current;

  React.useEffect(() => {
    if (pending) {
      setCount(pending.max);
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
    }
  }, [pending?.from, pending?.to]);

  if (!pending) return null;

  const fromName = TERRITORY_MAP[pending.from]?.name ?? pending.from;
  const toName   = TERRITORY_MAP[pending.to]?.name ?? pending.to;
  const fromArmies = game.territories[pending.from]?.armies ?? 0;

  return (
    <Modal visible transparent animationType="none">
      <View style={[styles.backdrop, { justifyContent: 'flex-end' }]}>
        <RNAnimated.View style={[styles.occupySheet, { transform: [{ translateY: slideAnim }] }]}>

          <LinearGradient
            colors={[Colors.wood, Colors.woodMid, Colors.wood]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.occupyHeader}
          >
            <Text style={styles.occupyTitle}>MARCH ARMIES</Text>
          </LinearGradient>

          <View style={styles.goldBar} />

          <View style={styles.occupyBody}>
            <Text style={styles.occupyDesc}>
              Advance from{' '}
              <Text style={styles.occupyBold}>{fromName}</Text>
              {' '}into{' '}
              <Text style={styles.occupyBold}>{toName}</Text>
            </Text>

            <OrnateDivider />

            {/* Stepper */}
            <View style={styles.occupyStepper}>
              <Pressable
                onPress={() => setCount((c) => Math.max(pending.min, c - 1))}
                disabled={count <= pending.min}
                style={[styles.occupyStepBtn, count <= pending.min && styles.stepBtnDisabled]}
              >
                <Text style={styles.occupyStepText}>−</Text>
              </Pressable>
              <View style={styles.occupyCountBox}>
                <Text style={styles.occupyCount}>{count}</Text>
                <Text style={styles.occupyCountSub}>armies</Text>
              </View>
              <Pressable
                onPress={() => setCount((c) => Math.min(pending.max, c + 1))}
                disabled={count >= pending.max}
                style={[styles.occupyStepBtn, count >= pending.max && styles.stepBtnDisabled]}
              >
                <Text style={styles.occupyStepText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.occupyHint}>
              Leave {fromArmies - count} armies in {fromName}
              {' '}· range: {pending.min}–{pending.max}
            </Text>

            <Pressable
              onPress={() => dispatch({ type: 'OCCUPY', count })}
              style={({ pressed }) => [styles.advanceBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={[Colors.goldDim, Colors.gold, Colors.goldDim]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.advanceBtnGrad}
              >
                <Text style={styles.advanceBtnText}>ADVANCE  ▶▶</Text>
              </LinearGradient>
            </Pressable>
          </View>
          <SafeAreaView edges={['bottom']} />
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

// ─── Alliance Proposal Overlay ────────────────────────────────────────────────
export function ProposalOverlay({ game, dispatch }: { game: GameState; dispatch: (a: GameAction) => void }) {
  const proposal = game.pendingProposal;
  if (!proposal) return null;
  const fromPlayer = game.players[proposal.from];
  const toPlayer   = game.players[game.currentPlayer];
  const levelInfo  = ALLIANCE_LEVEL_INFO[proposal.level as AllianceLevel];

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={{ width: '88%' }}>
          <ParchmentSheet>
            <LinearGradient
              colors={[Colors.wood, Colors.woodMid, Colors.wood]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.handoffHeader}
            >
              <Text style={styles.handoffLabel}>DIPLOMATIC DISPATCH</Text>
            </LinearGradient>

            <View style={styles.handoffBody}>
              <Text style={styles.proposalFrom}>
                <Text style={{ color: fromPlayer?.color ?? Colors.gold }}>{fromPlayer?.name}</Text>
                {' '}proposes an alliance:
              </Text>
              <OrnateDivider />
              <Text style={styles.proposalLevel}>{levelInfo?.name ?? `Level ${proposal.level}`}</Text>
              <View style={styles.proposalBtns}>
                <Pressable onPress={() => dispatch({ type: 'RESPOND_PROPOSAL', accept: true })} style={styles.acceptBtn}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </Pressable>
                <Pressable onPress={() => dispatch({ type: 'RESPOND_PROPOSAL', accept: false })} style={styles.refuseBtn}>
                  <Text style={styles.refuseBtnText}>Refuse</Text>
                </Pressable>
              </View>
            </View>
          </ParchmentSheet>
        </View>
      </View>
    </Modal>
  );
}

// ─── Victory Overlay ──────────────────────────────────────────────────────────
export function VictoryOverlay({ game, onExit }: { game: GameState; onExit: () => void }) {
  if (game.phase !== 'gameOver') return null;
  const winner = game.players.find((p) => p.id === game.winner);
  const scaleAnim = useRef(new RNAnimated.Value(0.7)).current;
  const glowAnim  = useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    RNAnimated.sequence([
      RNAnimated.spring(scaleAnim, { toValue: 1.05, friction: 4, useNativeDriver: true }),
      RNAnimated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <RNAnimated.View style={[{ transform: [{ scale: scaleAnim }], width: '90%' }]}>
          <ParchmentSheet>
            <LinearGradient
              colors={[Colors.goldDim, Colors.gold, Colors.goldDim]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.victoryHeader}
            >
              <Text style={styles.victoryTitle}>WORLD DOMINATION</Text>
            </LinearGradient>

            <View style={styles.victoryBody}>
              <RNAnimated.Text style={[styles.victoryCrown, { opacity: glowAnim }]}>♛</RNAnimated.Text>
              <Text style={styles.victoryConqueror}>SUPREME CONQUEROR</Text>
              <OrnateDivider />
              <Text style={[styles.victoryName, { color: winner?.color ?? Colors.gold }]}>
                {winner?.name ?? 'Unknown'}
              </Text>
              <Text style={styles.victoryFlavor}>
                Has subjugated the known world after {game.turn} turns of campaign.
              </Text>

              <Pressable onPress={onExit} style={({ pressed }) => [styles.commandBtn, pressed && { opacity: 0.85 }]}>
                <LinearGradient
                  colors={[Colors.goldDim, Colors.gold, Colors.goldDim]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.commandBtnGrad}
                >
                  <Text style={[styles.commandBtnText, { color: Colors.bg }]}>Return to Headquarters</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ParchmentSheet>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

// ─── Dispatch Log ─────────────────────────────────────────────────────────────
export function DispatchLog({ game, visible, onClose }: {
  game: GameState; visible: boolean; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { justifyContent: 'flex-end' }]}>
        <SafeAreaView style={styles.logSheet} edges={['bottom']}>
          <LinearGradient
            colors={[Colors.wood, Colors.woodMid, Colors.wood]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.logHeader}
          >
            <Text style={styles.logTitle}>DISPATCH LOG</Text>
            <Pressable onPress={onClose} style={styles.logClose} hitSlop={12}>
              <Text style={styles.logCloseText}>✕</Text>
            </Pressable>
          </LinearGradient>
          <View style={styles.goldBar} />

          <ScrollView
            style={styles.logScroll}
            contentContainerStyle={styles.logContent}
            showsVerticalScrollIndicator={false}
          >
            {[...(game.log ?? [])].reverse().map((entry, i) => (
              <View key={i} style={styles.logEntry}>
                <Text style={styles.logBullet}>◆</Text>
                <Text style={styles.logText}>{entry.text}</Text>
              </View>
            ))}
            {(!game.log || game.log.length === 0) && (
              <Text style={styles.logEmpty}>No dispatches recorded yet.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: Colors.overlay,
    justifyContent: 'center', alignItems: 'center',
  },

  // Parchment sheet
  parchSheet: {
    backgroundColor: Colors.bgParchment,
    borderWidth: 2, borderColor: Colors.gold,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 20,
  },
  parchInner: {
    borderWidth: 1, borderColor: Colors.borderParchment,
    margin: 4, overflow: 'hidden',
  },

  // Ornate divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderParchment },
  dividerDiamond: { color: Colors.borderParchment, fontSize: 8, marginHorizontal: 8 },

  // Gold accent bar
  goldBar: { height: 2, backgroundColor: Colors.gold },

  // Handoff overlay
  handoffHeader: {
    paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
  },
  handoffLabel: {
    color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 4,
  },
  colorBar: { height: 4 },
  handoffBody: { padding: 24, alignItems: 'center', gap: 0 },
  handoffName: {
    color: Colors.inkDark, fontFamily: 'Cinzel_900Black', fontSize: 26,
    textAlign: 'center', letterSpacing: 2,
  },
  handoffPhase: {
    color: Colors.inkMed, fontFamily: 'Cinzel_600SemiBold', fontSize: 12,
    letterSpacing: 4, textAlign: 'center',
  },
  missionBox: {
    borderWidth: 1, borderColor: Colors.borderParchment,
    backgroundColor: Colors.bgParchmentDark, padding: 12, marginTop: 12, width: '100%',
  },
  missionLabel: {
    color: Colors.inkMed, fontFamily: 'Cinzel_700Bold', fontSize: 9,
    letterSpacing: 2, marginBottom: 4,
  },
  missionText: {
    color: Colors.inkDark, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 13,
  },
  commandBtn: { width: '100%', marginTop: 16 },
  commandBtnGrad: {
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.gold,
  },
  commandBtnText: {
    color: Colors.text, fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 3,
  },

  // Occupy overlay
  occupySheet: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 2, borderTopColor: Colors.gold,
    borderLeftWidth: 1, borderLeftColor: Colors.border,
    borderRightWidth: 1, borderRightColor: Colors.border,
  },
  occupyHeader: {
    paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center',
  },
  occupyTitle: {
    color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 4,
  },
  occupyBody: { padding: 20, gap: 0 },
  occupyDesc: {
    color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 14,
    textAlign: 'center',
  },
  occupyBold: { color: Colors.text, fontFamily: 'PlayfairDisplay_700Bold' },
  occupyStepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20,
    marginVertical: 8,
  },
  occupyStepBtn: {
    width: 52, height: 52, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  stepBtnDisabled: { borderColor: Colors.disabled, opacity: 0.4 },
  occupyStepText: { color: Colors.text, fontFamily: 'Cinzel_900Black', fontSize: 28 },
  occupyCountBox: { alignItems: 'center' },
  occupyCount: { color: Colors.gold, fontFamily: 'Cinzel_900Black', fontSize: 48, lineHeight: 52 },
  occupyCountSub: { color: Colors.textMuted, fontFamily: 'Cinzel_400Regular', fontSize: 10, letterSpacing: 2 },
  occupyHint: {
    color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 12,
    textAlign: 'center', marginBottom: 16,
  },
  advanceBtn: {},
  advanceBtnGrad: {
    paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.gold,
  },
  advanceBtnText: { color: Colors.bg, fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 3 },

  // Proposal overlay
  proposalFrom: {
    color: Colors.inkDark, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 14,
    textAlign: 'center',
  },
  proposalLevel: {
    color: Colors.inkDark, fontFamily: 'Cinzel_700Bold', fontSize: 18,
    textAlign: 'center', letterSpacing: 2,
  },
  proposalDesc: {
    color: Colors.inkMed, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 13,
    textAlign: 'center', marginBottom: 12,
  },
  proposalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  acceptBtn: {
    flex: 1, backgroundColor: '#2a4a2a', borderWidth: 1.5, borderColor: '#4a8a4a',
    paddingVertical: 13, alignItems: 'center',
  },
  acceptBtnText: { color: '#a0e0a0', fontFamily: 'Cinzel_700Bold', fontSize: 12, letterSpacing: 2 },
  refuseBtn: {
    flex: 1, backgroundColor: '#4a1a1a', borderWidth: 1.5, borderColor: Colors.crimson,
    paddingVertical: 13, alignItems: 'center',
  },
  refuseBtnText: { color: Colors.textCrimson, fontFamily: 'Cinzel_700Bold', fontSize: 12, letterSpacing: 2 },

  // Victory overlay
  victoryHeader: {
    paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center',
  },
  victoryTitle: {
    color: Colors.bg, fontFamily: 'Cinzel_900Black', fontSize: 15, letterSpacing: 4,
  },
  victoryBody: { padding: 24, alignItems: 'center', gap: 0 },
  victoryCrown: {
    fontSize: 60, color: Colors.gold, lineHeight: 66,
    textShadowColor: Colors.gold, textShadowRadius: 20,
  },
  victoryConqueror: {
    color: Colors.inkMed, fontFamily: 'Cinzel_600SemiBold', fontSize: 10, letterSpacing: 4, marginTop: 4,
  },
  victoryName: {
    fontFamily: 'Cinzel_900Black', fontSize: 28, textAlign: 'center', letterSpacing: 2,
  },
  victoryFlavor: {
    color: Colors.inkMed, fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 16,
  },

  // Dispatch log
  logSheet: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 2, borderTopColor: Colors.gold,
    maxHeight: '70%',
  },
  logHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  logTitle: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 4 },
  logClose: { padding: 4 },
  logCloseText: { color: Colors.textMuted, fontSize: 20, fontFamily: 'Cinzel_400Regular' },
  logScroll: { flex: 1 },
  logContent: { padding: 16, gap: 8 },
  logEntry: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  logBullet: { color: Colors.goldDim, fontSize: 8, marginTop: 5 },
  logText: { flex: 1, color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 12, lineHeight: 18 },
  logEmpty: {
    color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 13, textAlign: 'center', padding: 24,
  },
});
