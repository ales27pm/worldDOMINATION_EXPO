import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  ActivityIndicator, Image, Animated as RNAnimated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/context/GameContext';
import { Colors } from '@/constants/colors';
import { useSound } from '@/hooks/useSound';
import { useHaptics } from '@/hooks/useHaptics';

// Ornate horizontal rule with diamond
function OrnateRule({ color = Colors.goldDim }: { color?: string }) {
  return (
    <View style={[styles.rule, { borderColor: color }]}>
      <View style={[styles.ruleLeft, { backgroundColor: color }]} />
      <Text style={[styles.ruleDiamond, { color }]}>◆</Text>
      <View style={[styles.ruleRight, { backgroundColor: color }]} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { game, loadingSave, abandonGame } = useGame();
  const play = useSound();
  const haptics = useHaptics();
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(30)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.92)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      RNAnimated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const onPress = (action: () => void) => {
    haptics.light();
    play('tap');
    action();
  };

  if (loadingSave) {
    return (
      <View style={styles.loading}>
        <LinearGradient colors={['#0d0804', '#16100a', '#1e1208']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator color={Colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading Campaign...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Layered mahogany gradient */}
      <LinearGradient
        colors={['#0d0804', '#16100a', '#1e1208', '#16100a', '#0d0804']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top decorative border */}
      <View style={styles.topBorderWrapper}>
        <View style={styles.borderOuter} />
        <View style={styles.borderInner} />
      </View>

      <SafeAreaView style={styles.inner}>

        {/* ── Title block ──────────────────────────────────────────── */}
        <RNAnimated.View style={[styles.titleBlock, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        }]}>
          {/* Crest */}
          <Image
            source={require('@/assets/images/game-crest.png')}
            style={styles.crest}
            resizeMode="contain"
          />

          <Text style={styles.dateText}>MDCCCXII</Text>

          <Text style={styles.titleLine1}>WORLD</Text>
          <Text style={styles.titleLine2}>DOMINATION</Text>

          <OrnateRule color={Colors.gold} />

          <Text style={styles.tagline}>Campaigns of the Napoleonic Age</Text>
        </RNAnimated.View>

        {/* ── Menu ─────────────────────────────────────────────────── */}
        <RNAnimated.View style={[styles.menu, { opacity: fadeAnim }]}>

          {game && (
            <MenuButton
              label="Continue Campaign"
              sub={`Turn ${game.turn}  ·  ${game.phase.toUpperCase()}`}
              icon="⚔"
              primary
              onPress={() => onPress(() => router.push('/game'))}
            />
          )}

          <MenuButton
            label="New Campaign"
            icon="🌍"
            onPress={() => onPress(() => router.push('/setup'))}
          />

          {game && (
            <MenuButton
              label="Abandon Campaign"
              icon="✕"
              danger
              onPress={() => onPress(() => { void abandonGame(); })}
            />
          )}

          <MenuButton
            label="Hall of Records"
            icon="📜"
            onPress={() => onPress(() => router.push('/records'))}
          />
        </RNAnimated.View>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <RNAnimated.View style={{ opacity: fadeAnim }}>
          <OrnateRule color={Colors.goldDim} />
          <Text style={styles.footer}>
            A faithful port of the RISK II campaign system
          </Text>
        </RNAnimated.View>

      </SafeAreaView>

      {/* Bottom decorative border */}
      <View style={styles.bottomBorderWrapper}>
        <View style={styles.borderInner} />
        <View style={styles.borderOuter} />
      </View>
    </View>
  );
}

// ─── Menu Button ──────────────────────────────────────────────────────────────
function MenuButton({ label, sub, icon, onPress, primary, danger }: {
  label: string; sub?: string; icon?: string;
  onPress: () => void; primary?: boolean; danger?: boolean;
}) {
  const pressAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(pressAnim, { toValue: 0.97, friction: 8, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    RNAnimated.spring(pressAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <RNAnimated.View style={[
        styles.btn,
        primary && styles.btnPrimary,
        danger && styles.btnDanger,
        { transform: [{ scale: pressAnim }] },
      ]}>
        {/* Outer decorative border */}
        <View style={[
          styles.btnInner,
          primary && styles.btnInnerPrimary,
          danger && styles.btnInnerDanger,
        ]}>
          {/* Corner accents */}
          <Text style={[styles.btnCorner, styles.btnCornerTL, danger ? styles.cornerDanger : styles.cornerGold]}>◤</Text>
          <Text style={[styles.btnCorner, styles.btnCornerTR, danger ? styles.cornerDanger : styles.cornerGold]}>◥</Text>
          <Text style={[styles.btnCorner, styles.btnCornerBL, danger ? styles.cornerDanger : styles.cornerGold]}>◣</Text>
          <Text style={[styles.btnCorner, styles.btnCornerBR, danger ? styles.cornerDanger : styles.cornerGold]}>◢</Text>

          <View style={styles.btnContent}>
            {icon && <Text style={[styles.btnIcon, danger && styles.btnIconDanger]}>{icon}</Text>}
            <View>
              <Text style={[styles.btnLabel, primary && styles.btnLabelPrimary, danger && styles.btnLabelDanger]}>
                {label}
              </Text>
              {sub && <Text style={styles.btnSub}>{sub}</Text>}
            </View>
          </View>
        </View>
      </RNAnimated.View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: Colors.textMuted, fontFamily: 'Cinzel_400Regular', fontSize: 12, letterSpacing: 3 },

  topBorderWrapper: { paddingHorizontal: 0 },
  bottomBorderWrapper: { paddingHorizontal: 0 },
  borderOuter: { height: 3, backgroundColor: Colors.goldDim },
  borderInner: { height: 1, backgroundColor: Colors.gold, marginTop: 3, marginBottom: 0 },

  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 },

  // Title
  titleBlock: { alignItems: 'center', paddingTop: 16 },
  crest: { width: 110, height: 110, marginBottom: 8 },
  dateText: {
    color: Colors.goldDim,
    fontFamily: 'Cinzel_400Regular',
    fontSize: 11,
    letterSpacing: 6,
    marginBottom: 6,
  },
  titleLine1: {
    color: Colors.gold,
    fontFamily: 'Cinzel_900Black',
    fontSize: 54,
    letterSpacing: 8,
    lineHeight: 58,
    textShadowColor: Colors.gold,
    textShadowRadius: 16,
  },
  titleLine2: {
    color: Colors.gold,
    fontFamily: 'Cinzel_900Black',
    fontSize: 40,
    letterSpacing: 5,
    lineHeight: 46,
    textShadowColor: Colors.gold,
    textShadowRadius: 16,
  },
  tagline: {
    color: Colors.textMuted,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 4,
  },

  // Ornate rule
  rule: { flexDirection: 'row', alignItems: 'center', width: '70%', marginVertical: 14 },
  ruleLeft: { flex: 1, height: 1 },
  ruleDiamond: { fontSize: 10, marginHorizontal: 6 },
  ruleRight: { flex: 1, height: 1 },

  // Menu
  menu: { gap: 10, paddingBottom: 8 },

  btn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  btnPrimary: { borderColor: Colors.gold },
  btnDanger: { borderColor: Colors.crimson },

  btnInner: {
    borderWidth: 1,
    borderColor: Colors.border,
    margin: 3,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.bgCard,
    position: 'relative',
  },
  btnInnerPrimary: { borderColor: Colors.goldDim, backgroundColor: '#251a08' },
  btnInnerDanger: { borderColor: Colors.crimson + '55', backgroundColor: '#1e0c0c' },

  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnIcon: { fontSize: 20, color: Colors.goldDim },
  btnIconDanger: { color: Colors.crimson },

  // Corner decorations
  btnCorner: { position: 'absolute', fontSize: 10, lineHeight: 10 },
  btnCornerTL: { top: 2, left: 2 },
  btnCornerTR: { top: 2, right: 2 },
  btnCornerBL: { bottom: 2, left: 2 },
  btnCornerBR: { bottom: 2, right: 2 },
  cornerGold: { color: Colors.goldDim },
  cornerDanger: { color: Colors.crimson },

  btnLabel: {
    color: Colors.text,
    fontFamily: 'Cinzel_600SemiBold',
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  btnLabelPrimary: { color: Colors.gold },
  btnLabelDanger: { color: Colors.textCrimson },
  btnSub: {
    color: Colors.textMuted,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 11,
    marginTop: 2,
  },

  footer: {
    color: Colors.textMuted,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 10,
    letterSpacing: 1,
  },
});
