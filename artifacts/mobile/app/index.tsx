import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ImageBackground,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/context/GameContext';
import { Colors } from '@/constants/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { game, loadingSave, abandonGame } = useGame();

  if (loadingSave) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0d0804', '#1a1005', '#221508']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative border lines */}
      <View style={styles.topBorder} />
      <View style={styles.bottomBorder} />

      <SafeAreaView style={styles.inner}>
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.subtitle}>MDCCCXII</Text>
          <Text style={styles.title}>WORLD{'\n'}DOMINATION</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Campaigns of the Napoleonic Age</Text>
        </View>

        {/* Menu buttons */}
        <View style={styles.menu}>
          {game && (
            <MenuButton
              label="Continue Campaign"
              sub={`Turn ${game.turn} · ${game.phase}`}
              primary
              onPress={() => router.push('/game')}
            />
          )}

          <MenuButton
            label="New Campaign"
            onPress={() => router.push('/setup')}
          />

          {game && (
            <MenuButton
              label="Abandon Campaign"
              danger
              onPress={() => {
                void abandonGame();
              }}
            />
          )}

          <MenuButton
            label="Tournament"
            onPress={() => router.push('/tournament')}
          />

          <MenuButton
            label="Hall of Records"
            onPress={() => router.push('/records')}
          />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          A faithful port of the RISK II campaign system
        </Text>
      </SafeAreaView>
    </View>
  );
}

function MenuButton({
  label, sub, onPress, primary, danger,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.btnPrimary,
        danger && styles.btnDanger,
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnLabel, danger && styles.btnLabelDanger]}>
        {label}
      </Text>
      {sub && <Text style={styles.btnSub}>{sub}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 32 },
  topBorder: { height: 2, backgroundColor: Colors.goldDim, marginTop: 0 },
  bottomBorder: { height: 2, backgroundColor: Colors.goldDim },
  titleBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  subtitle: {
    color: Colors.goldDim,
    fontSize: 12,
    letterSpacing: 6,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  title: {
    color: Colors.gold,
    fontSize: 52,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: 4,
    lineHeight: 56,
    textShadow: `0 0 12px ${Colors.gold}`,
  },
  divider: {
    width: 80,
    height: 1,
    backgroundColor: Colors.gold,
    marginVertical: 20,
    opacity: 0.5,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 2,
    textAlign: 'center',
  },
  menu: { gap: 10, paddingBottom: 24 },
  btn: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  btnPrimary: { borderColor: Colors.gold, backgroundColor: '#2a1d08' },
  btnDanger: { borderColor: Colors.crimson },
  btnPressed: { opacity: 0.7 },
  btnLabel: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  btnLabelDanger: { color: Colors.textCrimson },
  btnSub: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  footer: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    paddingBottom: 16,
    letterSpacing: 1,
  },
});
