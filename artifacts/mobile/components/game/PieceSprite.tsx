import React from 'react';
import { Image as RNImage, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PIECE_ART } from '@/lib/art';
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
  const uri = PIECE_ART[type];
  return (
    <>
      <RNImage
        source={{ uri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="contain"
        fadeDuration={0}
      />
      <RNImage
        source={{ uri }}
        tintColor={color}
        style={[StyleSheet.absoluteFillObject, { opacity: TINT_OPACITY }]}
        resizeMode="contain"
        fadeDuration={0}
      />
    </>
  );
}

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
