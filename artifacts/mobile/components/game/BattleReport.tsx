import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import type { BattleReport, GameState } from "@/game/types";
import { TERRITORY_MAP } from "@/game/mapData";
import { RiskDie } from "./RiskDie";

interface Props {
  battle: BattleReport;
  game: GameState;
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
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 2,
  },
  result: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2 },
  conquered: { color: Colors.gold },
  repelled: { color: Colors.textMuted },
  battle: { flexDirection: "row", alignItems: "center", gap: 8 },
  side: { flex: 1, alignItems: "center", gap: 4 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  playerName: {
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  territory: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textAlign: "center",
  },
  dice: { flexDirection: "row", gap: 4 },
  losses: {
    color: Colors.textCrimson,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  vsCol: { alignItems: "center", gap: 2 },
  vs: { fontSize: 18, color: Colors.gold },
  rounds: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
});
