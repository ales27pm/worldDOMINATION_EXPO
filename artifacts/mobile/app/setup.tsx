import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/context/GameContext';
import { Colors } from '@/constants/colors';
import { useSound } from '@/hooks/useSound';
import { useHaptics } from '@/hooks/useHaptics';
import type { GameSetup } from '@/game/types';
import { GENERAL_LIST } from '@/game/generals';

const DEFAULT_COLORS = [
  '#cc3333','#3355cc','#338833','#ccaa33','#884488','#cc7722',
];
const COLOR_NAMES = ['Scarlet','Prussian','Emerald','Imperial','Violet','Amber'];

const DEFAULT_PLAYERS: GameSetup['players'] = [
  { name: 'Commander', colorIdx: 0, isHuman: true, generalId: null },
  { name: GENERAL_LIST[0].name, colorIdx: 1, isHuman: false, generalId: null },
  { name: GENERAL_LIST[1].name, colorIdx: 2, isHuman: false, generalId: null },
];

export default function SetupScreen() {
  const router = useRouter();
  const { startGame } = useGame();
  const play = useSound();
  const haptics = useHaptics();

  const [players, setPlayers] = useState<GameSetup['players']>(DEFAULT_PLAYERS);
  const [objective, setObjective] = useState<GameSetup['objective']>('domination100');
  const [allocation, setAllocation] = useState<NonNullable<GameSetup['allocation']>>('random');
  const [cardRule, setCardRule] = useState<NonNullable<GameSetup['cardRule']>>('ascending');
  const [extraTerritories, setExtraTerritories] = useState(false);

  const addPlayer = () => {
    if (players.length >= 6) return;
    const idx = players.length;
    const general = GENERAL_LIST[idx % GENERAL_LIST.length];
    setPlayers([...players, { name: general.name, colorIdx: idx, isHuman: false, generalId: null }]);
  };

  const removePlayer = (i: number) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, j) => j !== i));
  };

  const updatePlayer = (i: number, patch: Partial<GameSetup['players'][number]>) => {
    setPlayers(players.map((p, j) => j === i ? { ...p, ...patch } : p));
  };

  const handleStart = async () => {
    haptics.success();
    play('tap');
    await startGame({ players, objective, allocation, cardRule, useExtraTerritories: extraTerritories });
    router.replace('/game');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0d0804', '#16100a', '#1e1208']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top border */}
      <View style={styles.topBar} />

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.wood, Colors.woodMid, Colors.wood]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backText}>◀</Text>
          </Pressable>
          <Text style={styles.headerTitle}>CAMPAIGN SETUP</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.goldBar} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Players ──────────────────────────────────────────────── */}
          <SectionHeader title="COMMANDERS" icon="⚑" />
          {players.map((p, i) => (
            <View key={i} style={styles.playerRow}>
              {/* Color swatch */}
              <View style={[styles.colorSwatch, { backgroundColor: DEFAULT_COLORS[p.colorIdx] ?? DEFAULT_COLORS[0] }]}>
                <Text style={styles.colorSwatchNum}>{i + 1}</Text>
              </View>

              {/* Name */}
              <TextInput
                style={styles.nameInput}
                value={p.name}
                onChangeText={(v) => updatePlayer(i, { name: v })}
                maxLength={16}
                placeholderTextColor={Colors.textMuted}
              />

              {/* Human toggle */}
              <View style={styles.humanToggle}>
                <Text style={styles.humanLabel}>{p.isHuman ? '👤' : '🤖'}</Text>
                <Switch
                  value={p.isHuman}
                  onValueChange={(v) => updatePlayer(i, { isHuman: v })}
                  trackColor={{ false: Colors.border, true: Colors.goldDim }}
                  thumbColor={p.isHuman ? Colors.gold : Colors.textMuted}
                />
              </View>

              {/* Remove */}
              {players.length > 2 && (
                <Pressable onPress={() => removePlayer(i)} style={styles.removeBtn} hitSlop={8}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}

          {players.length < 6 && (
            <Pressable onPress={addPlayer} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add Commander</Text>
            </Pressable>
          )}

          {/* ── Objective ────────────────────────────────────────────── */}
          <SectionHeader title="VICTORY CONDITION" icon="♛" />
          <OptionGroup
            options={[
              { value: 'domination100', label: 'World Domination', sub: 'Control all territories' },
              { value: 'domination80', label: 'Near Domination', sub: 'Control 80% of the world' },
              { value: 'domination60', label: 'Percentage Hold', sub: 'Control 60% of the world' },
              { value: 'capital', label: 'Capital Conquest', sub: 'Capture all enemy capitals' },
              { value: 'mission', label: 'Secret Mission', sub: 'Complete a hidden objective' },
            ]}
            value={objective}
            onChange={(v) => setObjective(v as GameSetup['objective'])}
          />

          {/* ── Allocation ───────────────────────────────────────────── */}
          <SectionHeader title="TERRITORY ALLOCATION" icon="🌍" />
          <OptionGroup
            options={[
              { value: 'random', label: 'Random Draft', sub: 'Territories dealt at random' },
              { value: 'grab', label: 'Territory Grab', sub: 'Players claim territories in turn' },
              { value: 'election', label: 'Auction', sub: 'Bid for territories with points' },
            ]}
            value={allocation}
            onChange={(v) => setAllocation(v as NonNullable<GameSetup['allocation']>)}
          />

          {/* ── Card Rule ────────────────────────────────────────────── */}
          <SectionHeader title="REINFORCEMENT CARDS" icon="🃏" />
          <OptionGroup
            options={[
              { value: 'ascending', label: 'Escalating', sub: 'Increasing trade values (classic)' },
              { value: 'setValue', label: 'Fixed Values', sub: 'Consistent trade bonuses' },
            ]}
            value={cardRule}
            onChange={(v) => setCardRule(v as NonNullable<GameSetup['cardRule']>)}
          />

          {/* ── Extra territories toggle ──────────────────────────────── */}
          <SectionHeader title="MAP OPTIONS" icon="⚓" />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Extended Map</Text>
              <Text style={styles.toggleSub}>Add islands: Hawaii, Svalbard, Falklands & more</Text>
            </View>
            <Switch
              value={extraTerritories}
              onValueChange={setExtraTerritories}
              trackColor={{ false: Colors.border, true: Colors.goldDim }}
              thumbColor={extraTerritories ? Colors.gold : Colors.textMuted}
            />
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Launch ───────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <View style={styles.footerBorder} />
          <Pressable onPress={handleStart} style={({ pressed }) => [styles.launchBtn, pressed && { opacity: 0.88 }]}>
            <LinearGradient
              colors={[Colors.goldDim, Colors.gold, Colors.goldDim]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.launchBtnGrad}
            >
              <Text style={styles.launchBtnText}>⚔  BEGIN CAMPAIGN</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <View style={sStyles.headerRow}>
      {icon && <Text style={sStyles.icon}>{icon}</Text>}
      <Text style={sStyles.title}>{title}</Text>
      <View style={sStyles.line} />
    </View>
  );
}

function OptionGroup({ options, value, onChange }: {
  options: { value: string; label: string; sub?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={sStyles.group}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)} style={[sStyles.option, active && sStyles.optionActive]}>
            <View style={[sStyles.radio, active && sStyles.radioActive]}>
              {active && <View style={sStyles.radioDot} />}
            </View>
            <View style={sStyles.optionText}>
              <Text style={[sStyles.optionLabel, active && sStyles.optionLabelActive]}>{opt.label}</Text>
              {opt.sub && <Text style={sStyles.optionSub}>{opt.sub}</Text>}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: { height: 2, backgroundColor: Colors.goldDim },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4, width: 40 },
  backText: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 16 },
  headerTitle: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 4 },
  goldBar: { height: 2, backgroundColor: Colors.gold },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Player rows
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgPanel, borderWidth: 1,
    borderColor: Colors.border, padding: 10,
  },
  colorSwatch: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.border,
  },
  colorSwatchNum: { color: '#fff', fontFamily: 'Cinzel_900Black', fontSize: 14 },
  nameInput: {
    flex: 1, color: Colors.text, fontFamily: 'Cinzel_400Regular',
    fontSize: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: 4,
  },
  humanToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  humanLabel: { fontSize: 16 },
  removeBtn: { padding: 6 },
  removeText: { color: Colors.textMuted, fontSize: 16, fontFamily: 'Cinzel_400Regular' },

  addBtn: {
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
    paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.bgField,
  },
  addBtnText: { color: Colors.textMuted, fontFamily: 'Cinzel_400Regular', fontSize: 12, letterSpacing: 2 },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.border, padding: 14,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { color: Colors.text, fontFamily: 'Cinzel_600SemiBold', fontSize: 13, letterSpacing: 1 },
  toggleSub: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 11, marginTop: 2 },

  // Footer / launch
  footer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  footerBorder: { height: 1, backgroundColor: Colors.goldDim, marginBottom: 12 },
  launchBtn: {},
  launchBtnGrad: {
    paddingVertical: 17, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.goldBright,
  },
  launchBtnText: { color: Colors.bg, fontFamily: 'Cinzel_900Black', fontSize: 15, letterSpacing: 4 },
});

// Section sub-styles
const sStyles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  icon: { fontSize: 14, color: Colors.goldDim },
  title: { color: Colors.goldDim, fontFamily: 'Cinzel_700Bold', fontSize: 9, letterSpacing: 4 },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },

  group: { gap: 2 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.border,
    padding: 12,
  },
  optionActive: { borderColor: Colors.goldDim, backgroundColor: '#251a08' },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: Colors.gold },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold },
  optionText: { flex: 1 },
  optionLabel: { color: Colors.textMuted, fontFamily: 'Cinzel_600SemiBold', fontSize: 12, letterSpacing: 1 },
  optionLabelActive: { color: Colors.text },
  optionSub: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 11, marginTop: 2 },
});
