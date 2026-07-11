import React from 'react';
import { Image as RNImage, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PIECES } from '@/lib/gameArt';
import type { PieceType } from '@/game/pieces';

/**
 * Playing-piece rendering — mirrors the web build's PieceSprite.tsx.
 *
 * The web tints the white-plastic miniatures with an SVG feColorMatrix
 * channel-multiply. Remote images inside react-native-svg are unreliable on
 * iOS, so on mobile each piece is a native RNImage pair: the untinted sprite
 * (keeps the plastic shading) with a tintColor overlay of the same sprite on
 * top — visually equivalent to the web's channel multiply on white plastic.
 */

/** Native sprite boxes in 1000-scale board units (matches web MAP_PIECE_BOX). */
export const MAP_PIECE_BOX: Record<PieceType, { w: number; h: number }> = {
  infantry: { w: 18, h: 31 },
  cavalry: { w: 38, h: 40 },
  artillery: { w: 42, h: 22 },
};

const TINT_OPACITY = 0.55;

function TintedSprite({ type, color }: { type: PieceType; color: string }) {
  const source = PIECES[type];
  return (
    <>
      <RNImage
        source={source}
        style={styles.fill}
        resizeMode="contain"
        fadeDuration={0}
      />
      <RNImage
        source={source}
        tintColor={color}
        style={[styles.fill, { opacity: TINT_OPACITY }]}
        resizeMode="contain"
        fadeDuration={0}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Bundled (require'd) images carry an intrinsic-size style on react-native-web,
  // and inset-only absoluteFill loses to it (width/height beat right/bottom in
  // CSS) — the sprite then renders at source pixel size, dwarfing the board.
  // Explicit 100% sizing wins the style merge on web and native alike.
  fill: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
});

/**
 * A miniature standing on the board: bottom-center anchored at (cx, baseY),
 * in board-pixel coordinates (scale = board pixels per 1000-scale unit).
 */
export function MapPiece({
  type,
  color,
  cx,
  baseY,
  scale = 1,
}: {
  type: PieceType;
  color: string;
  cx: number;
  baseY: number;
  scale?: number;
}) {
  const box = MAP_PIECE_BOX[type];
  const w = box.w * scale;
  const h = box.h * scale;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: cx - w / 2, top: baseY - h, width: w, height: h }}
    >
      <TintedSprite type={type} color={color} />
    </View>
  );
}

/** Standalone piece icon for panels, cards and overlays. */
export function PieceIcon({
  type,
  color,
  size = 36,
  style,
}: {
  type: PieceType;
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <TintedSprite type={type} color={color} />
    </View>
  );
}
