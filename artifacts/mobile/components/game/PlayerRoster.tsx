import React from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { wholeContinents } from '@/game/analysis';
import type { GameState, PlayerState } from '@/game/types';

interface Props {
  game: GameState;
  visible: boolean;
  onClose: () => void;
}

export default function PlayerRoster({ game, visible, onClose }: Props) {
  const sorted = [...game.players].sort((a, b) => {
    const aTerr = game.activeIds.filter((id) => game.territories[id]?.owner === a.id).length;
    const bTerr = game.activeIds.filter((id) => game.territories[id]?.owner === b.id).length;
    return bTerr - aTerr;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {/* Header */}
          <LinearGradient
            colors={[Colors.wood, Colors.woodMid, Colors.wood]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>ORDER OF BATTLE</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </LinearGradient>
          <View style={styles.goldBar} />

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {sorted.map((player, rank) => (
              <PlayerCard
                key={player.id}
                player={player}
                game={game}
                rank={rank + 1}
                isCurrent={player.id === game.currentPlayer}
              />
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function PlayerCard({ player, game, rank, isCurrent }: {
  player: PlayerState; game: GameState; rank: number; isCurrent: boolean;
}) {
  const territories = game.activeIds.filter((id) => game.territories[id]?.owner === player.id);
  const armies = territories.reduce((sum, id) => sum + (game.territories[id]?.armies ?? 0), 0);
  const continents = wholeContinents(game, player.id);
  const eliminated = territories.length === 0;

  return (
    <View style={[styles.card, isCurrent && styles.cardActive, eliminated && styles.cardEliminated]}>
      {/* Left: rank + color stripe */}
      <View style={[styles.rankStripe, { backgroundColor: player.color + (eliminated ? '55' : 'cc') }]}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>

      {/* Center: player info */}
      <View style={styles.cardCenter}>
        <View style={styles.nameRow}>
          <Text style={[styles.playerName, eliminated && styles.eliminatedText]} numberOfLines={1}>
            {player.name}
          </Text>
          {!player.isHuman && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          )}
          {isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>ACTIVE</Text>
            </View>
          )}
          {eliminated && (
            <View style={styles.eliminatedBadge}>
              <Text style={styles.eliminatedBadgeText}>DEFEATED</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat icon="⚑" value={territories.length} label="territories" />
          <Stat icon="⚔" value={armies} label="armies" />
          {continents.length > 0 && (
            <Stat icon="🌍" value={continents.length} label={continents.length === 1 ? 'continent' : 'continents'} />
          )}
          {player.capital && (
            <View style={styles.capitalBadge}>
              <Text style={styles.capitalText}>★ Capitol</Text>
            </View>
          )}
        </View>

        {/* Cards count */}
        {player.cards.length > 0 && (
          <Text style={styles.cardsNote}>{player.cards.length} cards in hand</Text>
        )}
      </View>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 2, borderTopColor: Colors.gold,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  headerTitle: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 13, letterSpacing: 4 },
  closeBtn: { padding: 4 },
  closeText: { color: Colors.textMuted, fontSize: 20, fontFamily: 'Cinzel_400Regular' },
  goldBar: { height: 2, backgroundColor: Colors.gold },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 8 },

  // Player card
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.bgPanel,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: Colors.gold, borderWidth: 1.5,
  },
  cardEliminated: { opacity: 0.5 },

  rankStripe: { width: 36, justifyContent: 'center', alignItems: 'center' },
  rankText: { color: '#fff', fontFamily: 'Cinzel_900Black', fontSize: 18 },

  cardCenter: { flex: 1, padding: 10, gap: 6 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  playerName: { color: Colors.text, fontFamily: 'Cinzel_600SemiBold', fontSize: 14, flexShrink: 1 },
  eliminatedText: { color: Colors.textMuted, textDecorationLine: 'line-through' },

  aiBadge: {
    backgroundColor: Colors.bgField, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  aiBadgeText: { color: Colors.textMuted, fontFamily: 'Cinzel_700Bold', fontSize: 8, letterSpacing: 1 },

  currentBadge: {
    backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  currentBadgeText: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 8, letterSpacing: 2 },

  eliminatedBadge: {
    backgroundColor: Colors.crimson + '22', borderWidth: 1, borderColor: Colors.crimson,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  eliminatedBadgeText: { color: Colors.textCrimson, fontFamily: 'Cinzel_700Bold', fontSize: 8, letterSpacing: 2 },

  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statIcon: { fontSize: 11 },
  statValue: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 14 },
  statLabel: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular', fontSize: 10 },

  capitalBadge: { backgroundColor: Colors.gold + '22', paddingHorizontal: 6, paddingVertical: 2 },
  capitalText: { color: Colors.gold, fontFamily: 'Cinzel_600SemiBold', fontSize: 9 },

  cardsNote: { color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 11 },
});
