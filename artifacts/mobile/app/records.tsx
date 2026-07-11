import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { Colors } from '@/constants/colors';

export default function RecordsScreen() {
  const router = useRouter();
  const { records } = useGame();

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>HALL OF RECORDS</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.divider} />

        {records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No campaigns recorded</Text>
            <Text style={styles.emptyText}>
              Complete a campaign to see your history here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {records.map((r) => (
              <View key={r.id} style={[styles.record, r.won && styles.recordWon]}>
                <View style={styles.recordHeader}>
                  <Text style={[styles.recordResult, r.won ? styles.win : styles.loss]}>
                    {r.won ? '⚔ VICTORY' : '✕ DEFEAT'}
                  </Text>
                  <Text style={styles.recordDate}>{r.date}</Text>
                </View>
                <Text style={styles.recordName}>{r.playerName}</Text>
                <View style={styles.recordStats}>
                  <Stat label="Turns" value={String(r.turns)} />
                  <Stat label="Territories" value={String(r.territories)} />
                  <Stat label="Players" value={String(r.totalPlayers)} />
                  <Stat label="Objective" value={objectiveLabel(r.objective)} />
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function objectiveLabel(obj: string): string {
  const labels: Record<string, string> = {
    domination60: '60%', domination80: '80%', domination100: '100%',
    capital: 'Capital', mission: 'Mission',
  };
  return labels[obj] ?? obj;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  backText: { color: Colors.gold, fontFamily: 'Alegreya_500Medium', fontSize: 14 },
  title: {
    color: Colors.gold, fontFamily: 'IMFellEnglishSC_400Regular', fontSize: 14,
    letterSpacing: 3,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { color: Colors.text, fontFamily: 'Alegreya_600SemiBold', fontSize: 18, marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 14, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  record: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 8,
  },
  recordWon: { borderColor: Colors.goldDim },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordResult: { fontFamily: 'Alegreya_700Bold', fontSize: 12, letterSpacing: 2 },
  win: { color: Colors.gold },
  loss: { color: Colors.textMuted },
  recordDate: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 12 },
  recordName: { color: Colors.text, fontFamily: 'Alegreya_600SemiBold', fontSize: 16 },
  recordStats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  stat: { alignItems: 'center' },
  statValue: { color: Colors.text, fontFamily: 'Alegreya_700Bold', fontSize: 16 },
  statLabel: { color: Colors.textMuted, fontFamily: 'Alegreya_400Regular', fontSize: 10, letterSpacing: 1 },
});
