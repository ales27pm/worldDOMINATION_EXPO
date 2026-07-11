import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
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
      case 'territoryGrab': return 'Tap an unclaimed territory to claim it.';
      case 'election': return 'Participate in the territory auction.';
      case 'initialDeploy': return 'Tap your territory to deploy starting armies.';
      case 'chooseCapital': return 'Tap your territory to establish your capital city.';
      case 'reinforcement':
        if (game.mustTrade) return '⚠ You must trade cards before deploying.';
        if (game.awaitingHandoff) return 'Waiting for handoff confirmation.';
        return `Deploy ${game.reinforcementsRemaining} armies — tap your territory, then use +/− to place.`;
      case 'attack': return 'Select your territory, then tap an enemy to attack.';
      case 'fortify': return 'Move armies from one territory to an adjacent one, then end turn.';
      default: return '';
    }
  };

  const renderActions = () => {
    if (game.awaitingHandoff || !player.isHuman) return null;

    if (phase === 'territoryGrab') {
      if (!selected) return null;
      const ter = game.territories[selected];
      if (ter.owner !== -1) return (
        <Text style={styles.hint}>Territory already claimed.</Text>
      );
      return (
        <ActionBtn label={`Claim ${TERRITORY_MAP[selected]?.name ?? selected}`} gold onPress={() => dispatch({ type: 'CLAIM_TERRITORY', territory: selected })} />
      );
    }

    if (phase === 'chooseCapital') {
      if (!selected || !selectedOwned) return null;
      if (player.capital) return <Text style={styles.hint}>Capital already chosen.</Text>;
      return (
        <ActionBtn label={`Set Capital: ${TERRITORY_MAP[selected]?.name ?? selected}`} gold onPress={() => dispatch({ type: 'CHOOSE_CAPITAL', territory: selected })} />
      );
    }

    if (phase === 'initialDeploy') {
      if (!selected || !selectedOwned) return null;
      const remaining = game.initialRemaining[player.id] ?? 0;
      if (remaining === 0) return <Text style={styles.hint}>All armies placed. Awaiting others.</Text>;
      return (
        <ActionBtn label={`Place armies here (${remaining} left)`} gold onPress={() => dispatch({ type: 'PLACE_INITIAL', territory: selected })} />
      );
    }

    if (phase === 'reinforcement') {
      return (
        <View style={styles.actionGroup}>
          {game.mustTrade ? (
            <ActionBtn label="Open Cards (must trade)" gold onPress={onOpenCards} />
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
                    gold
                    flex
                    onPress={() => {
                      dispatch({ type: 'DEPLOY', territory: selected, count: deployAmount });
                      setDeployAmount(1);
                    }}
                  />
                </View>
              )}
              {selected && selectedOwned && game.reinforcementsRemaining > 1 && (
                <ActionBtn
                  label={`Deploy All (${game.reinforcementsRemaining})`}
                  onPress={() => {
                    dispatch({ type: 'DEPLOY', territory: selected, count: game.reinforcementsRemaining });
                    setDeployAmount(1);
                  }}
                />
              )}
              {player.cards.length > 0 && (
                <ActionBtn label={`Cards (${player.cards.length})`} onPress={onOpenCards} />
              )}
              {game.reinforcementsRemaining === 0 && (
                <ActionBtn label="→ Begin Attack" gold onPress={() => dispatch({ type: 'END_TURN' })} />
              )}
            </>
          )}
        </View>
      );
    }

    if (phase === 'attack') {
      return (
        <View style={styles.actionGroup}>
          {selected && selectedOwned && targets.size > 0 && (
            <View style={styles.allOutRow}>
              <Pressable onPress={() => setAllOut(!allOut)} style={[styles.checkBox, allOut && styles.checkBoxActive]}>
                <Text style={[styles.checkText, allOut && styles.checkTextActive]}>{allOut ? '✓' : ''}</Text>
              </Pressable>
              <Text style={styles.allOutLabel}>All-Out Attack</Text>
            </View>
          )}
          {selected && selectedOwned && targets.size > 0 && (
            <Text style={styles.attackHint}>Tap a red territory to attack</Text>
          )}
          <ActionBtn label="End Attack →" onPress={() => dispatch({ type: 'END_ATTACK' })} />
        </View>
      );
    }

    if (phase === 'fortify') {
      return (
        <View style={styles.actionGroup}>
          {selected && selectedOwned && targets.size > 0 && (
            <>
              <View style={styles.deployRow}>
                <Stepper
                  value={deployAmount}
                  min={1}
                  max={Math.max(1, (selectedTerritory?.armies ?? 2) - 1)}
                  onChange={setDeployAmount}
                />
                <Text style={styles.fortifyHint}>Tap green territory to fortify</Text>
              </View>
            </>
          )}
          <ActionBtn label="End Turn →" gold onPress={() => dispatch({ type: 'END_TURN' })} />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Current player + status */}
      <View style={styles.statusRow}>
        <View style={[styles.playerDot, { backgroundColor: player.color }]} />
        <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.phase}>{phaseLabel(phase)}</Text>
        {phase === 'reinforcement' && game.reinforcementsRemaining > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{game.reinforcementsRemaining}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Pressable onPress={onOpenRoster} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>👥</Text>
        </Pressable>
        <Pressable onPress={onOpenLog} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>📋</Text>
        </Pressable>
      </View>

      {/* Selected territory info */}
      {selected && (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedName}>{TERRITORY_MAP[selected]?.name ?? selected}</Text>
          <Text style={styles.selectedArmies}>{selectedTerritory?.armies ?? 0} armies</Text>
          {selectedTerritory && selectedTerritory.owner >= 0 && (
            <View style={[styles.ownerDot, { backgroundColor: game.players[selectedTerritory.owner]?.color ?? '#888' }]} />
          )}
          {selected && selectedOwned && (
            <Text style={styles.ownerSelf}>YOURS</Text>
          )}
          {/* Alliance info */}
          {selected && !selectedOwned && selectedTerritory && selectedTerritory.owner >= 0 && (() => {
            const alliance = allianceBetween(game, player.id, selectedTerritory.owner);
            if (!alliance) return null;
            return (
              <Text style={styles.allianceBadge}>{ALLIANCE_LEVEL_INFO[alliance.level].name}</Text>
            );
          })()}
        </View>
      )}

      {/* Hint text */}
      {!selected && (
        <Text style={styles.phaseHint}>{renderPhaseHint()}</Text>
      )}

      {/* Action area */}
      <View style={styles.actions}>
        {renderActions()}
      </View>
    </View>
  );
}

function ActionBtn({ label, onPress, gold, flex, disabled }: {
  label: string; onPress: () => void; gold?: boolean; flex?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        gold && styles.btnGold,
        flex && { flex: 1 },
        disabled && styles.btnDisabled,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.btnText, gold && styles.btnTextGold, disabled && styles.btnTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stepper({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.stepBtn}
        disabled={value <= min}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        style={styles.stepBtn}
        disabled={value >= max}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'territoryGrab': return 'CLAIMING';
    case 'election': return 'ELECTION';
    case 'initialDeploy': return 'DEPLOY';
    case 'chooseCapital': return 'CAPITAL';
    case 'reinforcement': return 'REINFORCE';
    case 'attack': return 'ATTACK';
    case 'fortify': return 'FORTIFY';
    case 'gameOver': return 'END';
    default: return phase.toUpperCase();
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerDot: { width: 10, height: 10, borderRadius: 5 },
  playerName: { color: Colors.text, fontFamily: 'Alegreya_600SemiBold', fontSize: 13, flexShrink: 1 },
  phase: { color: Colors.goldDim, fontFamily: 'Alegreya_500Medium', fontSize: 10, letterSpacing: 2 },
  badge: { backgroundColor: Colors.gold, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: Colors.bg, fontFamily: 'Alegreya_700Bold', fontSize: 11 },
  iconBtn: { padding: 4 },
  iconBtnText: { fontSize: 18 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedName: { color: Colors.text, fontFamily: 'Alegreya_600SemiBold', fontSize: 13 },
  selectedArmies: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12 },
  ownerDot: { width: 8, height: 8, borderRadius: 4 },
  ownerSelf: { color: Colors.gold, fontFamily: 'Alegreya_500Medium', fontSize: 10, letterSpacing: 1 },
  allianceBadge: { color: '#90a860', fontFamily: 'Alegreya_500Medium', fontSize: 10 },
  phaseHint: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12 },
  hint: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12 },
  actions: { gap: 6 },
  actionGroup: { gap: 6 },
  deployRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fortifyHint: { flex: 1, color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12 },
  allOutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkBox: {
    width: 22, height: 22, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center',
  },
  checkBoxActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '33' },
  checkText: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Alegreya_700Bold' },
  checkTextActive: { color: Colors.gold },
  allOutLabel: { color: Colors.text, fontFamily: 'Alegreya_500Medium', fontSize: 13 },
  attackHint: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12 },
  btn: {
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
    paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center',
  },
  btnGold: { borderColor: Colors.gold, backgroundColor: '#2a1d08' },
  btnDisabled: { borderColor: Colors.disabled, backgroundColor: Colors.disabled },
  btnText: { color: Colors.text, fontFamily: 'Alegreya_600SemiBold', fontSize: 13, letterSpacing: 1 },
  btnTextGold: { color: Colors.gold },
  btnTextDisabled: { color: Colors.disabledText },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 32, height: 32, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  stepBtnText: { color: Colors.text, fontFamily: 'Alegreya_700Bold', fontSize: 18 },
  stepValue: { color: Colors.gold, fontFamily: 'Alegreya_700Bold', fontSize: 20, minWidth: 36, textAlign: 'center' },
});
