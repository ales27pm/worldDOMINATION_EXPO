import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { Colors } from '@/constants/colors';
import { GENERAL_LIST } from '@/game/generals';
import { PLAYER_COLORS } from '@/game/types';
import type { Allocation, CardRule, GeneralId, Objective } from '@/game/types';

interface PlayerConfig {
  name: string;
  colorIdx: number;
  isHuman: boolean;
  generalId: GeneralId | null;
}

const OBJECTIVES: { value: Objective; label: string; desc: string }[] = [
  { value: 'domination60', label: '60% Domination', desc: 'Hold 60% of territories' },
  { value: 'domination80', label: '80% Domination', desc: 'Hold 80% of territories' },
  { value: 'domination100', label: 'World Domination', desc: 'Conquer every territory' },
  { value: 'capital', label: 'Capital RISK', desc: 'Capture enemy capitals' },
  { value: 'mission', label: 'Secret Mission', desc: 'Complete a hidden objective' },
];

const ALLOCATIONS: { value: Allocation; label: string }[] = [
  { value: 'random', label: 'Random Deal' },
  { value: 'grab', label: 'Territory Grab' },
  { value: 'election', label: 'Elections' },
];

const CARD_RULES: { value: CardRule; label: string }[] = [
  { value: 'ascending', label: 'Ascending (classic)' },
  { value: 'ascendingByOne', label: 'Ascending +1' },
  { value: 'setValue', label: 'Set Value' },
];

const AI_GENERALS = GENERAL_LIST.slice(0, 8);

export default function SetupScreen() {
  const router = useRouter();
  const { startGame } = useGame();

  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: 'Commander', colorIdx: 0, isHuman: true, generalId: null },
    { name: 'Bonaparte', colorIdx: 1, isHuman: false, generalId: 'bonaparte' },
    { name: 'Wellington', colorIdx: 2, isHuman: false, generalId: 'wellington' },
  ]);
  const [objective, setObjective] = useState<Objective>('domination60');
  const [allocation, setAllocation] = useState<Allocation>('random');
  const [cardRule, setCardRule] = useState<CardRule>('ascending');
  const [extraTerritories, setExtraTerritories] = useState(false);

  const addPlayer = () => {
    if (players.length >= 6) return;
    const usedColors = new Set(players.map((p) => p.colorIdx));
    const nextColor = [0, 1, 2, 3, 4, 5].find((c) => !usedColors.has(c)) ?? players.length;
    const gen = AI_GENERALS[players.length - 1];
    setPlayers([...players, {
      name: gen?.name ?? `Commander ${players.length + 1}`,
      colorIdx: nextColor,
      isHuman: false,
      generalId: gen?.id ?? null,
    }]);
  };

  const removePlayer = (idx: number) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const updatePlayer = (idx: number, update: Partial<PlayerConfig>) => {
    setPlayers(players.map((p, i) => i === idx ? { ...p, ...update } : p));
  };

  const handleStart = () => {
    const human = players.find((p) => p.isHuman);
    if (!human) {
      Alert.alert('Need a Commander', 'At least one player must be human.');
      return;
    }
    startGame({
      players: players.map((p) => ({
        name: p.name || (p.isHuman ? 'Commander' : 'General'),
        colorIdx: p.colorIdx,
        isHuman: p.isHuman,
        generalId: p.generalId,
      })),
      objective,
      useExtraTerritories: extraTerritories,
      cardRule,
      allocation,
    });
    router.replace('/game');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>NEW CAMPAIGN</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.divider} />

        <ScrollView contentContainerStyle={styles.content}>
          {/* Players */}
          <Section title="COMMANDERS">
            {players.map((p, idx) => (
              <PlayerRow
                key={idx}
                player={p}
                idx={idx}
                canRemove={players.length > 2}
                onChange={(u) => updatePlayer(idx, u)}
                onRemove={() => removePlayer(idx)}
              />
            ))}
            {players.length < 6 && (
              <Pressable onPress={addPlayer} style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ Add Commander</Text>
              </Pressable>
            )}
          </Section>

          {/* Objective */}
          <Section title="VICTORY OBJECTIVE">
            <SegmentedPicker
              options={OBJECTIVES.map((o) => ({ value: o.value, label: o.label }))}
              value={objective}
              onChange={(v) => setObjective(v as Objective)}
            />
          </Section>

          {/* Allocation */}
          <Section title="TERRITORY ALLOCATION">
            <SegmentedPicker
              options={ALLOCATIONS}
              value={allocation}
              onChange={(v) => setAllocation(v as Allocation)}
            />
          </Section>

          {/* Card Rule */}
          <Section title="CARD TRADING RULE">
            <SegmentedPicker
              options={CARD_RULES}
              value={cardRule}
              onChange={(v) => setCardRule(v as CardRule)}
            />
          </Section>

          {/* Extra Territories */}
          <Section title="MAP OPTIONS">
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Extended Map</Text>
                <Text style={styles.switchDesc}>
                  Add 6 extra territories (Hawaii, Svalbard, Falklands, etc.)
                </Text>
              </View>
              <Switch
                value={extraTerritories}
                onValueChange={setExtraTerritories}
                trackColor={{ true: Colors.gold, false: Colors.border }}
                thumbColor={extraTerritories ? Colors.goldDim : Colors.textMuted}
              />
            </View>
          </Section>

          {/* Start Button */}
          <Pressable onPress={handleStart} style={styles.startBtn}>
            <Text style={styles.startBtnText}>⚔ LAUNCH CAMPAIGN</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function PlayerRow({
  player, idx, canRemove, onChange, onRemove,
}: {
  player: PlayerConfig;
  idx: number;
  canRemove: boolean;
  onChange: (u: Partial<PlayerConfig>) => void;
  onRemove: () => void;
}) {
  const color = PLAYER_COLORS[player.colorIdx]?.hex ?? '#888';
  return (
    <View style={styles.playerRow}>
      <View style={[styles.colorDot, { backgroundColor: color }]} />
      <TextInput
        style={[styles.nameInput, { color: Colors.text }]}
        value={player.name}
        onChangeText={(name) => onChange({ name })}
        placeholderTextColor={Colors.textMuted}
        maxLength={20}
      />
      <View style={styles.humanToggle}>
        <Text style={styles.humanLabel}>{player.isHuman ? 'Human' : 'AI'}</Text>
        <Switch
          value={player.isHuman}
          onValueChange={(v) => onChange({ isHuman: v, generalId: v ? null : (AI_GENERALS[idx]?.id ?? null) })}
          trackColor={{ true: Colors.gold, false: Colors.border }}
          thumbColor={player.isHuman ? Colors.goldDim : Colors.textMuted}
          style={{ transform: [{ scale: 0.75 }] }}
        />
      </View>
      {canRemove && (
        <Pressable onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

function SegmentedPicker<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.picker}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[styles.pickerOpt, opt.value === value && styles.pickerOptSelected]}
        >
          <Text style={[styles.pickerOptText, opt.value === value && styles.pickerOptTextSelected]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  backText: { color: Colors.gold, fontFamily: 'Alegreya_500Medium', fontSize: 14 },
  title: { color: Colors.gold, fontFamily: 'IMFellEnglishSC_400Regular', fontSize: 14, letterSpacing: 3 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  content: { padding: 16, gap: 24, paddingBottom: 40 },
  section: { gap: 10 },
  sectionTitle: {
    color: Colors.goldDim, fontFamily: 'Alegreya_600SemiBold', fontSize: 11,
    letterSpacing: 3, textTransform: 'uppercase',
  },
  sectionContent: { gap: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgCard, padding: 12, borderWidth: 1, borderColor: Colors.border,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  nameInput: {
    flex: 1, fontFamily: 'Alegreya_500Medium', fontSize: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 2,
  },
  humanToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  humanLabel: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12 },
  removeBtn: { padding: 4 },
  removeBtnText: { color: Colors.crimson, fontSize: 14 },
  addBtn: {
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
    paddingVertical: 12, alignItems: 'center',
  },
  addBtnText: { color: Colors.textMuted, fontFamily: 'Alegreya_500Medium', fontSize: 14 },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerOpt: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  pickerOptSelected: { borderColor: Colors.gold, backgroundColor: '#2a1d08' },
  pickerOptText: { color: Colors.textMuted, fontFamily: 'Alegreya_500Medium', fontSize: 12 },
  pickerOptTextSelected: { color: Colors.gold },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard, padding: 12, borderWidth: 1, borderColor: Colors.border },
  switchLabel: { color: Colors.text, fontFamily: 'Alegreya_600SemiBold', fontSize: 14 },
  switchDesc: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12, marginTop: 2 },
  startBtn: {
    backgroundColor: Colors.gold, paddingVertical: 18, alignItems: 'center', marginTop: 8,
  },
  startBtnText: {
    color: Colors.bg, fontFamily: 'Alegreya_700Bold', fontSize: 16, letterSpacing: 3,
  },
});
