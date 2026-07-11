import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import {
  EDGE_PAD,
  MANUAL_MIN_VW,
  MAP_H,
  MAP_W,
  autoMinVw,
  cameraForAttention,
  clampCamera,
  computeAttention,
  defaultCamera,
  fullCamera,
  type Camera,
} from '@/game/camera';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import type { GameState, TerritoryId } from '@/game/types';

/**
 * Camera rig over the board — mirrors the web build's MapViewport.tsx.
 *
 * The camera is {cx, cy, vw} in map units. The current camera glides toward
 * its target every frame with the web's exponential ease (k = 1 − e^(−7.5·dt)).
 * Auto mode follows the attention director; any drag/pinch switches to manual;
 * a phase/player change (autoKey) re-engages auto framing. Double-tap zooms in
 * (or re-engages auto when already deep), and the on-map control cluster gives
 * Auto / Zoom in / Zoom out / Full board.
 */

const DOUBLE_TAP_ZOOM = 2.4;
const BUTTON_ZOOM = 1.45;

interface MapViewportProps {
  game: GameState;
  selected: TerritoryId | null;
  onBoardTap: (x: number, y: number) => void;
  children: React.ReactNode;
}

export function MapViewport({ game, selected, onBoardTap, children }: MapViewportProps) {
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const modeRef = useRef<'auto' | 'manual'>('auto');
  const [, forceRender] = useState(0);
  const setMode = useCallback((m: 'auto' | 'manual') => {
    if (modeRef.current !== m) {
      modeRef.current = m;
      forceRender((n) => n + 1);
    }
  }, []);

  // Current camera + target camera (map units). Glide happens on the UI thread.
  const cx = useSharedValue(MAP_W / 2);
  const cy = useSharedValue(MAP_H / 2);
  const vw = useSharedValue(MAP_W);
  const tcx = useSharedValue(MAP_W / 2);
  const tcy = useSharedValue(MAP_H / 2);
  const tvw = useSharedValue(MAP_W);

  // Layout mirrored into shared values for worklet math.
  const lw = useSharedValue(1);
  const lh = useSharedValue(1);

  const gestureStart = useSharedValue({ cx: 0, cy: 0, vw: 0, fx: 0, fy: 0 });
  const isPanning = useSharedValue(false);

  const aspect = layout.w > 0 && layout.h > 0 ? layout.w / layout.h : MAP_W / MAP_H;

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      setLayout({ w: width, h: height });
      lw.value = width;
      lh.value = height;
    },
    [lw, lh],
  );

  const setTarget = useCallback(
    (cam: Camera, snap = false) => {
      const clamped = clampCamera(cam, aspect, Math.min(MANUAL_MIN_VW, cam.vw));
      tcx.value = clamped.cx;
      tcy.value = clamped.cy;
      tvw.value = clamped.vw;
      if (snap) {
        cx.value = clamped.cx;
        cy.value = clamped.cy;
        vw.value = clamped.vw;
      }
    },
    [aspect, tcx, tcy, tvw, cx, cy, vw],
  );

  // ── Attention director (auto mode) ─────────────────────────────────────────
  const autoKey = `${game.phase}|${game.currentPlayer}|${game.pendingOccupy?.to ?? ''}|${game.awaitingHandoff ? 1 : 0}`;
  const firstFrame = useRef(true);

  useEffect(() => {
    setMode('auto');
  }, [autoKey, setMode]);

  useEffect(() => {
    if (layout.w <= 0 || layout.h <= 0) return;
    if (modeRef.current !== 'auto') return;
    const points = computeAttention(game, selected);
    const cam =
      points.length === 0
        ? defaultCamera(aspect)
        : cameraForAttention(points, aspect, autoMinVw(layout.w));
    setTarget(cam, firstFrame.current);
    firstFrame.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, selected, layout, aspect]);

  // ── Per-frame exponential glide (web: k = 1 − e^(−7.5·dt)) ────────────────
  useFrameCallback((frame) => {
    'worklet';
    const dt = (frame.timeSincePreviousFrame ?? 16) / 1000;
    const k = 1 - Math.exp(-7.5 * dt);
    const dx = tcx.value - cx.value;
    const dy = tcy.value - cy.value;
    const dw = tvw.value - vw.value;
    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(dw) < 0.05) {
      cx.value = tcx.value;
      cy.value = tcy.value;
      vw.value = tvw.value;
      return;
    }
    cx.value += dx * k;
    cy.value += dy * k;
    vw.value += dw * k;
  });

  // ── Worklet camera clamp ───────────────────────────────────────────────────
  const clampW = useCallback(
    (ncx: number, ncy: number, nvw: number) => {
      'worklet';
      const asp = lw.value > 0 && lh.value > 0 ? lw.value / lh.value : MAP_W / MAP_H;
      const fit = Math.max(MAP_W, MAP_H * asp);
      const v = Math.min(Math.max(nvw, Math.min(MANUAL_MIN_VW, fit)), fit);
      const vh = v / asp;
      const rcx =
        v >= MAP_W
          ? MAP_W / 2
          : Math.min(Math.max(ncx, v / 2 - EDGE_PAD), MAP_W - v / 2 + EDGE_PAD);
      const rcy = vh >= MAP_H ? MAP_H / 2 : Math.min(Math.max(ncy, vh / 2), MAP_H - vh / 2);
      return { cx: rcx, cy: rcy, vw: v };
    },
    [lw, lh],
  );

  // ── Gestures ───────────────────────────────────────────────────────────────
  const goManual = useCallback(() => setMode('manual'), [setMode]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onStart(() => {
          'worklet';
          isPanning.value = false;
          gestureStart.value = { cx: cx.value, cy: cy.value, vw: vw.value, fx: 0, fy: 0 };
        })
        .onUpdate((e) => {
          'worklet';
          const moved = Math.abs(e.translationX) + Math.abs(e.translationY);
          if (moved > 7 || isPanning.value) {
            if (!isPanning.value) {
              isPanning.value = true;
              runOnJS(goManual)();
            }
            const s = lw.value / vw.value;
            const cam = clampW(
              gestureStart.value.cx - e.translationX / s,
              gestureStart.value.cy - e.translationY / s,
              vw.value,
            );
            cx.value = cam.cx;
            cy.value = cam.cy;
            tcx.value = cam.cx;
            tcy.value = cam.cy;
            tvw.value = vw.value;
          }
        }),
    [clampW, goManual, cx, cy, vw, tcx, tcy, tvw, gestureStart, isPanning, lw],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart((e) => {
          'worklet';
          gestureStart.value = { cx: cx.value, cy: cy.value, vw: vw.value, fx: e.focalX, fy: e.focalY };
          runOnJS(goManual)();
        })
        .onUpdate((e) => {
          'worklet';
          const start = gestureStart.value;
          const s0 = lw.value / start.vw;
          // Board point under the initial focal — keep it pinned on screen.
          const bx = start.cx + (start.fx - lw.value / 2) / s0;
          const by = start.cy + (start.fy - lh.value / 2) / s0;
          const nvwRaw = start.vw / e.scale;
          const asp = lw.value / lh.value;
          const fit = Math.max(MAP_W, MAP_H * asp);
          const nvw = Math.min(Math.max(nvwRaw, MANUAL_MIN_VW), fit);
          const s1 = lw.value / nvw;
          const cam = clampW(bx - (start.fx - lw.value / 2) / s1, by - (start.fy - lh.value / 2) / s1, nvw);
          cx.value = cam.cx;
          cy.value = cam.cy;
          vw.value = cam.vw;
          tcx.value = cam.cx;
          tcy.value = cam.cy;
          tvw.value = cam.vw;
        }),
    [clampW, goManual, cx, cy, vw, tcx, tcy, tvw, gestureStart, lw, lh],
  );

  const handleDoubleTap = useCallback(
    (bx: number, by: number) => {
      const deep = vw.value <= autoMinVw(layout.w) * 1.15;
      if (deep) {
        setMode('auto');
        const points = computeAttention(game, selected);
        const cam =
          points.length === 0
            ? defaultCamera(aspect)
            : cameraForAttention(points, aspect, autoMinVw(layout.w));
        setTarget(cam);
        return;
      }
      setMode('manual');
      setTarget({ cx: bx, cy: by, vw: Math.max(MANUAL_MIN_VW, vw.value / DOUBLE_TAP_ZOOM) });
    },
    [game, selected, aspect, layout.w, setMode, setTarget, vw],
  );

  const handleSingleTap = useCallback(
    (bx: number, by: number) => {
      onBoardTap(bx, by);
    },
    [onBoardTap],
  );

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDelay(320)
        .onEnd((e) => {
          'worklet';
          const s = lw.value / vw.value;
          const bx = cx.value + (e.x - lw.value / 2) / s;
          const by = cy.value + (e.y - lh.value / 2) / s;
          runOnJS(handleDoubleTap)(bx, by);
        }),
    [handleDoubleTap, cx, cy, vw, lw, lh],
  );

  const singleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .maxDeltaX(12)
        .maxDeltaY(12)
        .onEnd((e) => {
          'worklet';
          const s = lw.value / vw.value;
          const bx = cx.value + (e.x - lw.value / 2) / s;
          const by = cy.value + (e.y - lh.value / 2) / s;
          runOnJS(handleSingleTap)(bx, by);
        }),
    [handleSingleTap, cx, cy, vw, lw, lh],
  );

  const composed = useMemo(
    () =>
      Gesture.Simultaneous(
        panGesture,
        pinchGesture,
        Gesture.Exclusive(doubleTapGesture, singleTapGesture),
      ),
    [panGesture, pinchGesture, doubleTapGesture, singleTapGesture],
  );

  // ── Control cluster actions ────────────────────────────────────────────────
  const zoomBy = useCallback(
    (factor: number) => {
      setMode('manual');
      setTarget({ cx: tcx.value, cy: tcy.value, vw: tvw.value * factor });
    },
    [setMode, setTarget, tcx, tcy, tvw],
  );

  const showFull = useCallback(() => {
    setMode('manual');
    setTarget(fullCamera(aspect));
  }, [aspect, setMode, setTarget]);

  const engageAuto = useCallback(() => {
    setMode('auto');
    const points = computeAttention(game, selected);
    const cam =
      points.length === 0
        ? defaultCamera(aspect)
        : cameraForAttention(points, aspect, autoMinVw(layout.w));
    setTarget(cam);
  }, [game, selected, aspect, layout.w, setMode, setTarget]);

  // ── Board transform ────────────────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => {
    const s = lw.value > 0 ? lw.value / vw.value : 1;
    return {
      transform: [
        { translateX: (lw.value - MAP_W) / 2 + s * (MAP_W / 2 - cx.value) },
        { translateY: (lh.value - MAP_H) / 2 + s * (MAP_H / 2 - cy.value) },
        { scale: s },
      ],
    };
  });

  const auto = modeRef.current === 'auto';

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={composed}>
        <View style={StyleSheet.absoluteFillObject} collapsable={false}>
          <Animated.View style={[styles.boardWrap, animatedStyle]}>{children}</Animated.View>
        </View>
      </GestureDetector>

      {/* Control cluster — Auto / Zoom in / Zoom out / Full board */}
      <View style={styles.cluster} pointerEvents="box-none">
        <ClusterButton label="⌖" active={auto} onPress={engageAuto} accessibilityLabel="Auto camera" />
        <ClusterButton label="+" onPress={() => zoomBy(1 / BUTTON_ZOOM)} accessibilityLabel="Zoom in" />
        <ClusterButton label="−" onPress={() => zoomBy(BUTTON_ZOOM)} accessibilityLabel="Zoom out" />
        <ClusterButton label="▣" onPress={showFull} accessibilityLabel="Full board" />
      </View>
    </View>
  );
}

function ClusterButton({
  label,
  onPress,
  active,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.clusterBtn,
        active && styles.clusterBtnActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.clusterLabel, active && styles.clusterLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: Colors.ocean },
  boardWrap: { position: 'absolute', width: MAP_W, height: MAP_H },
  cluster: {
    position: 'absolute',
    right: 10,
    // Clear the floating bottom command panel.
    bottom: 128,
    gap: 6,
  },
  clusterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(222,190,115,0.45)',
    backgroundColor: 'rgba(21,13,9,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(58,40,8,0.85)',
  },
  clusterLabel: {
    color: Colors.textMuted,
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    lineHeight: 20,
  },
  clusterLabelActive: { color: Colors.gold },
});
