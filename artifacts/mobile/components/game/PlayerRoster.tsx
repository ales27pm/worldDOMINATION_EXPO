import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/constants/colors';
import type { GameState } from '@/game/types';
import { wholeContinents } from '@/game/analysis';
import { CONTINENTS } from '@/game/mapData';

interface Props {
  game: GameState;
  compact?: boolean;
}

export default function PlayerRoster({ game, compact }: Props) {
  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {game.players.map((player) => {
        const owned = game.activeIds.filter((id) => game.territories[id].owner === player.id).length;
        const troops = game.activeIds.reduce(
          (sum, id) => game.territories[id].owner === player.id ? sum + game.territories[id].armies : sum, 0,
        );
        const continents = wholeContinents(game, player.id);
        const isCurrentPlayer = game.currentPlayer === player.id;
        const cards = player.cards.length;

        if (compact) {
          return (
            <View key={player.id} style={[styles.compactRow, !player.alive && styles.eliminated]}>
              <View style={[styles.colorDot, { backgroundColor: player.color }]} />
              <Text style={[styles.compactName, isCurrentPlayer && styles.active]} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.compactStat}>{owned}t</Text>
              <Text style={styles.compactStat}>{troops}a</Text>
            </View>
          );
        }

        return (
          <View
            key={player.id}
            style={[styles.card, isCurrentPlayer && styles.cardActive, !player.alive && styles.cardEliminated]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.colorBar, { backgroundColor: player.color }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, !player.alive && styles.deadName]} numberOfLines={1}>
                    {player.name}
                  </Text>
                  {isCurrentPlayer && <Text style={styles.activeBadge}>▶ ACTIVE</Text>}
                  {!player.alive && <Text style={styles.deadBadge}>ELIMINATED</Text>}
                  {player.isHuman && <Text style={styles.humanBadge}>HUMAN</Text>}
                </View>
                {player.capital && (
                  <Text style={styles.capitalText}>
                    ⚑ {player.capital}
                  </Text>
                )}
              </View>
            </View>
            {player.alive && (
              <View style={styles.statsRow}>
                <Stat label="Territories" value={String(owned)} />
                <Stat label="Armies" value={String(troops)} />
                <Stat label="Cards" value={String(cards)} />
              </View>
            )}
            {continents.length > 0 && (
              <View style={styles.continentsRow}>
                {continents.map((c) => (
                  <View key={c} style={[styles.continentBadge, { backgroundColor: CONTINENTS[c].color + '40' }]}>
                    <Text style={styles.continentText}>{CONTINENTS[c].name} +{CONTINENTS[c].bonus}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
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

const styles = StyleSheet.create({
  container: { gap: 6 },
  compactContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  compactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.bgCard, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  compactName: { flex: 1, color: Colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 11 },
  compactStat: { color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 10 },
  active: { color: Colors.gold },
  eliminated: { opacity: 0.4 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    padding: 10, gap: 6,
  },
  cardActive: { borderColor: Colors.gold },
  cardEliminated: { opacity: 0.45 },
  cardHeader: { flexDirection: 'row', gap: 8 },
  colorBar: { width: 3, borderRadius: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  name: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  deadName: { color: Colors.textMuted },
  activeBadge: { color: Colors.gold, fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1 },
  deadBadge: { color: Colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1 },
  humanBadge: { color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 9, letterSpacing: 1 },
  capitalText: { color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { alignItems: 'center' },
  statValue: { color: Colors.text, fontFamily: 'Inter_700Bold', fontSize: 15 },
  statLabel: { color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 9, letterSpacing: 1 },
  continentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  continentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  continentText: { color: Colors.text, fontFamily: 'Inter_500Medium', fontSize: 10 },
});
