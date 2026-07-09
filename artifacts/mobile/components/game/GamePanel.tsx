import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native';
import { Colors } from '@/constants/colors';
import { allianceBetween } from '@/game/analysis';
import { TERRITORY_MAP } from '@/game/mapData';
import { ALLIANCE_LEVEL_INFO } from '@/game/types';
import type { GameAction, GameState, TerritoryId } from '@/game/types';

interface Props {
  game: GameState;
  selected: TerritoryId | null;
  targets: Set<TerritoryId>;
  deployAmount: number;
  setDeployAmount: (n: number) => void;
  allOut: boolean;
  setAllOut: (v: boolean) => void;
  dispatch: (a: GameAction) => void;
  onOpenCards: () => void;
  onOpenRoster: () => void;
  onOpenLog: () => void;
}

export default function GamePanel({
  game, selected, targets, deployAmount, setDeployAmount,
  allOut, setAllOut, dispatch, onOpenCards, onOpenRoster, onOpenLog,
}: Props) {
  const player = game.players[game.currentPlayer];
  const phase = game.phase;
  if (!player) return null;

  const selectedTerritory = selected ? game.territories[selected] : null;
  const selectedOwned = selectedTerritory?.owner === player.id;

  const renderPhaseHint = () => {
    switch (phase) {
      case 'territoryGrab':   return 'Tap an unclaimed territory to claim it.';
      case 'election':        return 'Bid to claim the auctioned territory.';
      case 'initialDeploy':   return 'Tap your territory to place starting armies.';
      case 'chooseCapital':   return 'Tap your territory to establish your capital.';
      case 'reinforcement':
        if (game.mustTrade) return '⚠  Must trade cards before deploying.';
        if (game.awaitingHandoff) return 'Awaiting handoff confirmation.';
        return `Deploy ${game.reinforcementsRemaining} armies — select territory, then place.`;
      case 'attack': return 'Select your territory, then tap an enemy to attack.';
      case 'fortify': return 'Move armies to an adjacent friendly territory.';
      default: return '';
    }
  };

  const renderActions = () => {
    if (game.awaitingHandoff || !player.isHuman) return null;

    if (phase === 'territoryGrab') {
      if (!selected) return null;
      const ter = game.territories[selected];
      if (ter.owner !== -1) return <HintText>Territory already claimed.</HintText>;
      return (
        <ActionBtn label={`Claim — ${TERRITORY_MAP[selected]?.name ?? selected}`} gold
          onPress={() => dispatch({ type: 'CLAIM_TERRITORY', territory: selected })} />
      );
    }

    if (phase === 'chooseCapital') {
      if (!selected || !selectedOwned) return null;
      if (player.capital) return <HintText>Capital already chosen.</HintText>;
      return (
        <ActionBtn label={`Establish Capital: ${TERRITORY_MAP[selected]?.name ?? selected}`} gold
          onPress={() => dispatch({ type: 'CHOOSE_CAPITAL', territory: selected })} />
      );
    }

    if (phase === 'initialDeploy') {
      if (!selected || !selectedOwned) return null;
      const remaining = game.initialRemaining[player.id] ?? 0;
      if (remaining === 0) return <HintText>All armies placed. Awaiting others.</HintText>;
      return (
        <ActionBtn label={`Place Armies Here  (${remaining} remaining)`} gold
          onPress={() => dispatch({ type: 'PLACE_INITIAL', territory: selected })} />
      );
    }

    if (phase === 'reinforcement') {
      return (
        <View style={styles.actionGroup}>
          {game.mustTrade ? (
            <ActionBtn label="Open Cards — Must Trade First" gold onPress={onOpenCards} />
          ) : (
            <>
              {selected && selectedOwned && game.reinforcementsRemaining > 0 && (
                <View style={styles.deployRow}>
                  <Stepper
                    value={deployAmount}
                    min={1}
                    max={game.reinforcementsRemaining}
                    onChange={setDeployAmount}
                  />
                  <ActionBtn
                    label={`Deploy ${deployAmount}`}
                    gold flex
                    onPress={() => {
                      dispatch({ type: 'DEPLOY', territory: selected, count: deployAmount });
                      setDeployAmount(1);
                    }}
                  />
                </View>
              )}
              {selected && selectedOwned && game.reinforcementsRemaining > 1 && (
                <ActionBtn
                  label={`Deploy All  (${game.reinforcementsRemaining})`}
                  onPress={() => {
                    dispatch({ type: 'DEPLOY', territory: selected, count: game.reinforcementsRemaining });
                    setDeployAmount(1);
                  }}
                />
              )}
              <View style={styles.secondaryRow}>
                {player.cards.length > 0 && (
                  <ActionBtn label={`Cards  (${player.cards.length})`} flex onPress={onOpenCards} />
                )}
                {game.reinforcementsRemaining === 0 && (
                  <ActionBtn label="Begin Attack  ▶▶" gold flex
                    onPress={() => dispatch({ type: 'END_TURN' })} />
                )}
              </View>
            </>
          )}
        </View>
      );
    }

    if (phase === 'attack') {
      return (
        <View style={styles.actionGroup}>
          {selected && selectedOwned && targets.size > 0 && (
            <View style={styles.checkRow}>
              <Pressable onPress={() => setAllOut(!allOut)} style={[styles.checkBox, allOut && styles.checkBoxActive]}>
                <Text style={[styles.checkMark, allOut && styles.checkMarkActive]}>{allOut ? '✓' : ''}</Text>
              </Pressable>
              <Text style={styles.checkLabel}>All-Out Assault</Text>
              {targets.size > 0 && <Text style={styles.tapHint}>· Tap a red territory to attack</Text>}
            </View>
          )}
          <ActionBtn label="End Attack  ▶" onPress={() => dispatch({ type: 'END_ATTACK' })} />
        </View>
      );
    }

    if (phase === 'fortify') {
      return (
        <View style={styles.actionGroup}>
          {selected && selectedOwned && targets.size > 0 && (
            <View style={styles.deployRow}>
              <Stepper
                value={deployAmount}
                min={1}
                max={Math.max(1, (selectedTerritory?.armies ?? 2) - 1)}
                onChange={setDeployAmount}
              />
              <Text style={styles.fortifyHint}>Tap a friendly territory to fortify</Text>
            </View>
          )}
          <ActionBtn label="End Turn  ▶" gold onPress={() => dispatch({ type: 'END_TURN' })} />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Ornate top border */}
      <View style={styles.topBorderOuter} />
      <View style={styles.topBorderInner} />

      {/* Status row */}
      <View style={styles.statusRow}>
        <View style={[styles.playerDisc, { backgroundColor: player.color }]}>
          <Text style={styles.playerDiscInitial}>{player.name[0]}</Text>
        </View>
        <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>

        {/* Phase badge */}
        <View style={styles.phaseBadge}>
          <Text style={styles.phaseText}>{phaseLabel(phase)}</Text>
        </View>

        {phase === 'reinforcement' && game.reinforcementsRemaining > 0 && (
          <View style={styles.reinBadge}>
            <Text style={styles.reinText}>{game.reinforcementsRemaining}</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <Pressable onPress={onOpenRoster} style={styles.iconBtn} hitSlop={8}>
          <Text style={styles.iconBtnText}>⚑</Text>
        </Pressable>
        <Pressable onPress={onOpenLog} style={styles.iconBtn} hitSlop={8}>
          <Text style={styles.iconBtnText}>☰</Text>
        </Pressable>
      </View>

      {/* Selected territory */}
      {selected && (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedName}>{TERRITORY_MAP[selected]?.name ?? selected}</Text>
          <View style={styles.selectedDivider} />
          <Text style={styles.selectedArmies}>{selectedTerritory?.armies ?? 0} troops</Text>
          {selectedTerritory && selectedTerritory.owner >= 0 && (
            <View style={[styles.ownerDisc, { backgroundColor: game.players[selectedTerritory.owner]?.color ?? '#888' }]} />
          )}
          {selectedOwned && <Text style={styles.ownerSelf}>YOURS</Text>}
          {selected && !selectedOwned && selectedTerritory && selectedTerritory.owner >= 0 && (() => {
            const al = allianceBetween(game, player.id, selectedTerritory.owner);
            if (!al) return null;
            return <Text style={styles.allianceTag}>{ALLIANCE_LEVEL_INFO[al.level].name}</Text>;
          })()}
        </View>
      )}

      {/* Phase hint */}
      {!selected && <Text style={styles.phaseHint}>{renderPhaseHint()}</Text>}

      {/* Actions */}
      <View style={styles.actions}>{renderActions()}</View>
    </View>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────
function ActionBtn({ label, onPress, gold, flex, disabled }: {
  label: string; onPress: () => void; gold?: boolean; flex?: boolean; disabled?: boolean;
}) {
  const anim = useRef(new RNAnimated.Value(1)).current;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => RNAnimated.spring(anim, { toValue: 0.97, friction: 8, useNativeDriver: true }).start()}
      onPressOut={() => RNAnimated.spring(anim, { toValue: 1, friction: 6, useNativeDriver: true }).start()}
      style={[flex && { flex: 1 }]}
    >
      <RNAnimated.View style={[
        styles.btn,
        gold ? styles.btnGold : styles.btnDefault,
        disabled && styles.btnDisabled,
        { transform: [{ scale: anim }] },
      ]}>
        <Text style={[styles.btnText, gold && styles.btnTextGold, disabled && styles.btnTextDisabled]}>
          {label}
        </Text>
      </RNAnimated.View>
    </Pressable>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function HintText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

function phaseLabel(phase: string) {
  switch (phase) {
    case 'territoryGrab': return 'CLAIMING';
    case 'election':      return 'ELECTION';
    case 'initialDeploy': return 'DEPLOY';
    case 'chooseCapital': return 'CAPITAL';
    case 'reinforcement': return 'REINFORCE';
    case 'attack':        return 'ATTACK';
    case 'fortify':       return 'FORTIFY';
    case 'gameOver':      return 'VICTORY';
    default: return phase.toUpperCase();
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgPanel,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 6,
  },

  // Ornate top border (double-line)
  topBorderOuter: { height: 2, backgroundColor: Colors.gold, marginBottom: 2 },
  topBorderInner: { height: 1, backgroundColor: Colors.goldDim, marginBottom: 4 },

  // Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerDisc: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.gold + '66',
  },
  playerDiscInitial: { color: '#fff', fontFamily: 'Cinzel_700Bold', fontSize: 12 },
  playerName: { color: Colors.text, fontFamily: 'Cinzel_600SemiBold', fontSize: 13, flexShrink: 1 },
  phaseBadge: {
    backgroundColor: Colors.gold + '22',
    borderWidth: 1, borderColor: Colors.goldDim,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  phaseText: { color: Colors.goldText, fontFamily: 'Cinzel_700Bold', fontSize: 9, letterSpacing: 2 },
  reinBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2,
    minWidth: 24, alignItems: 'center',
  },
  reinText: { color: Colors.bg, fontFamily: 'Cinzel_700Bold', fontSize: 11 },
  iconBtn: { padding: 6 },
  iconBtnText: { fontSize: 18, color: Colors.goldDim },

  // Selected territory
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  selectedName: { color: Colors.text, fontFamily: 'Cinzel_600SemiBold', fontSize: 13 },
  selectedDivider: { width: 1, height: 14, backgroundColor: Colors.border },
  selectedArmies: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 12 },
  ownerDisc: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: Colors.border },
  ownerSelf: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 9, letterSpacing: 2 },
  allianceTag: { color: '#90a860', fontFamily: 'Cinzel_400Regular', fontSize: 9 },

  // Hints
  phaseHint: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 12 },
  hint: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 12 },

  // Action groups
  actions: { gap: 6 },
  actionGroup: { gap: 6 },
  deployRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  fortifyHint: { flex: 1, color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 12 },

  // Check row (all-out)
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkBox: {
    width: 22, height: 22, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center',
  },
  checkBoxActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '22' },
  checkMark: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Cinzel_700Bold' },
  checkMarkActive: { color: Colors.gold },
  checkLabel: { color: Colors.text, fontFamily: 'Cinzel_600SemiBold', fontSize: 12, letterSpacing: 1 },
  tapHint: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 11 },

  // Buttons
  btn: {
    paddingVertical: 11, paddingHorizontal: 14,
    alignItems: 'center', borderWidth: 1,
  },
  btnDefault: { borderColor: Colors.border, backgroundColor: Colors.bgCard },
  btnGold: {
    borderColor: Colors.gold,
    backgroundColor: '#251a08',
    borderWidth: 1.5,
  },
  btnDisabled: { borderColor: Colors.disabled, backgroundColor: Colors.disabled },
  btnText: {
    color: Colors.text, fontFamily: 'Cinzel_600SemiBold',
    fontSize: 12, letterSpacing: 2,
  },
  btnTextGold: { color: Colors.gold },
  btnTextDisabled: { color: Colors.disabledText },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stepBtn: {
    width: 34, height: 34, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  stepBtnText: { color: Colors.text, fontFamily: 'Cinzel_700Bold', fontSize: 18 },
  stepValue: {
    color: Colors.gold, fontFamily: 'Cinzel_900Black',
    fontSize: 22, minWidth: 40, textAlign: 'center',
  },
});
