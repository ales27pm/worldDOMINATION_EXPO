import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { battleViewUrl } from "@/game/battleViews";
import { playSfx, playRandomSfx } from "@/lib/sfx";
import { TERRITORY_MAP } from "@/game/mapData";
import type { BattleReport, GameState } from "@/game/types";
import { RiskDie } from "./RiskDie";

const RESULT_HOLD_MS = 3200;
const { width: SW, height: SH } = Dimensions.get("window");

interface Props {
  game: GameState;
}

/**
 * Cinematic battle view: the original RISK II aerial painting of the contested
 * territory fills the screen while dice results play out over it.
 * Only shown for battles involving the human commander.
 */
export function BattleView({ game }: Props) {
  const [scene, setScene] = useState<BattleReport | null>(null);
  const [phase, setPhase] = useState<"ready" | "rolled">("ready");
  const lastReportRef = useRef<BattleReport | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopFns = useRef<Array<() => void>>([]);
  const soundTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rolledRef = useRef(false);

  const clearAll = useCallback(() => {
    if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null; }
    soundTimers.current.forEach(clearTimeout);
    soundTimers.current = [];
    stopFns.current.forEach((s) => s());
    stopFns.current = [];
  }, []);

  const dismiss = useCallback(() => {
    rolledRef.current = false;
    clearAll();
    setScene(null);
  }, [clearAll]);

  // Watch for a new battle
  useEffect(() => {
    const report = game.lastBattle;
    if (!report || report === lastReportRef.current) return;
    lastReportRef.current = report;

    const attacker = game.players[report.attacker];
    const defender = game.players[report.defender];
    // Only show for human-vs-AI or AI-vs-human battles
    if (!attacker?.isHuman && !defender?.isHuman) return;

    rolledRef.current = false;
    clearAll();
    setPhase("ready");
    setScene(report);
  }, [game.lastBattle, game.players, clearAll]);

  const rollDice = useCallback(() => {
    if (!scene || rolledRef.current) return;
    rolledRef.current = true;
    setPhase("rolled");
    clearAll();

    // Sound: dice roll → volley/cannon → optional trumpet
    playSfx("dice_roll", { volume: 0.62 }).then((s) => stopFns.current.push(s));

    const heavy =
      scene.rounds > 2 ||
      scene.attackerLosses + scene.defenderLosses >= 4;
    const t1 = setTimeout(() => {
      const names = heavy
        ? ["volley_long", "roar", "cannon_a"]
        : ["volley_short", "cannon_b", "cannon_c", "clash_c"];
      playRandomSfx(names, { volume: 0.45 }).then((s) => stopFns.current.push(s));
    }, 260);
    soundTimers.current.push(t1);

    if (scene.conquered) {
      const t2 = setTimeout(() => {
        playSfx("trumpet", { volume: 0.5 }).then((s) => stopFns.current.push(s));
      }, 1280);
      soundTimers.current.push(t2);
    }

    dismissTimer.current = setTimeout(dismiss, RESULT_HOLD_MS);
  }, [scene, clearAll, dismiss]);

  // Cleanup on unmount
  useEffect(() => () => clearAll(), [clearAll]);

  if (!scene) return null;

  const attacker = game.players[scene.attacker];
  const defender = game.players[scene.defender];
  const fromName = TERRITORY_MAP[scene.from]?.name ?? scene.from;
  const toName = TERRITORY_MAP[scene.to]?.name ?? scene.to;
  const imgUri = battleViewUrl(scene.to);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        {/* Territory aerial painting */}
        <Image
          source={{ uri: imgUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        {/* Dark vignette */}
        <View style={styles.vignette} />

        {/* Territory & players banner */}
        <View style={styles.topBanner}>
          <Text style={styles.territoryLabel}>{toName}</Text>
          <Text style={styles.battleLine}>
            <Text style={[styles.playerName, { color: attacker?.color ?? Colors.gold }]}>
              {attacker?.name ?? "?"}
            </Text>
            {" assaults "}
            <Text style={[styles.playerName, { color: defender?.color ?? Colors.textMuted }]}>
              {defender?.name ?? "?"}
            </Text>
          </Text>
          {scene.rounds > 1 && (
            <Text style={styles.rounds}>{scene.rounds} rounds</Text>
          )}
        </View>

        {/* Dice area */}
        {phase === "rolled" ? (
          <View style={styles.diceArea}>
            {/* Attacker dice */}
            <View style={styles.diceGroup}>
              <Text style={[styles.sideLabel, { color: attacker?.color ?? Colors.gold }]}>
                {fromName}
              </Text>
              <View style={styles.diceRow}>
                {scene.attackerRolls.map((v, i) => (
                  <RiskDie key={i} value={v} tier={scene.attackerTier} size={48} />
                ))}
              </View>
              <Text style={styles.losses}>-{scene.attackerLosses}</Text>
            </View>

            <Text style={styles.vs}>⚔</Text>

            {/* Defender dice */}
            <View style={styles.diceGroup}>
              <Text style={[styles.sideLabel, { color: defender?.color ?? Colors.textMuted }]}>
                {toName}
              </Text>
              <View style={styles.diceRow}>
                {scene.defenderRolls.map((v, i) => (
                  <RiskDie key={i} value={v} tier={scene.defenderTier} size={48} />
                ))}
              </View>
              <Text style={styles.losses}>-{scene.defenderLosses}</Text>
            </View>
          </View>
        ) : (
          /* Press-to-roll CTA */
          <Pressable style={styles.rollCta} onPress={rollDice}>
            <Text style={styles.rollCtaText}>ROLL DICE</Text>
            <Text style={styles.rollCtaHint}>Tap to engage</Text>
          </Pressable>
        )}

        {/* Result banner */}
        {phase === "rolled" && (
          <View style={styles.resultBanner}>
            <Text style={[styles.resultText, scene.conquered ? styles.conquered : styles.repelled]}>
              {scene.conquered ? "TERRITORY TAKEN" : "ATTACK REPELLED"}
            </Text>
          </View>
        )}

        {/* Skip tap (after roll) */}
        {phase === "rolled" && (
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  topBanner: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
  },
  territoryLabel: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: 3,
  },
  battleLine: {
    color: "#ccc",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  playerName: { fontFamily: "Inter_700Bold" },
  rounds: {
    color: Colors.goldDim,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    letterSpacing: 1,
  },
  diceArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  diceGroup: { alignItems: "center", gap: 10, flex: 1 },
  diceRow: { flexDirection: "row", gap: 8 },
  sideLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1,
    textAlign: "center",
  },
  losses: {
    color: Colors.textCrimson,
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  vs: { color: Colors.gold, fontSize: 28 },
  rollCta: {
    borderWidth: 2,
    borderColor: Colors.gold,
    paddingVertical: 20,
    paddingHorizontal: 48,
    alignItems: "center",
    gap: 6,
  },
  rollCtaText: {
    color: Colors.gold,
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: 4,
  },
  rollCtaHint: {
    color: Colors.goldDim,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    letterSpacing: 2,
  },
  resultBanner: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  resultText: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: 4,
  },
  conquered: { color: Colors.gold },
  repelled: { color: Colors.textMuted },
});
