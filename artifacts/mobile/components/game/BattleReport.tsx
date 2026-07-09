import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  View,
  Text,
  StyleSheet,
  Animated as RNAnimated,
  type ImageSourcePropType,
} from 'react-native';
import { Colors } from '@/constants/colors';
import type { BattleReport, GameState } from '@/game/types';
import { TERRITORY_MAP } from '@/game/mapData';
import { DICE_URLS, FIREWORKS_FRAMES, battleViewUrl } from '@/lib/storage';

interface Props {
  battle: BattleReport;
  game: GameState;
}

// ─── Dice source map ─────────────────────────────────────────────────────────
// App Storage URIs for available faces; bundled PNGs as fallback for gaps.
// Red attacker: App Storage has 1,4,5,6 → bundled for 2,3
// Gold defender: App Storage has 1–5  → bundled white_6 for 6
const DICE_SOURCES: Record<'red' | 'gold', Record<1 | 2 | 3 | 4 | 5 | 6, ImageSourcePropType>> = {
  red: {
    1: { uri: DICE_URLS.red[1] },
    2: require('@/assets/images/dice/red_2.png'),
    3: require('@/assets/images/dice/red_3.png'),
    4: { uri: DICE_URLS.red[4] },
    5: { uri: DICE_URLS.red[5] },
    6: { uri: DICE_URLS.red[6] },
  },
  gold: {
    1: { uri: DICE_URLS.gold[1] },
    2: { uri: DICE_URLS.gold[2] },
    3: { uri: DICE_URLS.gold[3] },
    4: { uri: DICE_URLS.gold[4] },
    5: { uri: DICE_URLS.gold[5] },
    6: require('@/assets/images/dice/white_6.png'),
  },
};

// ─── Animated die face ────────────────────────────────────────────────────────
function DieFace({
  value,
  diceColor,
  delay = 0,
  nonce,
}: {
  value: number;
  diceColor: 'red' | 'gold';
  delay?: number;
  nonce: number;
}) {
  const shakeX = useRef(new RNAnimated.Value(0)).current;
  const shakeY = useRef(new RNAnimated.Value(0)).current;
  const scale  = useRef(new RNAnimated.Value(0.4)).current;

  useEffect(() => {
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
  }, [nonce, delay]);

  const clampedVal = Math.max(1, Math.min(6, value)) as 1 | 2 | 3 | 4 | 5 | 6;
  const src = DICE_SOURCES[diceColor][clampedVal];

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

// ─── Fireworks overlay (21-frame loop, shown on conquest) ────────────────────
// Mounts fresh on every new conquest via `key`. Cleans up interval on fade-out
// completion so no rogue ticks run after the animation finishes.
function FireworksOverlay() {
  const [frameIdx, setFrameIdx] = useState(0);
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const FRAME_MS = 70;
    const LOOPS    = 2;
    const TOTAL_MS = FRAME_MS * FIREWORKS_FRAMES.length * LOOPS;
    const FADE_MS  = 400;

    // Fade in
    RNAnimated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    // Cycle frames
    const interval = setInterval(() => {
      setFrameIdx(prev => (prev + 1) % FIREWORKS_FRAMES.length);
    }, FRAME_MS);

    // Fade out near end, then stop the interval once animation completes
    const fadeTimer = setTimeout(() => {
      RNAnimated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
        clearInterval(interval);
      });
    }, TOTAL_MS - FADE_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <RNAnimated.View style={[styles.fireworksOverlay, { opacity }]} pointerEvents="none">
      <Image
        source={{ uri: FIREWORKS_FRAMES[frameIdx] }}
        style={styles.fireworksImage}
        resizeMode="contain"
      />
    </RNAnimated.View>
  );
}

// ─── Main battle report card ──────────────────────────────────────────────────
export default function BattleReportCard({ battle, game }: Props) {
  const attacker = game.players[battle.attacker];
  const defender = game.players[battle.defender];
  const conquered = battle.conquered;

  // Nonce ensures animation fires even on identical consecutive rolls
  const nonceRef = useRef(0);
  const prevBattleRef = useRef(battle);
  if (prevBattleRef.current !== battle) {
    nonceRef.current += 1;
    prevBattleRef.current = battle;
  }
  const nonce = nonceRef.current;

  // Fireworks key — every new battle that is a conquest gets a unique key,
  // so back-to-back conquests each remount FireworksOverlay correctly.
  // We reuse `nonce` (already incremented per battle) combined with conquered.
  const fireworksKey = conquered ? nonce : -1;

  const resultAnim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    resultAnim.setValue(0);
    RNAnimated.spring(resultAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [battle]);

  // Use the defended territory's background image
  const bgUri = battleViewUrl(battle.to);

  return (
    <View style={styles.card}>
      {/* Territory battle-view background */}
      <ImageBackground
        source={{ uri: bgUri }}
        style={styles.battleBg}
        imageStyle={styles.battleBgImage}
      >
        {/* Dark scrim so text remains legible */}
        <View style={styles.scrim} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.swords}>⚔</Text>
            <Text style={styles.labelText}>LAST BATTLE</Text>
          </View>
          <RNAnimated.Text
            style={[
              styles.result,
              conquered ? styles.conquered : styles.repelled,
              { transform: [{ scale: resultAnim }] },
            ]}
          >
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
                <DieFace key={i} value={r} diceColor="gold" delay={i * 80 + 40} nonce={nonce} />
              ))}
            </View>
            <Text style={styles.losses}>-{battle.defenderLosses}</Text>
          </View>
        </View>
      </ImageBackground>

      {/* Fireworks overlay — remounts on each conquest */}
      {conquered && <FireworksOverlay key={fireworksKey} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderTopWidth: 0,
    overflow: 'hidden',
  },
  battleBg: {
    width: '100%',
  },
  battleBgImage: {
    opacity: 0.55,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,6,2,0.55)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.wood + 'bb',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swords:    { fontSize: 13, color: Colors.goldDim },
  labelText: {
    color: Colors.goldDim,
    fontFamily: 'Cinzel_600SemiBold',
    fontSize: 9,
    letterSpacing: 2,
  },
  result: { fontFamily: 'Cinzel_700Bold', fontSize: 10, letterSpacing: 2 },
  conquered: { color: Colors.gold },
  repelled:  { color: Colors.textMuted },
  divider:   { height: 1, backgroundColor: Colors.border },
  battle:    { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  side:      { flex: 1, alignItems: 'center', gap: 3 },
  playerColor: {
    width: 12, height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerName: { color: Colors.text, fontFamily: 'Cinzel_600SemiBold', fontSize: 11 },
  territory: {
    color: Colors.textMuted,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 10,
    textAlign: 'center',
  },
  diceRow:    { flexDirection: 'row', gap: 6, marginVertical: 2 },
  dieContainer: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dieImage:   { width: 40, height: 40 },
  losses:     { fontFamily: 'Cinzel_700Bold', fontSize: 14, color: Colors.textCrimson },
  vsCol:      { alignItems: 'center', gap: 2, width: 32 },
  vsText:     { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 11, letterSpacing: 2 },
  roundsText: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 9 },

  // Fireworks
  fireworksOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireworksImage: {
    width: 180,
    height: 180,
  },
});
