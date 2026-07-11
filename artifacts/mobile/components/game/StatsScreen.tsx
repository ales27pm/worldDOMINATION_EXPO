import React, { useMemo, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line as SvgLine, Polyline } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/typography";
import type { GameState, TurnSnapshot } from "@/game/types";

/**
 * Post-game statistics — the RISK II round-by-round census graph.
 * Charts each commander's territories or total armies across the campaign
 * from the engine's per-round history snapshots.
 */

const { width: SW } = Dimensions.get("window");

type Metric = "territories" | "troops";

const METRICS: Array<{ key: Metric; label: string }> = [
  { key: "territories", label: "TERRITORIES" },
  { key: "troops", label: "ARMIES" },
];

const CHART_W = Math.min(SW, 430) - 72;
const CHART_H = 200;

export function StatsScreen({
  game,
  visible,
  onClose,
}: {
  game: GameState;
  visible: boolean;
  onClose: () => void;
}) {
  const [metric, setMetric] = useState<Metric>("territories");

  // History snapshots plus a live "now" point so the graph reaches the end
  // of the campaign. Campaigns saved before history existed chart from the
  // final round only.
  const snaps = useMemo<TurnSnapshot[]>(() => {
    const live: TurnSnapshot = {
      turn: game.turn,
      counts: game.players.map((p) => {
        const owned = game.activeIds.filter((id) => game.territories[id].owner === p.id);
        return {
          territories: owned.length,
          troops: owned.reduce((sum, id) => sum + game.territories[id].armies, 0),
        };
      }),
    };
    const prior = game.history.filter((s) => s.counts.length === game.players.length);
    const last = prior[prior.length - 1];
    return last && last.turn === live.turn ? [...prior.slice(0, -1), live] : [...prior, live];
  }, [game]);

  const max = useMemo(() => {
    let top = 1;
    for (const snap of snaps) {
      for (const c of snap.counts) top = Math.max(top, c[metric]);
    }
    return top;
  }, [snaps, metric]);

  const n = snaps.length;
  const xFor = (i: number) => (n <= 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W);
  const yFor = (value: number) => CHART_H - (value / max) * (CHART_H - 10);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Campaign Statistics</Text>
            <Text style={styles.subtitle}>
              {n > 1 ? `${n} rounds of the campaign` : "recorded from the final round"}
            </Text>

            {/* Metric tabs */}
            <View style={styles.tabRow}>
              {METRICS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMetric(m.key)}
                  style={[styles.tab, metric === m.key && styles.tabActive]}
                >
                  <Text style={[styles.tabText, metric === m.key && styles.tabTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Chart */}
            <View style={styles.chartBox}>
              <Text style={styles.axisMax}>{max}</Text>
              <Svg width={CHART_W} height={CHART_H}>
                {[0.25, 0.5, 0.75, 1].map((f) => (
                  <SvgLine
                    key={f}
                    x1={0}
                    y1={yFor(max * f)}
                    x2={CHART_W}
                    y2={yFor(max * f)}
                    stroke="rgba(222,190,115,0.16)"
                    strokeWidth={1}
                  />
                ))}
                <SvgLine
                  x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H}
                  stroke="rgba(222,190,115,0.4)" strokeWidth={1}
                />
                {game.players.map((p) =>
                  n > 1 ? (
                    <Polyline
                      key={p.id}
                      points={snaps
                        .map((s, i) => `${xFor(i)},${yFor(s.counts[p.id]?.[metric] ?? 0)}`)
                        .join(" ")}
                      fill="none"
                      stroke={p.color}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : (
                    <Circle
                      key={p.id}
                      cx={xFor(0)}
                      cy={yFor(snaps[0]?.counts[p.id]?.[metric] ?? 0)}
                      r={4}
                      fill={p.color}
                    />
                  ),
                )}
              </Svg>
              <View style={styles.axisRow}>
                <Text style={styles.axisText}>ROUND {snaps[0]?.turn ?? 1}</Text>
                <Text style={styles.axisText}>END</Text>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {game.players.map((p) => (
                <View key={p.id} style={styles.legendItem}>
                  <View style={[styles.legendChip, { backgroundColor: p.color }]} />
                  <Text style={[styles.legendText, !p.alive && styles.legendDead]} numberOfLines={1}>
                    {p.alive ? p.name : `✝ ${p.name}`}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable onPress={onClose} style={styles.continueBtn}>
              <Text style={styles.continueText}>CONTINUE</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(8,5,2,0.92)" },
  safe: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  sheet: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.goldDim,
    padding: 22,
    gap: 14,
  },
  title: {
    color: Colors.gold,
    fontFamily: Fonts.display,
    fontSize: 26,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textMuted,
    fontFamily: "Alegreya_400Regular",
    fontSize: 12,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: -8,
  },
  tabRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  tab: {
    borderWidth: 1,
    borderColor: Colors.goldDim,
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  tabActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tabText: {
    color: Colors.textMuted,
    fontFamily: "Alegreya_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
  },
  tabTextActive: { color: Colors.bg },
  chartBox: { alignSelf: "center" },
  axisMax: {
    color: Colors.goldDim,
    fontFamily: "Alegreya_500Medium",
    fontSize: 10,
    marginBottom: 2,
  },
  axisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  axisText: {
    color: Colors.goldDim,
    fontFamily: "Alegreya_500Medium",
    fontSize: 10,
    letterSpacing: 1,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 14,
    rowGap: 6,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "46%" },
  legendChip: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    color: Colors.text,
    fontFamily: "Alegreya_500Medium",
    fontSize: 12,
  },
  legendDead: { color: Colors.textMuted, textDecorationLine: "line-through" },
  continueBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 2,
  },
  continueText: {
    color: Colors.bg,
    fontFamily: "Alegreya_700Bold",
    fontSize: 14,
    letterSpacing: 3,
  },
});
