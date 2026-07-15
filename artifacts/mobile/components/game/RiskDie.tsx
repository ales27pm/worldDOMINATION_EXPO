import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { DICE } from "@/lib/gameArt";
import type { DiceTier } from "@/game/types";

/**
 * Classic RISK II die — solid plastic body with printed pips, layered from
 * two sprites: a neutral body (all 3-D modelling lives in the alpha channel)
 * tinted to the rank colour, plus an untinted pip overlay. White pips on
 * coloured bodies; black pips on the white/ivory die, like a real one.
 */

interface TierStyle {
  body: string;
  pips: "light" | "dark";
}

const TIER_STYLE: Record<DiceTier, TierStyle> = {
  white:  { body: "#ece7dc", pips: "dark"  },
  yellow: { body: "#d3a534", pips: "light" },
  orange: { body: "#c76a1f", pips: "light" },
  red:    { body: "#b3272d", pips: "light" },
  black:  { body: "#2f2b28", pips: "light" },
};

interface RiskDieProps {
  value: number;
  tier: DiceTier;
  size?: number;
}

export function RiskDie({ value, tier, size = 40 }: RiskDieProps) {
  const face = Math.min(6, Math.max(1, Math.round(value)));
  const { body, pips } = TIER_STYLE[tier];

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={DICE.body}
        // tintColor as a prop — react-native-web deprecates it in style.
        tintColor={body}
        style={styles.layer}
        resizeMode="contain"
      />
      <Image source={DICE.pips[pips][face - 1]} style={styles.layer} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  // Bundled images carry an intrinsic-size style on react-native-web; an
  // inset-only absoluteFill loses to it, so size the layers explicitly.
  layer: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
});
