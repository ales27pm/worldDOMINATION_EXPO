import React, { useCallback, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { borderThreat, largestEmpire } from '@/game/analysis';
import { TERRITORY_MAP } from '@/game/mapData';
import { SHAPES_H, SHAPES_W, TERRITORY_PATHS } from '@/game/mapShapes';
import type { GameState, TerritoryId } from '@/game/types';
import { Colors } from '@/constants/colors';

// ─── View modes ───────────────────────────────────────────────────────────────

export type MapViewMode = 'board' | 'ownership' | 'threats' | 'strength' | 'empire';
export const MAP_VIEW_MODES: MapViewMode[] = ['board', 'ownership', 'threats', 'strength', 'empire'];
export const MAP_VIEW_LABELS: Record<MapViewMode, string> = {
  board: 'Board',
  ownership: 'Control',
  threats: 'Threats',
  strength: 'Strength',
  empire: 'Empire',
};

// ─── Camera constants ─────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HUD_TOP = 96;
const HUD_BOTTOM = 90;
const AVAIL_W = SCREEN_W;
const AVAIL_H = SCREEN_H - HUD_TOP - HUD_BOTTOM;
const BASE_SCALE = AVAIL_H / SHAPES_H;
const MIN_SCALE = BASE_SCALE * 0.85;
const MAX_SCALE = BASE_SCALE * 5;

// ─── Camera worklets ──────────────────────────────────────────────────────────

function clampCx(val: number, s: number): number {
  'worklet';
  const half = AVAIL_W / (2 * s);
  const lo = half;
  const hi = SHAPES_W - half;
  if (lo >= hi) return SHAPES_W / 2;
  return Math.max(lo, Math.min(hi, val));
}

function clampCy(val: number, s: number): number {
  'worklet';
  const half = AVAIL_H / (2 * s);
  const lo = half;
  const hi = SHAPES_H - half;
  if (lo >= hi) return SHAPES_H / 2;
  return Math.max(lo, Math.min(hi, val));
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

/** Blue→red heat colour for analysis view modes. */
function heat(t: number): string {
  const c = Math.min(1, Math.max(0, t));
  return `hsl(${Math.round(215 - 215 * c)}, 78%, 46%)`;
}

function overlayColor(base: string, strength: number): string {
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * strength));
  const ng = Math.min(255, Math.round(g + (255 - g) * strength));
  const nb = Math.min(255, Math.round(b + (255 - b) * strength));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

// ─── Territory tap detection (nearest-centre heuristic) ──────────────────────

function findTappedTerritory(
  svgX: number,
  svgY: number,
  activeIds: TerritoryId[],
): TerritoryId | null {
  const THRESHOLD_SQ = 55 * 55; // 55 SVG-unit hit radius
  let closest: TerritoryId | null = null;
  let minDistSq = THRESHOLD_SQ;
  for (const id of activeIds) {
    const def = TERRITORY_MAP[id];
    if (!def) continue;
    const dx = svgX - def.x * SHAPES_W;
    const dy = svgY - def.y * SHAPES_H;
    const dSq = dx * dx + dy * dy;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      closest = id;
    }
  }
  return closest;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  game: GameState;
  selected: TerritoryId | null;
  targets: Set<TerritoryId>;
  interactive: Set<TerritoryId>;
  viewMode: MapViewMode;
  onTerritoryTap: (id: TerritoryId) => void;
}

export default function GameMap({
  game,
  selected,
  targets,
  interactive,
  viewMode,
  onTerritoryTap,
}: Props) {
  // ── Camera shared values ──────────────────────────────────────────────────
  const cx = useSharedValue(SHAPES_W / 2);
  const cy = useSharedValue(SHAPES_H / 2);
  const scale = useSharedValue(BASE_SCALE);

  // Saved values at gesture start (separate per gesture to avoid races)
  const panStartCx = useSharedValue(SHAPES_W / 2);
  const panStartCy = useSharedValue(SHAPES_H / 2);
  const pinchStartCx = useSharedValue(SHAPES_W / 2);
  const pinchStartCy = useSharedValue(SHAPES_H / 2);
  const pinchStartScale = useSharedValue(BASE_SCALE);
  const pinchFocalX = useSharedValue(AVAIL_W / 2);
  const pinchFocalY = useSharedValue(AVAIL_H / 2);
  const isPanning = useSharedValue(false);

  // ── Stable tap handler (refs updated each render, stable function identity) ─
  const activeIdsRef = useRef<TerritoryId[]>(game.activeIds);
  activeIdsRef.current = game.activeIds;
  const onTapRef = useRef(onTerritoryTap);
  onTapRef.current = onTerritoryTap;

  const handleTap = useCallback((svgX: number, svgY: number) => {
    const id = findTappedTerritory(svgX, svgY, activeIdsRef.current);
    if (id) onTapRef.current(id);
  }, []); // intentionally empty — uses mutable refs

  // ── Gestures ──────────────────────────────────────────────────────────────

  /** 1-finger pan; lifts < 8 px total distance → treated as territory tap. */
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      'worklet';
      isPanning.value = false;
      panStartCx.value = cx.value;
      panStartCy.value = cy.value;
    })
    .onUpdate((e) => {
      'worklet';
      const moved = Math.abs(e.translationX) + Math.abs(e.translationY);
      if (moved > 8 || isPanning.value) {
        isPanning.value = true;
        cx.value = clampCx(panStartCx.value - e.translationX / scale.value, scale.value);
        cy.value = clampCy(panStartCy.value - e.translationY / scale.value, scale.value);
      }
    })
    .onEnd((e) => {
      'worklet';
      if (!isPanning.value) {
        const svgX = cx.value + (e.x - AVAIL_W / 2) / scale.value;
        const svgY = cy.value + (e.y - AVAIL_H / 2) / scale.value;
        runOnJS(handleTap)(svgX, svgY);
      }
    });

  /** 2-finger pinch to zoom toward the focal point. */
  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      'worklet';
      pinchStartScale.value = scale.value;
      pinchStartCx.value = cx.value;
      pinchStartCy.value = cy.value;
      pinchFocalX.value = e.focalX;
      pinchFocalY.value = e.focalY;
    })
    .onUpdate((e) => {
      'worklet';
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, pinchStartScale.value * e.scale),
      );
      // Pivot: keep the SVG point under the pinch focal fixed on screen
      const svgFX =
        pinchStartCx.value +
        (pinchFocalX.value - AVAIL_W / 2) / pinchStartScale.value;
      const svgFY =
        pinchStartCy.value +
        (pinchFocalY.value - AVAIL_H / 2) / pinchStartScale.value;
      scale.value = newScale;
      cx.value = clampCx(svgFX - (pinchFocalX.value - AVAIL_W / 2) / newScale, newScale);
      cy.value = clampCy(svgFY - (pinchFocalY.value - AVAIL_H / 2) / newScale, newScale);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  // ── Animated transform ────────────────────────────────────────────────────

  const animatedStyle = useAnimatedStyle(() => {
    const s = scale.value;
    const cxV = cx.value;
    const cyV = cy.value;
    // Position the SHAPES_W × SHAPES_H SVG so that (cxV, cyV) maps to screen centre.
    // translateX/Y are applied before scale (React Native transform order),
    // meaning they're in pre-scale space. We account for the centre-pivot:
    //   visual_left = (SHAPES_W/2 + tx) - SHAPES_W*s/2
    //   We want visual_left = AVAIL_W/2 - cxV*s
    //   → tx = AVAIL_W/2 - cxV*s - SHAPES_W/2 + SHAPES_W*s/2
    //        = (AVAIL_W - SHAPES_W)/2 + s*(SHAPES_W/2 - cxV)
    return {
      transform: [
        { translateX: (AVAIL_W - SHAPES_W) / 2 + s * (SHAPES_W / 2 - cxV) },
        { translateY: (AVAIL_H - SHAPES_H) / 2 + s * (SHAPES_H / 2 - cyV) },
        { scale: s },
      ],
    };
  });

  // ── Analysis data for non-board view modes ────────────────────────────────

  const { heatData, empireSet } = useMemo(() => {
    if (viewMode === 'board' || viewMode === 'ownership') {
      return {
        heatData: new Map<TerritoryId, number>(),
        empireSet: new Set<TerritoryId>(),
      };
    }
    const human = game.players.find((p) => p.isHuman);
    const empireSet = human
      ? largestEmpire(game, human.id)
      : new Set<TerritoryId>();
    const heatData = new Map<TerritoryId, number>();

    if (viewMode === 'threats') {
      let maxT = 0;
      for (const id of game.activeIds) {
        const ter = game.territories[id];
        if (ter.owner < 0) continue;
        const t = borderThreat(game, id, ter.owner);
        heatData.set(id, t);
        if (t > maxT) maxT = t;
      }
      if (maxT > 0)
        for (const [id, t] of heatData) heatData.set(id, t / maxT);
    } else if (viewMode === 'strength') {
      let maxA = 1;
      for (const id of game.activeIds)
        if (game.territories[id].armies > maxA) maxA = game.territories[id].armies;
      for (const id of game.activeIds)
        heatData.set(id, game.territories[id].armies / maxA);
    }
    return { heatData, empireSet };
  }, [game, viewMode]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.container}>
        <Animated.View style={[styles.svgWrap, animatedStyle]}>
          <Svg
            width={SHAPES_W}
            height={SHAPES_H}
            viewBox={`0 0 ${SHAPES_W} ${SHAPES_H}`}
          >
            {/* Ocean */}
            <Rect width={SHAPES_W} height={SHAPES_H} fill={Colors.ocean} />

            {/* Territory fills */}
            {game.activeIds.map((id) => {
              const path = TERRITORY_PATHS[id];
              if (!path) return null;
              const ter = game.territories[id];
              const owner = ter?.owner ?? -1;
              const baseColor =
                owner === -1
                  ? '#5a5545'
                  : (game.players[owner]?.color ?? '#888');

              let fill = baseColor;
              if (id === selected) {
                fill = Colors.territorySelected;
              } else if (targets.has(id)) {
                fill = Colors.territoryTarget;
              } else {
                switch (viewMode) {
                  case 'board':
                    fill = interactive.has(id)
                      ? overlayColor(baseColor, 0.35)
                      : baseColor;
                    break;
                  case 'ownership':
                    fill = baseColor;
                    break;
                  case 'threats': {
                    const t = heatData.get(id) ?? 0;
                    fill = t > 0 ? heat(t) : baseColor;
                    break;
                  }
                  case 'strength':
                    fill = heat(heatData.get(id) ?? 0);
                    break;
                  case 'empire':
                    fill = empireSet.has(id)
                      ? Colors.gold
                      : overlayColor(baseColor, -0.3);
                    break;
                }
              }

              const isSelected = id === selected;
              const isTarget = targets.has(id);
              return (
                <Path
                  key={id}
                  d={path}
                  fill={fill}
                  stroke={
                    isSelected
                      ? Colors.territorySelected
                      : isTarget
                      ? Colors.territoryTarget
                      : Colors.territoryStroke
                  }
                  strokeWidth={isSelected || isTarget ? 2.5 : 1}
                />
              );
            })}

            {/* Capital markers */}
            {game.players
              .filter(
                (p) =>
                  p.capital !== null && game.activeIds.includes(p.capital!),
              )
              .map((p) => {
                const cap = p.capital!;
                const def = TERRITORY_MAP[cap];
                if (!def) return null;
                return (
                  <Circle
                    key={`cap-${p.id}`}
                    cx={def.x * SHAPES_W}
                    cy={def.y * SHAPES_H}
                    r={20}
                    fill="none"
                    stroke="#ffd700"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                );
              })}

            {/* Army counters */}
            {game.activeIds.map((id) => {
              const ter = game.territories[id];
              const def = TERRITORY_MAP[id];
              if (!ter || !def || ter.armies <= 0) return null;
              const svgCx = def.x * SHAPES_W;
              const svgCy = def.y * SHAPES_H;
              const owner = ter.owner;
              const borderColor =
                owner === -1 ? '#888' : (game.players[owner]?.color ?? '#888');
              const isSelected = id === selected;
              const isTarget = targets.has(id);
              const bgColor = isSelected
                ? '#3a2800'
                : isTarget
                ? '#3a0a00'
                : '#1a0f05';
              const textColor = isSelected
                ? Colors.gold
                : isTarget
                ? Colors.textCrimson
                : Colors.text;
              const r =
                ter.armies >= 100 ? 18 : ter.armies >= 10 ? 15 : 13;
              const fontSize =
                ter.armies >= 100 ? 9 : ter.armies >= 10 ? 11 : 12;
              return (
                <G key={`army-${id}`}>
                  <Circle
                    cx={svgCx}
                    cy={svgCy}
                    r={r + 2}
                    fill={bgColor}
                    stroke={borderColor}
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={svgCx}
                    y={svgCy + fontSize / 3}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight="bold"
                    fill={textColor}
                  >
                    {ter.armies}
                  </SvgText>
                </G>
              );
            })}

            {/* Pending occupy highlight */}
            {game.pendingOccupy && (
              <>
                <Path
                  d={TERRITORY_PATHS[game.pendingOccupy.from] ?? ''}
                  fill="none"
                  stroke={Colors.gold}
                  strokeWidth={3}
                  strokeDasharray="6 3"
                />
                <Path
                  d={TERRITORY_PATHS[game.pendingOccupy.to] ?? ''}
                  fill="none"
                  stroke={Colors.gold}
                  strokeWidth={3}
                />
              </>
            )}
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: AVAIL_W,
    overflow: 'hidden',
    backgroundColor: Colors.ocean,
  },
  svgWrap: {
    position: 'absolute',
    width: SHAPES_W,
    height: SHAPES_H,
  },
});
