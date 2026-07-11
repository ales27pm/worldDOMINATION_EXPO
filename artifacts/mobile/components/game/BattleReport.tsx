import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import type { BattleReport, GameState } from "@/game/types";
import { TERRITORY_MAP } from "@/game/mapData";
import { useBattleSceneVisible } from "@/lib/battleScenes";
import { RiskDie } from "./RiskDie";

interface Props {
  battle: BattleReport;
  game: GameState;
}

/** How long the recap card lingers on screen after a battle. */
const LINGER_MS = 5000;

/**
 * Auto-hiding wrapper for the LAST BATTLE card: each new battle surfaces the
 * recap, it lingers a few seconds, then clears so the map stays visible.
 * Tap dismisses it early. The countdown pauses while the cinematic battle
 * modal covers the screen (same visibility store the occupy toast uses).
 * The engine's `lastBattle` state is untouched — this is display-only.
 */
export function TransientBattleReport({
  game,
  style,
}: {
  game: GameState;
  style?: StyleProp<ViewStyle>;
}) {
  const report = game.phase === "attack" ? game.lastBattle : null;
  // The reducer deep-clones state on every dispatch, so the report's object
  // identity changes even when no new battle happened (e.g. the occupy
  // auto-advance). Key each battle by the monotonic battlesFought counter
  // instead, or unrelated dispatches would re-surface a dismissed card.
  const battleKey = report ? game.battlesFought : null;
  const sceneVisible = useBattleSceneVisible();
  const [shownKey, setShownKey] = useState<number | null>(null);

  // A new battle re-surfaces the card, even if the previous one was
  // dismissed; leaving the attack phase clears it.
  useEffect(() => {
    setShownKey(battleKey);
  }, [battleKey]);

  // Linger countdown — only ticks while the card is actually visible.
  useEffect(() => {
    if (shownKey === null || sceneVisible) return;
    const timer = setTimeout(() => setShownKey(null), LINGER_MS);
    return () => clearTimeout(timer);
  }, [shownKey, sceneVisible]);

  if (shownKey === null || !report) return null;
  return (
    <Pressable
      style={style}
      onPress={() => setShownKey(null)}
      accessibilityRole="button"
      accessibilityLabel="Dismiss battle report"
    >
      <BattleReportCard battle={report} game={game} />
    </Pressable>
  );
}

/** Compact inline battle result card shown above the action panel. */
export default function BattleReportCard({ battle, game }: Props) {
  const attacker = game.players[battle.attacker];
  const defender = game.players[battle.defender];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>LAST BATTLE</Text>
        <Text
          style={[
            styles.result,
            battle.conquered ? styles.conquered : styles.repelled,
          ]}
        >
          {battle.conquered ? "CONQUERED" : "REPELLED"}
        </Text>
      </View>

      <View style={styles.battle}>
        {/* Attacker */}
        <View style={styles.side}>
          <View
            style={[styles.colorDot, { backgroundColor: attacker?.color ?? "#888" }]}
          />
          <Text style={styles.playerName} numberOfLines={1}>
            {attacker?.name ?? "?"}
          </Text>
          <Text style={styles.territory}>
            {TERRITORY_MAP[battle.from]?.name ?? battle.from}
          </Text>
          <View style={styles.dice}>
            {battle.attackerRolls.map((v, i) => (
              <RiskDie key={i} value={v} tier={battle.attackerTier} size={30} />
            ))}
          </View>
          <Text style={styles.losses}>-{battle.attackerLosses}</Text>
        </View>

        <View style={styles.vsCol}>
          <Text style={styles.vs}>⚔</Text>
          <Text style={styles.rounds}>{battle.rounds}r</Text>
        </View>

        {/* Defender */}
        <View style={styles.side}>
          <View
            style={[styles.colorDot, { backgroundColor: defender?.color ?? "#888" }]}
          />
          <Text style={styles.playerName} numberOfLines={1}>
            {defender?.name ?? "?"}
          </Text>
          <Text style={styles.territory}>
            {TERRITORY_MAP[battle.to]?.name ?? battle.to}
          </Text>
          <View style={styles.dice}>
            {battle.defenderRolls.map((v, i) => (
              <RiskDie key={i} value={v} tier={battle.defenderTier} size={30} />
            ))}
          </View>
          <Text style={styles.losses}>-{battle.defenderLosses}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: Colors.textMuted,
    fontFamily: "Alegreya_500Medium",
    fontSize: 10,
    letterSpacing: 2,
  },
  result: { fontFamily: "Alegreya_700Bold", fontSize: 11, letterSpacing: 2 },
  conquered: { color: Colors.gold },
  repelled: { color: Colors.textMuted },
  battle: { flexDirection: "row", alignItems: "center", gap: 8 },
  side: { flex: 1, alignItems: "center", gap: 4 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  playerName: {
    color: Colors.text,
    fontFamily: "Alegreya_600SemiBold",
    fontSize: 12,
  },
  territory: {
    color: Colors.textMuted,
    fontFamily: "Alegreya_400Regular",
    fontSize: 10,
    textAlign: "center",
  },
  dice: { flexDirection: "row", gap: 4 },
  losses: {
    color: Colors.textCrimson,
    fontFamily: "Alegreya_700Bold",
    fontSize: 14,
  },
  vsCol: { alignItems: "center", gap: 2 },
  vs: { fontSize: 18, color: Colors.gold },
  rounds: {
    color: Colors.textMuted,
    fontFamily: "Alegreya_400Regular",
    fontSize: 10,
  },
});
