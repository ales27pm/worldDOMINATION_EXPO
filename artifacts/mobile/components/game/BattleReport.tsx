import React, { useEffect, useRef } from 'react';
import { Image, View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Colors } from '@/constants/colors';
import type { BattleReport, GameState } from '@/game/types';
import { TERRITORY_MAP } from '@/game/mapData';

interface Props {
  battle: BattleReport;
  game: GameState;
}

// ─── Authentic RISK II dice sprite map ────────────────────────────────────────
// Static require() calls required by Metro bundler (no dynamic requires)
const DICE_SPRITES = {
  red: {
    1: require('@/assets/images/dice/red_1.png'),
    2: require('@/assets/images/dice/red_2.png'),
    3: require('@/assets/images/dice/red_3.png'),
    4: require('@/assets/images/dice/red_4.png'),
    5: require('@/assets/images/dice/red_5.png'),
    6: require('@/assets/images/dice/red_6.png'),
  },
  white: {
    1: require('@/assets/images/dice/white_1.png'),
    2: require('@/assets/images/dice/white_2.png'),
    3: require('@/assets/images/dice/white_3.png'),
    4: require('@/assets/images/dice/white_4.png'),
    5: require('@/assets/images/dice/white_5.png'),
    6: require('@/assets/images/dice/white_6.png'),
  },
} as const;

// ─── Animated die face using RISK II pixel-art sprites ───────────────────────
function DieFace({
  value,
  diceColor,
  delay = 0,
  nonce,
}: {
  value: number;
  diceColor: 'red' | 'white';
  delay?: number;
  /** Increments on every new battle so animation re-triggers even for identical roll values */
  nonce: number;
}) {
  const shakeX = useRef(new RNAnimated.Value(0)).current;
  const shakeY = useRef(new RNAnimated.Value(0)).current;
  const scale  = useRef(new RNAnimated.Value(0.4)).current;

  useEffect(() => {
    // Reset and re-animate on every new battle (nonce changes) regardless of value
    scale.setValue(0.4);
    shakeX.setValue(0);
    shakeY.setValue(0);
    RNAnimated.sequence([
      RNAnimated.delay(delay),
      RNAnimated.parallel([
        RNAnimated.spring(scale, { toValue: 1.2, friction: 4, tension: 120, useNativeDriver: true }),
        RNAnimated.sequence([
          RNAnimated.timing(shakeX, { toValue: -7, duration: 55, useNativeDriver: true }),
          RNAnimated.timing(shakeX, { toValue:  7, duration: 55, useNativeDriver: true }),
          RNAnimated.timing(shakeX, { toValue: -4, duration: 45, useNativeDriver: true }),
          RNAnimated.timing(shakeX, { toValue:  4, duration: 45, useNativeDriver: true }),
          RNAnimated.timing(shakeX, { toValue:  0, duration: 35, useNativeDriver: true }),
        ]),
        RNAnimated.sequence([
          RNAnimated.timing(shakeY, { toValue: -4, duration: 50, useNativeDriver: true }),
          RNAnimated.timing(shakeY, { toValue:  4, duration: 50, useNativeDriver: true }),
          RNAnimated.timing(shakeY, { toValue:  0, duration: 35, useNativeDriver: true }),
        ]),
      ]),
      RNAnimated.spring(scale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [nonce, delay]); // nonce guarantees re-animation even when roll values are identical

  const clampedVal = Math.max(1, Math.min(6, value)) as 1 | 2 | 3 | 4 | 5 | 6;
  const src = DICE_SPRITES[diceColor][clampedVal];

  return (
    <RNAnimated.View
      style={[
        styles.dieContainer,
        { transform: [{ translateX: shakeX }, { translateY: shakeY }, { scale }] },
      ]}
    >
      <Image source={src} style={styles.dieImage} resizeMode="contain" />
    </RNAnimated.View>
  );
}

// ─── Main battle report card ─────────────────────────────────────────────────
export default function BattleReportCard({ battle, game }: Props) {
  const attacker = game.players[battle.attacker];
  const defender = game.players[battle.defender];
  const conquered = battle.conquered;

  // Increment on every new battle so DieFace always re-animates
  const nonceRef = useRef(0);
  const prevBattleRef = useRef(battle);
  if (prevBattleRef.current !== battle) {
    nonceRef.current += 1;
    prevBattleRef.current = battle;
  }
  const nonce = nonceRef.current;

  const resultAnim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    resultAnim.setValue(0);
    RNAnimated.spring(resultAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [battle]);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.swords}>⚔</Text>
          <Text style={styles.labelText}>LAST BATTLE</Text>
        </View>
        <RNAnimated.Text style={[
          styles.result,
          conquered ? styles.conquered : styles.repelled,
          { transform: [{ scale: resultAnim }] },
        ]}>
          {conquered ? '⚑ CONQUERED' : '◎ REPELLED'}
        </RNAnimated.Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Battle sides */}
      <View style={styles.battle}>
        {/* Attacker */}
        <View style={styles.side}>
          <View style={[styles.playerColor, { backgroundColor: attacker?.color ?? '#888' }]} />
          <Text style={styles.playerName} numberOfLines={1}>{attacker?.name ?? '?'}</Text>
          <Text style={styles.territory}>{TERRITORY_MAP[battle.from]?.name ?? battle.from}</Text>
          <View style={styles.diceRow}>
            {battle.attackerRolls.map((r, i) => (
              <DieFace key={i} value={r} diceColor="red" delay={i * 80} nonce={nonce} />
            ))}
          </View>
          <Text style={styles.losses}>-{battle.attackerLosses}</Text>
        </View>

        {/* VS */}
        <View style={styles.vsCol}>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.roundsText}>{battle.rounds}r</Text>
        </View>

        {/* Defender */}
        <View style={styles.side}>
          <View style={[styles.playerColor, { backgroundColor: defender?.color ?? '#888' }]} />
          <Text style={styles.playerName} numberOfLines={1}>{defender?.name ?? '?'}</Text>
          <Text style={styles.territory}>{TERRITORY_MAP[battle.to]?.name ?? battle.to}</Text>
          <View style={styles.diceRow}>
            {battle.defenderRolls.map((r, i) => (
              <DieFace key={i} value={r} diceColor="white" delay={i * 80 + 40} nonce={nonce} />
            ))}
          </View>
          <Text style={styles.losses}>-{battle.defenderLosses}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: Colors.border,
    borderTopWidth: 0,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.wood + 'aa',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swords: { fontSize: 13, color: Colors.goldDim },
  labelText: { color: Colors.goldDim, fontFamily: 'Cinzel_600SemiBold', fontSize: 9, letterSpacing: 2 },
  result: { fontFamily: 'Cinzel_700Bold', fontSize: 10, letterSpacing: 2 },
  conquered: { color: Colors.gold },
  repelled: { color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border },
  battle: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  side: { flex: 1, alignItems: 'center', gap: 3 },
  playerColor: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  playerName: { color: Colors.text, fontFamily: 'Cinzel_600SemiBold', fontSize: 11 },
  territory: {
    color: Colors.textMuted,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 10,
    textAlign: 'center',
  },
  diceRow: { flexDirection: 'row', gap: 6, marginVertical: 2 },
  dieContainer: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  dieImage: {
    width: 40, height: 40,
  },
  losses: { fontFamily: 'Cinzel_700Bold', fontSize: 14, color: Colors.textCrimson },
  vsCol: { alignItems: 'center', gap: 2, width: 32 },
  vsText: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 11, letterSpacing: 2 },
  roundsText: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 9 },
});
