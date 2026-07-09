import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { TERRITORY_MAP } from '@/game/mapData';
import { SHAPES_H, SHAPES_W, TERRITORY_PATHS } from '@/game/mapShapes';
import type { GameState, TerritoryId } from '@/game/types';
import { Colors } from '@/constants/colors';

interface Props {
  game: GameState;
  selected: TerritoryId | null;
  targets: Set<TerritoryId>;
  interactive: Set<TerritoryId>;
  onTerritoryTap: (id: TerritoryId) => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HUD_TOP = 96;
const HUD_BOTTOM = 90;
const AVAIL_H = SCREEN_H - HUD_TOP - HUD_BOTTOM;
const MAP_SCALE = AVAIL_H / SHAPES_H;
const MAP_W = SHAPES_W * MAP_SCALE;
const MAP_H = SHAPES_H * MAP_SCALE;

/** Brighten a hex color slightly for interactive/selected states */
function overlayColor(base: string, strength: number): string {
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * strength));
  const ng = Math.min(255, Math.round(g + (255 - g) * strength));
  const nb = Math.min(255, Math.round(b + (255 - b) * strength));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function getTerritoryFill(
  id: TerritoryId,
  game: GameState,
  selected: TerritoryId | null,
  targets: Set<TerritoryId>,
  interactive: Set<TerritoryId>,
): string {
  const ter = game.territories[id];
  if (!ter) return '#5a5545';
  const owner = ter.owner;
  const baseColor = owner === -1 ? '#5a5545' : (game.players[owner]?.color ?? '#888');

  if (id === selected) return Colors.territorySelected;
  if (targets.has(id)) return Colors.territoryTarget;
  if (interactive.has(id)) return overlayColor(baseColor, 0.35);
  return baseColor;
}

export default function GameMap({ game, selected, targets, interactive, onTerritoryTap }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  // Center map horizontally on mount (show middle of world)
  useEffect(() => {
    const centerX = MAP_W / 2 - SCREEN_W / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, centerX), animated: false });
  }, []);

  const handlePress = useCallback((id: TerritoryId) => {
    onTerritoryTap(id);
  }, [onTerritoryTap]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={{ width: MAP_W, height: MAP_H }}
      scrollEventThrottle={16}
      bounces={false}
    >
      <Svg
        width={MAP_W}
        height={MAP_H}
        viewBox={`0 0 ${SHAPES_W} ${SHAPES_H}`}
        style={styles.svg}
      >
        {/* Ocean */}
        <Rect width={SHAPES_W} height={SHAPES_H} fill={Colors.ocean} />

        {/* Territory shapes */}
        {game.activeIds.map((id) => {
          const path = TERRITORY_PATHS[id];
          if (!path) return null;
          const fill = getTerritoryFill(id, game, selected, targets, interactive);
          const isSelected = id === selected;
          const isTarget = targets.has(id);
          return (
            <Path
              key={id}
              d={path}
              fill={fill}
              stroke={isSelected ? Colors.territorySelected : isTarget ? Colors.territoryTarget : Colors.territoryStroke}
              strokeWidth={isSelected || isTarget ? 2.5 : 1}
              onPress={() => handlePress(id)}
            />
          );
        })}

        {/* Capital markers */}
        {game.players
          .filter((p) => p.capital !== null && game.activeIds.includes(p.capital!))
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
          const cx = def.x * SHAPES_W;
          const cy = def.y * SHAPES_H;
          const owner = ter.owner;
          const borderColor = owner === -1 ? '#888' : (game.players[owner]?.color ?? '#888');
          const isSelected = id === selected;
          const isTarget = targets.has(id);
          const bgColor = isSelected ? '#3a2800' : isTarget ? '#3a0a00' : '#1a0f05';
          const textColor = isSelected ? Colors.gold : isTarget ? Colors.textCrimson : Colors.text;
          const r = ter.armies >= 100 ? 18 : ter.armies >= 10 ? 15 : 13;
          const fontSize = ter.armies >= 100 ? 9 : ter.armies >= 10 ? 11 : 12;

          return (
            <G key={`army-${id}`}>
              <Circle cx={cx} cy={cy} r={r + 2} fill={bgColor} stroke={borderColor} strokeWidth={1.5} />
              <SvgText
                x={cx}
                y={cy + fontSize / 3}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  svg: {},
});
