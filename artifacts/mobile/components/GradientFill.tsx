import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Linear-gradient fill rendered with react-native-svg.
 *
 * Replaces expo-linear-gradient: the published app's native runtime does not
 * register the ExpoLinearGradient view manager (it crashes with "View config
 * getter callback ... must be a function"), while react-native-svg is part of
 * the same runtime the game map already relies on. Dev-only clients (Expo Go)
 * ship every module, which is why the crash only appeared in the published app.
 */

let uid = 0;

export interface GradientFillProps {
  /** Gradient stops, first → last. 'transparent' fades the nearest color out. */
  colors: string[];
  /** Optional per-stop offsets (0–1). Defaults to an even spread. */
  locations?: number[];
  /** Left→right instead of top→bottom. */
  horizontal?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GradientFill({ colors, locations, horizontal = false, style }: GradientFillProps) {
  // Stable unique id — SVG gradient defs are looked up globally by id.
  const [id] = useState(() => `grad-fill-${++uid}`);
  const n = colors.length;
  const stops = colors.map((color, i) => {
    const offset = locations?.[i] ?? (n <= 1 ? 0 : i / (n - 1));
    if (color === 'transparent') {
      // Fade using the neighboring color at opacity 0 so the ramp never
      // darkens through transparent black.
      const neighbor =
        colors.slice(i + 1).find((c) => c !== 'transparent') ??
        colors
          .slice(0, i)
          .reverse()
          .find((c) => c !== 'transparent') ??
        '#000000';
      return { key: i, offset, color: neighbor, opacity: 0 };
    }
    return { key: i, offset, color, opacity: 1 };
  });

  return (
    <View style={[style, styles.noPointer]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient
            id={id}
            x1="0%"
            y1="0%"
            x2={horizontal ? '100%' : '0%'}
            y2={horizontal ? '0%' : '100%'}
          >
            {stops.map((s) => (
              <Stop key={s.key} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // style.pointerEvents (not the deprecated prop) — gradients are decoration.
  noPointer: { pointerEvents: 'none' },
});
