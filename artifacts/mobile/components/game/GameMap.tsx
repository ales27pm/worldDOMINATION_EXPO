import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Image as SvgImage,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { TERRITORY_MAP } from '@/game/mapData';
import { SHAPES_H, SHAPES_W } from '@/game/mapShapes';
import type { GameState, TerritoryId } from '@/game/types';
import { Colors } from '@/constants/colors';

// ─── Layout ───────────────────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HUD_TOP    = 96;
const HUD_BOTTOM = 96;
const FRAME      = 10; // wood frame thickness (screen px)
const AVAIL_H    = SCREEN_H - HUD_TOP - HUD_BOTTOM - FRAME * 2;
const MAP_SCALE  = AVAIL_H / SHAPES_H;
const MAP_W      = SHAPES_W * MAP_SCALE;
const MAP_H      = SHAPES_H * MAP_SCALE;

// Marker radii (in SVG viewBox units)
const R_TAP   = 52;
const R_OWNER = 26;
const R_BADGE = 18;
const R_CAP   = 34;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function withAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function starPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${cx + Math.cos(a)*rad},${cy + Math.sin(a)*rad}`);
  }
  return pts.join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  game: GameState;
  selected: TerritoryId | null;
  targets: Set<TerritoryId>;
  interactive: Set<TerritoryId>;
  onTerritoryTap: (id: TerritoryId) => void;
}

export default function GameMap({ game, selected, targets, interactive, onTerritoryTap }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const cx = MAP_W / 2 - SCREEN_W / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, cx), animated: false });
  }, []);

  const handlePress = useCallback((id: TerritoryId) => onTerritoryTap(id), [onTerritoryTap]);

  return (
    <View style={styles.frameContainer}>
      {/* ── Wooden frame top ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={[Colors.wood, Colors.woodMid, Colors.woodLight, Colors.woodMid, Colors.wood]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.frameTop}
      >
        <View style={styles.frameInnerLineH} />
      </LinearGradient>

      <View style={styles.mapRow}>
        {/* ── Wooden frame left ─────────────────────────────────────────── */}
        <LinearGradient
          colors={[Colors.wood, Colors.woodMid, Colors.woodLight, Colors.woodMid, Colors.wood]}
          style={styles.frameLeft}
        >
          <View style={styles.frameInnerLineV} />
        </LinearGradient>

        {/* ── The map ───────────────────────────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={{ width: MAP_W, height: MAP_H }}
          scrollEventThrottle={16}
          bounces={false}
        >
          <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${SHAPES_W} ${SHAPES_H}`}>
            <Defs>
              <RadialGradient id="selectGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor={Colors.gold} stopOpacity="0.9" />
                <Stop offset="100%" stopColor={Colors.gold} stopOpacity="0"   />
              </RadialGradient>
              <RadialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor={Colors.crimsonBright} stopOpacity="0.85" />
                <Stop offset="100%" stopColor={Colors.crimsonBright} stopOpacity="0"   />
              </RadialGradient>
              <RadialGradient id="interactiveGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor={Colors.gold} stopOpacity="0.35" />
                <Stop offset="100%" stopColor={Colors.gold} stopOpacity="0"    />
              </RadialGradient>
            </Defs>

            {/* ── Vintage map background ──────────────────────────────── */}
            <SvgImage
              href={require('@/assets/images/world-map.png')}
              x={0} y={0} width={SHAPES_W} height={SHAPES_H}
              preserveAspectRatio="none"
            />

            {/* ── Territory markers ───────────────────────────────────── */}
            {game.activeIds.map((id) => {
              const def = TERRITORY_MAP[id];
              const ter = game.territories[id];
              if (!def || !ter) return null;

              const cx = def.x * SHAPES_W;
              const cy = def.y * SHAPES_H;
              const isSelected    = id === selected;
              const isTarget      = targets.has(id);
              const isInteractive = interactive.has(id);
              const owner = ter.owner;
              const ownerColor = owner === -1 ? '#888888' : (game.players[owner]?.color ?? '#888888');

              return (
                <G key={id} onPress={() => handlePress(id)}>
                  {isSelected    && <Circle cx={cx} cy={cy} r={R_TAP + 8} fill="url(#selectGlow)"      />}
                  {isTarget      && <Circle cx={cx} cy={cy} r={R_TAP + 6} fill="url(#targetGlow)"      />}
                  {isInteractive && !isSelected && !isTarget &&
                                    <Circle cx={cx} cy={cy} r={R_TAP + 4} fill="url(#interactiveGlow)" />}

                  {/* Invisible hit zone */}
                  <Circle cx={cx} cy={cy} r={R_TAP} fill="transparent" />

                  {/* Owner disc */}
                  <Circle
                    cx={cx} cy={cy} r={R_OWNER}
                    fill={withAlpha(ownerColor, isSelected ? 0.96 : 0.82)}
                    stroke={isSelected ? Colors.gold : isTarget ? Colors.crimsonBright : isInteractive ? Colors.gold : '#22160880'}
                    strokeWidth={isSelected || isTarget ? 3.5 : isInteractive ? 2.5 : 1.5}
                    strokeDasharray={isInteractive && !isSelected && !isTarget ? '6 3' : undefined}
                  />

                  {/* Army badge */}
                  {ter.armies > 0 && (
                    <>
                      <Circle
                        cx={cx} cy={cy} r={R_BADGE}
                        fill={isSelected ? '#3a2800ee' : '#16100aee'}
                        stroke={isSelected ? Colors.gold : ownerColor}
                        strokeWidth={isSelected ? 2 : 1.5}
                      />
                      <SvgText
                        x={cx} y={cy + 5}
                        textAnchor="middle"
                        fontSize={ter.armies >= 100 ? 11 : ter.armies >= 10 ? 13 : 14}
                        fontWeight="bold"
                        fill={isSelected ? Colors.gold : isTarget ? Colors.textCrimson : Colors.text}
                      >
                        {ter.armies}
                      </SvgText>
                    </>
                  )}
                </G>
              );
            })}

            {/* ── Capitals ────────────────────────────────────────────── */}
            {game.players
              .filter((p) => p.capital !== null && game.activeIds.includes(p.capital!))
              .map((p) => {
                const def = TERRITORY_MAP[p.capital!];
                if (!def) return null;
                const cx = def.x * SHAPES_W;
                const cy = def.y * SHAPES_H;
                return (
                  <G key={`cap-${p.id}`} pointerEvents="none">
                    <Circle cx={cx} cy={cy} r={R_CAP} fill="none"
                      stroke="#ffd700" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.75} />
                    <Circle cx={cx} cy={cy - R_OWNER - 1} r={8} fill={Colors.gold} stroke="#16100a" strokeWidth={1} />
                    <Polygon points={starPoints(cx, cy - R_OWNER - 1, 8)} fill={Colors.gold} stroke="#16100a" strokeWidth={0.5} />
                  </G>
                );
              })}

            {/* ── Pending occupy ──────────────────────────────────────── */}
            {game.pendingOccupy && (() => {
              const fd = TERRITORY_MAP[game.pendingOccupy.from];
              const td = TERRITORY_MAP[game.pendingOccupy.to];
              if (!fd || !td) return null;
              return (
                <G pointerEvents="none">
                  <Circle cx={fd.x*SHAPES_W} cy={fd.y*SHAPES_H} r={R_OWNER+10}
                    fill="none" stroke={Colors.gold} strokeWidth={3} strokeDasharray="8 4" />
                  <Circle cx={td.x*SHAPES_W} cy={td.y*SHAPES_H} r={R_OWNER+10}
                    fill="none" stroke={Colors.gold} strokeWidth={3} />
                </G>
              );
            })()}
          </Svg>
        </ScrollView>

        {/* ── Wooden frame right ─────────────────────────────────────── */}
        <LinearGradient
          colors={[Colors.wood, Colors.woodMid, Colors.woodLight, Colors.woodMid, Colors.wood]}
          style={styles.frameRight}
        >
          <View style={styles.frameInnerLineV} />
        </LinearGradient>
      </View>

      {/* ── Wooden frame bottom ──────────────────────────────────────────── */}
      <LinearGradient
        colors={[Colors.wood, Colors.woodMid, Colors.woodLight, Colors.woodMid, Colors.wood]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.frameBottom}
      >
        <View style={styles.frameInnerLineH} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frameContainer: { flex: 1, backgroundColor: Colors.wood },

  frameTop: { height: FRAME, justifyContent: 'flex-end' },
  frameBottom: { height: FRAME, justifyContent: 'flex-start' },
  frameLeft: { width: FRAME, alignItems: 'flex-end', justifyContent: 'center' },
  frameRight: { width: FRAME, alignItems: 'flex-start', justifyContent: 'center' },

  frameInnerLineH: { height: 1, backgroundColor: Colors.gold + '55' },
  frameInnerLineV: { width: 1, flex: 1, backgroundColor: Colors.gold + '55' },

  mapRow: { flex: 1, flexDirection: 'row' },
  scroll: { flex: 1 },
});
