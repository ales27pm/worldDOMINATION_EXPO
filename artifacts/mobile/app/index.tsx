import React from 'react';
import {
  View, Text, StyleSheet, Pressable, Image as RNImage,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/context/GameContext';
import { Colors } from '@/constants/colors';
import { ART } from '@/lib/art';

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
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
        {/* Title — the "Anno Domini MDCCCXII" heraldic hall */}
        <View style={styles.titleBlock}>
          <RNImage source={{ uri: ART.warCrest }} style={styles.crest} resizeMode="contain" />
          <Text style={styles.subtitle}>ANNO DOMINI MDCCCXII</Text>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            WORLD
          </Text>
          <Text
            style={[styles.title, styles.titleCrimson]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            DOMINATION
          </Text>
          <View style={styles.divider} />
          <View style={styles.heroFrame}>
            <RNImage source={{ uri: ART.heroPainting }} style={styles.hero} resizeMode="cover" />
          </View>
          <Text style={styles.tagline}>
            A Napoleonic campaign of global conquest. Muster your regiments, command the field
            with dice and diplomacy, and bend every continent to your banner.
          </Text>
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
        </ScrollView>
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
  inner: { flex: 1, paddingHorizontal: 32 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  topBorder: { height: 2, backgroundColor: Colors.goldDim, marginTop: 0 },
  bottomBorder: { height: 2, backgroundColor: Colors.goldDim },
  titleBlock: { alignItems: 'center', paddingTop: 16 },
  crest: { width: 110, height: 110, marginBottom: 10 },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    letterSpacing: 6,
    fontFamily: 'IMFellEnglishSC_400Regular',
    marginBottom: 8,
    textShadowColor: 'rgba(21,13,9,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    color: Colors.gold,
    fontSize: 40,
    fontFamily: 'IMFellEnglishSC_400Regular',
    textAlign: 'center',
    letterSpacing: 3,
    lineHeight: 46,
    maxWidth: 330,
    textShadowColor: 'rgba(21,13,9,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleCrimson: { color: Colors.textCrimson },
  divider: {
    width: 160,
    height: 1,
    backgroundColor: Colors.gold,
    marginVertical: 18,
    opacity: 0.5,
  },
  heroFrame: {
    borderWidth: 3,
    borderColor: 'rgba(222,190,115,0.6)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 3,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  hero: { width: 280, height: 186 },
  tagline: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Alegreya_400Regular_Italic',
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 320,
  },
  menu: { gap: 10, paddingVertical: 24 },
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
    fontFamily: 'Alegreya_600SemiBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  btnLabelDanger: { color: Colors.textCrimson },
  btnSub: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Alegreya_400Regular',
    marginTop: 4,
  },
  footer: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Alegreya_400Regular',
    paddingBottom: 16,
    letterSpacing: 1,
  },
});
