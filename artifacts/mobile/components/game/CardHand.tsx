import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, Modal, Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { CARD_TYPE_LABEL, findBestSet, isValidSet } from '@/game/cards';
import type { GameAction, GameState, RiskCard } from '@/game/types';

interface Props {
  game: GameState;
  dispatch: (action: GameAction) => void;
  open: boolean;
  onClose: () => void;
}

// ─── Card type theme ──────────────────────────────────────────────────────────
const CARD_THEME: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  infantry:  { bg: '#2a4a2a', border: '#4a8a4a', icon: '⚔',  label: 'INFANTRY'  },
  cavalry:   { bg: '#2a3a5a', border: '#4a6aaa', icon: '🐴', label: 'CAVALRY'   },
  artillery: { bg: '#5a2a18', border: '#aa6a3a', icon: '💣', label: 'ARTILLERY' },
  wild:      { bg: '#4a2a5a', border: '#8a5aaa', icon: '★',  label: 'WILD'      },
};

export default function CardHand({ game, dispatch, open, onClose }: Props) {
  const player = game.players[game.currentPlayer];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const cardRule = game.setup.cardRule ?? 'ascending';
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(300)).current;

  React.useEffect(() => {
    if (open) {
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        RNAnimated.spring(slideAnim, { toValue: 0, friction: 9, useNativeDriver: true }),
      ]).start();
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  if (!player) return null;

  const toggleCard = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) { next.delete(id); }
    else if (next.size < 3) { next.add(id); }
    setSelected(next);
  };

  const selectedCards = player.cards.filter((c) => selected.has(c.id));
  const canTrade = selectedCards.length === 3 && isValidSet(selectedCards);

  const handleTrade = () => {
    if (!canTrade) return;
    dispatch({ type: 'TRADE_CARDS', cardIds: Array.from(selected) });
    setSelected(new Set());
  };

  const handleAutoTrade = () => {
    const best = findBestSet(player.cards, cardRule);
    if (best) {
      dispatch({ type: 'AUTO_TRADE' });
      setSelected(new Set());
      onClose();
    }
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <RNAnimated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <RNAnimated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <SafeAreaView edges={['bottom']}>
            {/* Header */}
            <LinearGradient
              colors={[Colors.wood, Colors.woodMid]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <View style={styles.headerLeft}>
                <Text style={styles.headerIcon}>🃏</Text>
                <Text style={styles.title}>RISK CARDS</Text>
              </View>
              <View style={styles.headerRight}>
                {game.mustTrade && (
                  <View style={styles.mustTradeBadge}>
                    <Text style={styles.mustTradeText}>Must Trade!</Text>
                  </View>
                )}
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>
            </LinearGradient>

            {/* Ornate separator */}
            <View style={styles.separatorRow}>
              <View style={styles.sepLine} />
              <Text style={styles.sepDiamond}>◆</Text>
              <View style={styles.sepLine} />
            </View>

            <Text style={styles.hint}>
              Select 3 matching cards — or one of each type — to trade for armies.
            </Text>

            {/* Cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.cards} contentContainerStyle={styles.cardsContent}>
              {player.cards.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  selected={selected.has(card.id)}
                  onPress={() => toggleCard(card.id)}
                  ownedTerritory={card.territory !== null && game.territories[card.territory]?.owner === player.id}
                />
              ))}
            </ScrollView>

            {player.cards.length === 0 && (
              <Text style={styles.empty}>No cards in hand</Text>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {findBestSet(player.cards, cardRule) && (
                <Pressable onPress={handleAutoTrade} style={styles.autoBtn}>
                  <Text style={styles.autoBtnText}>Auto-Trade Best Set</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleTrade}
                disabled={!canTrade}
                style={[styles.tradeBtn, !canTrade && styles.tradeBtnDisabled]}
              >
                <Text style={[styles.tradeBtnText, !canTrade && styles.tradeBtnTextDisabled]}>
                  Trade ({selectedCards.length}/3)
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </RNAnimated.View>
      </RNAnimated.View>
    </Modal>
  );
}

// ─── Card Tile ────────────────────────────────────────────────────────────────
function CardTile({ card, selected, onPress, ownedTerritory }: {
  card: RiskCard; selected: boolean; onPress: () => void; ownedTerritory: boolean;
}) {
  const theme = CARD_THEME[card.type] ?? CARD_THEME.wild;
  const liftAnim = useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    RNAnimated.spring(liftAnim, {
      toValue: selected ? -14 : 0, friction: 7, useNativeDriver: true,
    }).start();
  }, [selected]);

  return (
    <Pressable onPress={onPress}>
      <RNAnimated.View style={[styles.card, selected && styles.cardSelected, { transform: [{ translateY: liftAnim }] }]}>
        {/* Outer border */}
        <View style={[styles.cardOuter, { borderColor: theme.border }]}>
          {/* Header band */}
          <LinearGradient colors={[theme.bg, theme.bg + 'cc']} style={styles.cardHeader}>
            <Text style={styles.cardIcon}>{theme.icon}</Text>
            <Text style={styles.cardType}>{theme.label}</Text>
          </LinearGradient>

          {/* Body */}
          <View style={styles.cardBody}>
            {card.territory ? (
              <>
                <Text style={styles.cardTerritoryName} numberOfLines={2}>{card.territory}</Text>
                {ownedTerritory && (
                  <View style={styles.bonusBadge}>
                    <Text style={styles.bonusText}>+2 BONUS</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.cardWild}>WILD CARD</Text>
            )}
          </View>

          {/* Footer icon */}
          <View style={[styles.cardFooter, { backgroundColor: theme.bg + '88' }]}>
            <Text style={[styles.cardFooterIcon, { color: theme.border }]}>{theme.icon}</Text>
          </View>

          {/* Selection glow */}
          {selected && <View style={[styles.selectedGlow, { borderColor: Colors.gold }]} />}
        </View>
      </RNAnimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 2, borderTopColor: Colors.gold,
    borderLeftWidth: 1, borderLeftColor: Colors.border,
    borderRightWidth: 1, borderRightColor: Colors.border,
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 18 },
  title: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 14, letterSpacing: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mustTradeBadge: {
    backgroundColor: Colors.crimson, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.crimsonBright,
  },
  mustTradeText: { color: Colors.text, fontFamily: 'Cinzel_700Bold', fontSize: 10, letterSpacing: 1 },
  closeBtn: { padding: 4 },
  closeText: { color: Colors.textMuted, fontSize: 20, fontFamily: 'Cinzel_400Regular' },

  // Separator
  separatorRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16 },
  sepLine: { flex: 1, height: 1, backgroundColor: Colors.goldDim },
  sepDiamond: { color: Colors.goldDim, fontSize: 8, marginHorizontal: 6 },

  hint: {
    color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 12, marginHorizontal: 16, marginTop: 8,
  },

  // Cards scroll
  cards: { maxHeight: 190, paddingVertical: 8 },
  cardsContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 4, paddingTop: 16 },

  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 6 },
  cardSelected: {},
  cardOuter: {
    width: 88, height: 130,
    borderWidth: 2, borderRadius: 4,
    backgroundColor: Colors.bgPanel,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingVertical: 6, alignItems: 'center', gap: 2,
  },
  cardIcon: { fontSize: 16 },
  cardType: { color: '#fff', fontFamily: 'Cinzel_700Bold', fontSize: 8, letterSpacing: 1.5 },
  cardBody: {
    flex: 1, padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  cardTerritoryName: {
    color: Colors.text, fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9, textAlign: 'center',
  },
  cardWild: { color: Colors.goldText, fontFamily: 'Cinzel_700Bold', fontSize: 9, textAlign: 'center' },
  bonusBadge: {
    marginTop: 6, backgroundColor: Colors.gold + '33',
    borderWidth: 1, borderColor: Colors.gold,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  bonusText: { color: Colors.gold, fontFamily: 'Cinzel_700Bold', fontSize: 7, letterSpacing: 1 },
  cardFooter: { height: 20, alignItems: 'center', justifyContent: 'center' },
  cardFooterIcon: { fontSize: 12 },
  selectedGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2.5, borderRadius: 4,
  },

  empty: {
    color: Colors.textMuted, fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 14, textAlign: 'center', padding: 24,
  },

  // Actions
  actions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 8 },
  autoBtn: {
    flex: 1, backgroundColor: Colors.bgPanel,
    borderWidth: 1.5, borderColor: Colors.gold,
    paddingVertical: 12, alignItems: 'center',
  },
  autoBtnText: { color: Colors.gold, fontFamily: 'Cinzel_600SemiBold', fontSize: 12, letterSpacing: 1 },
  tradeBtn: { flex: 1, backgroundColor: Colors.gold, paddingVertical: 12, alignItems: 'center' },
  tradeBtnDisabled: { backgroundColor: Colors.disabled },
  tradeBtnText: { color: Colors.bg, fontFamily: 'Cinzel_700Bold', fontSize: 12, letterSpacing: 2 },
  tradeBtnTextDisabled: { color: Colors.disabledText },
});
