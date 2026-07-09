import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/context/GameContext';
import { Colors } from '@/constants/colors';
import type { GameRecord } from '@/context/GameContext';

export default function RecordsScreen() {
  const router = useRouter();
  const { records } = useGame();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0d0804', '#16100a', '#1e1208']}
        style={StyleSheet.absoluteFillObject}
      />
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
          <Text style={styles.headerTitle}>HALL OF RECORDS</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.goldBar} />

        {/* Subtitle */}
        <View style={styles.subtitleRow}>
          <View style={styles.subtitleLine} />
          <Text style={styles.subtitleDiamond}>◆</Text>
          <Text style={styles.subtitle}>Campaigns of the Napoleonic Age</Text>
          <Text style={styles.subtitleDiamond}>◆</Text>
          <View style={styles.subtitleLine} />
        </View>

        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyTitle}>No Campaigns Recorded</Text>
            <Text style={styles.emptyText}>
              Complete a campaign to inscribe your conquest in the annals of history.
            </Text>
          </View>
        ) : (
          <FlatList
            data={[...records].reverse()}
            keyExtractor={(_, i) => String(i)}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <RecordCard record={item} index={records.length - index} />
            )}
          />
        )}
      </SafeAreaView>

      <View style={styles.bottomBar} />
    </View>
  );
}

function RecordCard({ record, index }: { record: GameRecord; index: number }) {
  const date = new Date(record.date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <View style={styles.card}>
      {/* Card header: index + date */}
      <LinearGradient
        colors={[Colors.wood + 'cc', Colors.bgCard]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.cardHeader}
      >
        <Text style={styles.cardNum}>#{index}</Text>
        <Text style={styles.cardDate}>{date}</Text>
        <Text style={styles.cardTurns}>{record.turns} turns</Text>
      </LinearGradient>

      <View style={styles.cardBody}>
        {/* Outcome */}
        <View style={styles.winnerRow}>
          <Text style={styles.winnerCrown}>{record.won ? '♛' : '☠'}</Text>
          <Text style={[styles.winnerName, { color: record.won ? Colors.gold : Colors.textMuted }]}>
            {record.playerName}
          </Text>
          <Text style={[styles.winnerLabel, { borderColor: record.won ? Colors.goldDim : Colors.border }]}>
            {record.won ? 'VICTOR' : 'DEFEATED'}
          </Text>
        </View>

        {/* Objective */}
        <Text style={styles.objective}>
          {objectiveLabel(record.objective)}
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>⚑ {record.territories} territories</Text>
          <Text style={styles.statText}>👥 {record.totalPlayers} commanders</Text>
        </View>
      </View>
    </View>
  );
}

function objectiveLabel(obj?: string) {
  switch (obj) {
    case 'worldDomination': return '⚑ World Domination';
    case 'capitals':        return '★ Capital Conquest';
    case 'mission':         return '📜 Secret Mission';
    case 'percentage':      return '🌍 Territorial Control';
    default: return obj ?? '';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: { height: 2, backgroundColor: Colors.goldDim },
  safe: { flex: 1 },
  bottomBar: { height: 2, backgroundColor: Colors.goldDim },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, padding: 4 },
  backText: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 16 },
  headerTitle: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 4 },
  goldBar: { height: 2, backgroundColor: Colors.gold },

  subtitleRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8,
  },
  subtitleLine: { flex: 1, height: 1, backgroundColor: Colors.goldDim },
  subtitleDiamond: { color: Colors.goldDim, fontSize: 8 },
  subtitle: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 11 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 16, letterSpacing: 2 },
  emptyText: {
    color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 14, textAlign: 'center', lineHeight: 22,
  },

  // List
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  cardNum: { color: Colors.goldDim, fontFamily: 'Cinzel_700Bold', fontSize: 11 },
  cardDate: { flex: 1, color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 12 },
  cardTurns: { color: Colors.textMuted, fontFamily: 'Cinzel_400Regular', fontSize: 10, letterSpacing: 1 },

  cardBody: { padding: 14, gap: 8 },

  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  winnerCrown: { fontSize: 18, color: Colors.gold },
  winnerName: { fontFamily: 'Cinzel_700Bold', fontSize: 16, flexShrink: 1 },
  winnerLabel: {
    color: Colors.goldDim, fontFamily: 'Cinzel_600SemiBold', fontSize: 9,
    letterSpacing: 2, borderWidth: 1, borderColor: Colors.goldDim,
    paddingHorizontal: 5, paddingVertical: 2,
  },

  objective: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 12 },

  statsRow: { flexDirection: 'row', gap: 16, marginTop: 2 },
  statText: { color: Colors.textMuted, fontFamily: 'Cinzel_400Regular', fontSize: 10, letterSpacing: 1 },
});
