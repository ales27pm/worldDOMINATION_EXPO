import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Line, Polygon } from "react-native-svg";
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
import type { BattleReport, DiceTier, GameState } from "@/game/types";
import { RiskDie } from "./RiskDie";
import { PieceIcon } from "./PieceSprite";

/**
 * Cinematic battle view, rebuilt to the original RISK II attack screen:
 * glossy player-coloured plaques (army-count roundel → dice tray → territory
 * name bar), a thick attacker-coloured arrow, troops standing on the aerial
 * terrain painting, bright daylight, plain bold UI type.
 */

// Classic plaque fittings.
const TRAY_ATTACKER = "#1c2c66"; // navy dice backing (attacker)
const TRAY_DEFENDER = "#701316"; // oxblood dice backing (defender)
const LOSS_GOLD = "#ffd65a";
const PLAQUE_EDGE = "rgba(0,0,0,0.78)";

// Troop formation slots as screen fractions (x, y = top-left anchor).
const ATTACK_SLOTS: Array<[number, number]> = [
  [0.10, 0.700], [0.21, 0.694], [0.32, 0.701], [0.43, 0.692],
  [0.145, 0.762], [0.26, 0.768], [0.375, 0.760], [0.05, 0.757],
];
const DEFEND_SLOTS: Array<[number, number]> = [
  [0.615, 0.500], [0.725, 0.494], [0.835, 0.504],
  [0.665, 0.560], [0.780, 0.554], [0.575, 0.556],
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Props {
  game: GameState;
}

export function BattleView({ game }: Props) {
  const sceneMode = useBattleSceneMode();
  // Sprite sizing tracks the live window — rotation-safe.
  const { width: SW, height: SH } = useWindowDimensions();
  const INF_W = SW * 0.074;
  const INF_H = (INF_W * 31) / 18; // MAP_PIECE_BOX aspect
  const CAV_W = SW * 0.148;
  const CAV_H = (CAV_W * 40) / 38;
  const [scene, setScene] = useState<BattleReport | null>(null);
  const [phase, setPhase] = useState<"ready" | "rolled">("ready");
  // Battles are keyed by the monotonic battlesFought counter — the reducer
  // deep-clones state every dispatch, so lastBattle's identity churns even
  // when no new battle happened (e.g. the occupy auto-advance would replay
  // the scene under identity keying). Seeded with the mount-time counter so
  // a restored save doesn't replay its final battle.
  const seenBattleRef = useRef<number>(game.battlesFought);
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
    if (!report || game.battlesFought === seenBattleRef.current) return;
    seenBattleRef.current = game.battlesFought;

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
  const attackerColor = attacker?.color ?? "#b3272d";
  const defenderColor = defender?.color ?? "#2f5ec4";
  const fromName = TERRITORY_MAP[scene.from]?.name ?? scene.from;
  const toName = TERRITORY_MAP[scene.to]?.name ?? scene.to;
  const backdrop = battleViewSource(scene.to);
  const rolled = phase === "rolled";

  // Plaque roundels: garrison size when the assault began, ticking down to
  // the survivors once the dice land. Hidden for reports from older saves.
  const aBefore = scene.attackerArmiesBefore;
  const dBefore = scene.defenderArmiesBefore;
  const aCount = typeof aBefore === "number"
    ? Math.max(0, rolled ? aBefore - scene.attackerLosses : aBefore)
    : null;
  const dCount = typeof dBefore === "number"
    ? Math.max(0, rolled ? dBefore - scene.defenderLosses : dBefore)
    : null;

  // Troops on the field: formation strength from the pre-battle garrisons,
  // with the fallen removed once the dice land. Formations are capped at the
  // slot count on purpose — huge garrisons show a full formation while the
  // roundel carries the real number, so icons and counts can differ.
  const aTroops = clamp((aBefore ?? 6) - 1, 1, ATTACK_SLOTS.length);
  const dTroops = clamp(dBefore ?? 4, 1, DEFEND_SLOTS.length);
  const aStanding = clamp(aTroops - (rolled ? scene.attackerLosses : 0), 0, aTroops);
  const dStanding = clamp(dTroops - (rolled ? scene.defenderLosses : 0), 0, dTroops);
  const aCavalry = (aBefore ?? 0) >= 6;

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
        {/* Faithful daylight — just a whisper of shading for legibility. */}
        <View style={styles.vignette} />

        {/* Who assaults whom — small dispatch line at the very top. */}
        <View style={styles.topLine} pointerEvents="none">
          <Text style={styles.topLineText} numberOfLines={1}>
            <Text style={{ color: attackerColor }}>{attacker?.name ?? "?"}</Text>
            <Text> assaults </Text>
            <Text style={{ color: defenderColor }}>{defender?.name ?? "?"}</Text>
          </Text>
        </View>

        {/* Attack arrow, under the troops like the original. */}
        <AttackArrow color={attackerColor} />

        {/* Troops standing on the terrain. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {ATTACK_SLOTS.slice(0, aStanding).map(([fx, fy], i) => (
            <PieceIcon
              key={`a${i}`}
              type="infantry"
              color={attackerColor}
              size={INF_W}
              style={{ position: "absolute", left: fx * SW, top: fy * SH, width: INF_W, height: INF_H }}
            />
          ))}
          {aCavalry && aStanding > 0 && (
            <PieceIcon
              type="cavalry"
              color={attackerColor}
              size={CAV_W}
              style={{ position: "absolute", left: 0.50 * SW, top: 0.717 * SH, width: CAV_W, height: CAV_H }}
            />
          )}
          {DEFEND_SLOTS.slice(0, dStanding).map(([fx, fy], i) => (
            <PieceIcon
              key={`d${i}`}
              type="infantry"
              color={defenderColor}
              size={INF_W}
              style={{ position: "absolute", left: fx * SW, top: fy * SH, width: INF_W, height: INF_H }}
            />
          ))}
        </View>

        {/* Plaques — attacker upper left, defender lower right. */}
        <View style={styles.attackerPlaque} pointerEvents="none">
          <Plaque
            color={attackerColor}
            tray={TRAY_ATTACKER}
            name={fromName}
            count={aCount}
            rolls={rolled ? scene.attackerRolls : null}
            tier={scene.attackerTier}
            losses={scene.attackerLosses}
          />
        </View>
        <View style={styles.defenderPlaque} pointerEvents="none">
          <Plaque
            color={defenderColor}
            tray={TRAY_DEFENDER}
            name={toName}
            count={dCount}
            rolls={rolled ? scene.defenderRolls : null}
            tier={scene.defenderTier}
            losses={scene.defenderLosses}
          />
        </View>

        {/* Result ribbon */}
        {rolled && (
          <View style={styles.ribbonWrap} pointerEvents="none">
            <View style={styles.ribbon}>
              <Text style={[styles.ribbonText, scene.conquered ? styles.conquered : styles.repelled]}>
                {scene.conquered ? "TERRITORY TAKEN" : "ATTACK REPELLED"}
              </Text>
              <Text style={styles.ribbonHint}>TAP TO CONTINUE</Text>
            </View>
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

/** Classic plaque: count roundel → dice tray → territory name bar. */
function Plaque({
  color,
  tray,
  name,
  count,
  rolls,
  tier,
  losses,
}: {
  color: string;
  tray: string;
  name: string;
  count: number | null;
  rolls: number[] | null;
  tier: DiceTier;
  losses: number;
}) {
  const { width: sw } = useWindowDimensions();
  return (
    <View style={styles.plaqueRow}>
      {count !== null && (
        <View style={[styles.roundel, { backgroundColor: color }]}>
          <View style={styles.roundelGloss} />
          <Text style={styles.roundelText}>{count}</Text>
        </View>
      )}
      <View style={[styles.tray, { backgroundColor: tray }, count === null && styles.trayNoRoundel]}>
        {rolls ? (
          <>
            {rolls.map((v, i) => (
              <RiskDie key={i} value={v} tier={tier} size={24} />
            ))}
            <Text style={styles.lossText}>-{losses}</Text>
          </>
        ) : (
          <View style={styles.trayIdle} />
        )}
      </View>
      <View style={[styles.nameBar, { backgroundColor: color, maxWidth: sw * 0.42 }]}>
        <Text style={styles.nameText} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

/** Thick attacker-coloured arrow from the attacker plaque to the defender's. */
function AttackArrow({ color }: { color: string }) {
  const { width: sw } = useWindowDimensions();
  const sx = sw * 0.28;
  const sy = 178;
  const ex = sw * 0.62;
  const ey = 292;
  const ang = Math.atan2(ey - sy, ex - sx);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  // Head: tip beyond the line end, base pulled back along the shaft.
  const tipX = ex + cos * 18;
  const tipY = ey + sin * 18;
  const baseX = tipX - cos * 32;
  const baseY = tipY - sin * 32;
  const px = -sin;
  const py = cos;
  const head = `${tipX},${tipY} ${baseX + px * 15},${baseY + py * 15} ${baseX - px * 15},${baseY - py * 15}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Line
          x1={sx} y1={sy} x2={baseX} y2={baseY}
          stroke="rgba(0,0,0,0.55)" strokeWidth={13} strokeLinecap="round"
        />
        <Polygon points={head} fill="rgba(0,0,0,0.55)" stroke="rgba(0,0,0,0.55)" strokeWidth={5} strokeLinejoin="round" />
        <Line
          x1={sx} y1={sy} x2={baseX} y2={baseY}
          stroke={color} strokeWidth={9} strokeLinecap="round"
        />
        <Polygon points={head} fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  backdropFill: { width: "100%", height: "100%" },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  topLine: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  topLineText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  attackerPlaque: { position: "absolute", top: 108, left: 8 },
  defenderPlaque: { position: "absolute", top: 300, right: 8 },

  plaqueRow: {
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  roundel: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: PLAQUE_EDGE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    overflow: "hidden",
  },
  roundelGloss: {
    position: "absolute",
    top: 3,
    left: 6,
    right: 6,
    height: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.30)",
  },
  roundelText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0b0b0b",
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  tray: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: -12,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 5,
    minHeight: 36,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderColor: PLAQUE_EDGE,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  trayNoRoundel: { marginLeft: 0, paddingLeft: 10 },
  trayIdle: { width: 58, height: 24 },
  lossText: {
    color: LOSS_GOLD,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 3,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nameBar: {
    justifyContent: "center",
    minWidth: 92,
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 5,
    minHeight: 36,
    borderWidth: 1.5,
    borderColor: PLAQUE_EDGE,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  nameText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  ribbonWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 84,
    alignItems: "center",
  },
  ribbon: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,214,90,0.55)",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 26,
  },
  ribbonText: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 4,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  conquered: { color: LOSS_GOLD },
  repelled: { color: "#cfcabe" },
  ribbonHint: {
    marginTop: 3,
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    letterSpacing: 2,
  },
});
