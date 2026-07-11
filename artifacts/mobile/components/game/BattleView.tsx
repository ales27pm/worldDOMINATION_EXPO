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
import { GradientFill } from "@/components/GradientFill";
import { battleViewSource } from "@/game/battleViews";
import { playSfx, playRandomSfx, type SfxName } from "@/lib/sfx";
import {
  SCENE_TIMINGS,
  setBattleSceneVisible,
  shouldShowBattleScene,
  useBattleSceneMode,
} from "@/lib/battleScenes";
import { TERRITORY_MAP } from "@/game/mapData";
import type { BattleReport, GameState } from "@/game/types";
import { RiskDie } from "./RiskDie";

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
  const sceneMode = useBattleSceneMode();
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
    setBattleSceneVisible(false);
  }, [clearAll]);

  // Watch for a new battle — the shared policy decides whether it earns a
  // scene (player assaults always; AI assaults on the player only when
  // ground is lost or a capital is contested; never with scenes off).
  useEffect(() => {
    const report = game.lastBattle;
    if (!report || report === lastReportRef.current) return;
    lastReportRef.current = report;

    if (!shouldShowBattleScene(game, report, sceneMode)) return;

    rolledRef.current = false;
    clearAll();
    setPhase("ready");
    setScene(report);
    setBattleSceneVisible(true);
  }, [game, sceneMode, clearAll]);

  const rollDice = useCallback(() => {
    if (!scene || rolledRef.current) return;
    rolledRef.current = true;
    setPhase("rolled");
    clearAll();

    const timings = SCENE_TIMINGS[sceneMode === "full" ? "full" : "fast"];

    // Sound: dice roll → volley/cannon → optional trumpet
    stopFns.current.push(playSfx("dice_roll", { volume: 0.62 }));

    const heavy =
      scene.rounds > 2 ||
      scene.attackerLosses + scene.defenderLosses >= 4;
    const t1 = setTimeout(() => {
      const names: SfxName[] = heavy
        ? ["volley_long", "roar", "cannon_a"]
        : ["volley_short", "cannon_b", "cannon_c", "clash_c"];
      stopFns.current.push(playRandomSfx(names, { volume: 0.45 }));
    }, timings.volleyAt);
    soundTimers.current.push(t1);

    if (scene.conquered) {
      const t2 = setTimeout(() => {
        stopFns.current.push(playSfx("trumpet", { volume: 0.5 }));
      }, timings.trumpetAt);
      soundTimers.current.push(t2);
    }

    dismissTimer.current = setTimeout(dismiss, timings.hold);
  }, [scene, sceneMode, clearAll, dismiss]);

  // The dice roll themselves after a short beat — no CTA tap required.
  useEffect(() => {
    if (!scene || phase !== "ready") return;
    const timings = SCENE_TIMINGS[sceneMode === "full" ? "full" : "fast"];
    const timer = setTimeout(rollDice, timings.preRoll);
    return () => clearTimeout(timer);
  }, [scene, phase, sceneMode, rollDice]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      clearAll();
      setBattleSceneVisible(false);
    },
    [clearAll],
  );

  if (!scene) return null;

  const attacker = game.players[scene.attacker];
  const defender = game.players[scene.defender];
  const fromName = TERRITORY_MAP[scene.from]?.name ?? scene.from;
  const toName = TERRITORY_MAP[scene.to]?.name ?? scene.to;
  const backdrop = battleViewSource(scene.to);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        {/* Territory aerial painting (bundled) — themed night field when a
            territory has no recovered painting (extended-map additions). */}
        {backdrop !== undefined ? (
          <Image
            source={backdrop}
            // Explicit size: bundled images otherwise render at intrinsic
            // pixel size on web (inset-only styles lose to it).
            style={[StyleSheet.absoluteFill, styles.backdropFill]}
            resizeMode="cover"
          />
        ) : (
          <GradientFill
            colors={["#3a2a16", "#1c1208", "#080502"]}
            style={StyleSheet.absoluteFill}
          />
        )}
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
        ) : null}

        {/* Result banner */}
        {phase === "rolled" && (
          <View style={styles.resultBanner}>
            <Text style={[styles.resultText, scene.conquered ? styles.conquered : styles.repelled]}>
              {scene.conquered ? "TERRITORY TAKEN" : "ATTACK REPELLED"}
            </Text>
            <Text style={styles.skipHint}>tap to continue</Text>
          </View>
        )}

        {/* Tap anywhere: bring the roll forward, or dismiss the result. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={phase === "ready" ? rollDice : dismiss}
        />
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
  backdropFill: { width: '100%', height: '100%' },
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
    fontFamily: "Alegreya_700Bold",
    fontSize: 26,
    letterSpacing: 3,
  },
  battleLine: {
    color: "#ccc",
    fontFamily: "Alegreya_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  playerName: { fontFamily: "Alegreya_700Bold" },
  rounds: {
    color: Colors.goldDim,
    fontFamily: "Alegreya_400Regular",
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
    fontFamily: "Alegreya_600SemiBold",
    fontSize: 12,
    letterSpacing: 1,
    textAlign: "center",
  },
  losses: {
    color: Colors.textCrimson,
    fontFamily: "Alegreya_700Bold",
    fontSize: 22,
  },
  vs: { color: Colors.gold, fontSize: 28 },
  skipHint: {
    color: Colors.goldDim,
    fontFamily: "Alegreya_400Regular",
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 6,
  },
  resultBanner: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  resultText: {
    fontFamily: "Alegreya_700Bold",
    fontSize: 20,
    letterSpacing: 4,
  },
  conquered: { color: Colors.gold },
  repelled: { color: Colors.textMuted },
});
