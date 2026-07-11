import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { DICE } from "@/lib/gameArt";
import type { DiceTier } from "@/game/types";

/**
 * Authentic RISK II die face — original 22×22 sprites (red attacker die,
 * gold defender die) with tint expressed via tintColor so the tiered D12
 * colour language is preserved on React Native.
 */

interface TierStyle {
  sprite: "red" | "gold";
  /** tintColor overlay; undefined = no tint (show natural sprite colour). */
  tint?: string;
}

const TIER_STYLE: Record<DiceTier, TierStyle> = {
  white:  { sprite: "red",  tint: "#c8c8c8" },
  yellow: { sprite: "gold"                  },
  green:  { sprite: "red",  tint: "#4ade80" },
  red:    { sprite: "red"                   },
  black:  { sprite: "red",  tint: "#404040" },
};

interface RiskDieProps {
  value: number;
  tier: DiceTier;
  size?: number;
}

export function RiskDie({ value, tier, size = 40 }: RiskDieProps) {
  const face = Math.min(6, Math.max(1, Math.round(value)));
  const { sprite, tint } = TIER_STYLE[tier];
  const source = DICE[sprite][face - 1];

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={source}
        // tintColor as a prop — react-native-web deprecates it in style.
        tintColor={tint || undefined}
        style={[styles.img, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  img:  { },
});
