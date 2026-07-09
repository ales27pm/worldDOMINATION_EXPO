import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { DICE_TIER_COLORS } from '@/game/dice';
import type { BattleReport, GameState } from '@/game/types';
import { TERRITORY_MAP } from '@/game/mapData';

interface Props {
  battle: BattleReport;
  game: GameState;
}

export default function BattleReportCard({ battle, game }: Props) {
  const attacker = game.players[battle.attacker];
  const defender = game.players[battle.defender];
  const atkColors = DICE_TIER_COLORS[battle.attackerTier];
  const defColors = DICE_TIER_COLORS[battle.defenderTier];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>LAST BATTLE</Text>
        <Text style={[styles.result, battle.conquered ? styles.conquered : styles.repelled]}>
          {battle.conquered ? 'CONQUERED' : 'REPELLED'}
        </Text>
      </View>

      <View style={styles.battle}>
        {/* Attacker side */}
        <View style={styles.side}>
          <View style={[styles.colorDot, { backgroundColor: attacker?.color ?? '#888' }]} />
          <Text style={styles.playerName} numberOfLines={1}>{attacker?.name ?? '?'}</Text>
          <Text style={styles.territory}>{TERRITORY_MAP[battle.from]?.name ?? battle.from}</Text>
          <View style={styles.dice}>
            {battle.attackerRolls.map((r, i) => (
              <View key={i} style={[styles.die, { backgroundColor: atkColors.fill }]}>
                <Text style={[styles.dieText, { color: atkColors.text }]}>{r}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.losses, { color: Colors.textCrimson }]}>-{battle.attackerLosses}</Text>
        </View>

        <View style={styles.vsCol}>
          <Text style={styles.vs}>⚔</Text>
          <Text style={styles.rounds}>{battle.rounds}r</Text>
        </View>

        {/* Defender side */}
        <View style={styles.side}>
          <View style={[styles.colorDot, { backgroundColor: defender?.color ?? '#888' }]} />
          <Text style={styles.playerName} numberOfLines={1}>{defender?.name ?? '?'}</Text>
          <Text style={styles.territory}>{TERRITORY_MAP[battle.to]?.name ?? battle.to}</Text>
          <View style={styles.dice}>
            {battle.defenderRolls.map((r, i) => (
              <View key={i} style={[styles.die, { backgroundColor: defColors.fill }]}>
                <Text style={[styles.dieText, { color: defColors.text }]}>{r}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.losses, { color: Colors.textCrimson }]}>-{battle.defenderLosses}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1,
    borderColor: Colors.border, padding: 10, gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 2 },
  result: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2 },
  conquered: { color: Colors.gold },
  repelled: { color: Colors.textMuted },
  battle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { flex: 1, alignItems: 'center', gap: 4 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  playerName: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  territory: { color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },
  dice: { flexDirection: 'row', gap: 4 },
  die: {
    width: 26, height: 26, borderRadius: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  dieText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  losses: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  vsCol: { alignItems: 'center', gap: 2 },
  vs: { fontSize: 18, color: Colors.gold },
  rounds: { color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 10 },
});
