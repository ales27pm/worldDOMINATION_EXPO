import React, { useMemo } from 'react';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { WORLD_BOARD } from '@/lib/gameArt';
import { MapPiece } from '@/components/game/PieceSprite';
import { BattleArrowLayer } from '@/components/game/BattleArrowLayer';
import { borderThreat, largestEmpire } from '@/game/analysis';
import { activeTerritories, CONTINENTS, TERRITORY_MAP } from '@/game/mapData';
import { TERRITORY_PATHS } from '@/game/mapShapes';
import { dominantPiece } from '@/game/pieces';
import { Fonts } from '@/constants/typography';
import type { ContinentId, GameState, TerritoryId } from '@/game/types';

/** RISK II view modifiers (manual, Chapter 9). */
export type MapViewMode = 'board' | 'ownership' | 'threats' | 'strength' | 'empire';

export const MAP_VIEW_MODES: MapViewMode[] = ['board', 'ownership', 'threats', 'strength', 'empire'];
export const MAP_VIEW_LABELS: Record<MapViewMode, string> = {
  board: 'Board',
  ownership: 'Ownership',
  threats: 'Border Threats',
  strength: 'Troop Strength',
  empire: 'Empires',
};

export const W = 1536;
export const H = 1024;

const BOARD_SCALE = W / 1000;
const scaleBoard = (value: number) => value * BOARD_SCALE;

const INK = '#6b4a26';
const INK_DARK = '#4a3418';

const PIECE_BASE_OFFSET_Y = scaleBoard(18);
const PIECE_SHADOW_OFFSET_Y = PIECE_BASE_OFFSET_Y + scaleBoard(2);
const PIECE_SPRITE_BASE_OFFSET_Y = PIECE_BASE_OFFSET_Y + scaleBoard(1);
const ARMY_ROUNDEL_OFFSET_X = scaleBoard(13);
const ARMY_ROUNDEL_OFFSET_Y = PIECE_BASE_OFFSET_Y - scaleBoard(7);

/** Blue (safe/weak) → red (dangerous/strong) heat color. */
function heat(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  return `hsl(${Math.round(215 - 215 * clamped)}, 78%, 46%)`;
}

/**
 * Neighbor pairs that cross open water — only these get the classic red dashed
 * sea-route lines. Land adjacencies are implied by the painted borders.
 */
const SEA_ROUTES = new Set<string>(
  [
    ['alaska', 'kamchatka'],
    ['greenland', 'northwestTerritory'],
    ['greenland', 'ontario'],
    ['greenland', 'quebec'],
    ['greenland', 'iceland'],
    ['greenland', 'svalbard'],
    ['iceland', 'svalbard'],
    ['iceland', 'scandinavia'],
    ['iceland', 'greatBritain'],
    ['scandinavia', 'svalbard'],
    ['scandinavia', 'greatBritain'],
    ['greatBritain', 'northernEurope'],
    ['greatBritain', 'westernEurope'],
    ['brazil', 'northAfrica'],
    ['westernEurope', 'northAfrica'],
    ['southernEurope', 'northAfrica'],
    ['southernEurope', 'egypt'],
    ['eastAfrica', 'middleEast'],
    ['eastAfrica', 'madagascar'],
    ['southAfrica', 'madagascar'],
    ['madagascar', 'falklandIslands'],
    ['argentina', 'falklandIslands'],
    ['argentina', 'newZealand'],
    ['easternAustralia', 'newZealand'],
    ['kamchatka', 'japan'],
    ['mongolia', 'japan'],
    ['japan', 'philippines'],
    ['japan', 'hawaii'],
    ['westernUS', 'hawaii'],
    ['siam', 'indonesia'],
    ['siam', 'philippines'],
    ['philippines', 'indonesia'],
    ['indonesia', 'newGuinea'],
    ['indonesia', 'westernAustralia'],
    ['newGuinea', 'westernAustralia'],
    ['newGuinea', 'easternAustralia'],
  ].map((pair) => [...pair].sort().join('~')),
);

interface Edge {
  key: string;
  segments: { x1: number; y1: number; x2: number; y2: number }[];
}

function buildEdges(includeExtra: boolean): Edge[] {
  const defs = activeTerritories(includeExtra);
  const pos = new Map<TerritoryId, { x: number; y: number }>();
  for (const def of defs) pos.set(def.id, { x: def.x * W, y: def.y * H });
  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const def of defs) {
    for (const neighbor of def.neighbors) {
      const key = [def.id, neighbor].sort().join('~');
      if (seen.has(key)) continue;
      seen.add(key);
      if (!SEA_ROUTES.has(key)) continue;
      const a = pos.get(def.id);
      const b = pos.get(neighbor as TerritoryId);
      if (!a || !b) continue;
      if (Math.abs(a.x - b.x) > W * 0.5) {
        // Wrap-around route (e.g. Alaska–Kamchatka): exit both map edges.
        const left = a.x < b.x ? a : b;
        const right = a.x < b.x ? b : a;
        edges.push({
          key,
          segments: [
            { x1: left.x, y1: left.y, x2: 0, y2: (left.y + right.y) / 2 },
            { x1: W, y1: (left.y + right.y) / 2, x2: right.x, y2: right.y },
          ],
        });
      } else {
        edges.push({ key, segments: [{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }] });
      }
    }
  }
  return edges;
}

// ─── Territory hit testing (point-in-polygon on the traced outlines) ─────────

interface HitShape {
  polys: number[][];
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

const HIT_SHAPES: Partial<Record<TerritoryId, HitShape>> = {};
for (const id of Object.keys(TERRITORY_PATHS) as TerritoryId[]) {
  const d = TERRITORY_PATHS[id];
  if (!d) continue;
  const polys = d
    .split('M')
    .map((seg) => (seg.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number))
    .filter((coords) => coords.length >= 6);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i += 2) {
      if (poly[i] < x0) x0 = poly[i];
      if (poly[i] > x1) x1 = poly[i];
      if (poly[i + 1] < y0) y0 = poly[i + 1];
      if (poly[i + 1] > y1) y1 = poly[i + 1];
    }
  }
  HIT_SHAPES[id] = { polys, bbox: { x0, y0, x1, y1 } };
}

function pointInPoly(px: number, py: number, poly: number[]): boolean {
  let inside = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const yi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const yj = poly[j * 2 + 1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Resolve a tap in board pixels to a territory: exact shape containment first
 * (like the web's SVG hit targets), then nearest piece-node center as a
 * fallback for taps on the figure/roundel that overhang small territories.
 */
export function hitTestTerritory(
  x: number,
  y: number,
  activeIds: readonly TerritoryId[],
): TerritoryId | null {
  for (const id of activeIds) {
    const shape = HIT_SHAPES[id];
    if (!shape) continue;
    const { bbox } = shape;
    if (x < bbox.x0 || x > bbox.x1 || y < bbox.y0 || y > bbox.y1) continue;
    for (const poly of shape.polys) {
      if (pointInPoly(x, y, poly)) return id;
    }
  }
  // Fallback: the piece / roundel node around the territory center.
  const threshold = scaleBoard(30);
  let closest: TerritoryId | null = null;
  let minD = threshold * threshold;
  for (const id of activeIds) {
    const def = TERRITORY_MAP[id];
    if (!def) continue;
    const dx = x - def.x * W;
    const dy = y - (def.y * H + PIECE_BASE_OFFSET_Y / 2);
    const d = dx * dx + dy * dy;
    if (d < minD) {
      minD = d;
      closest = id;
    }
  }
  return closest;
}

// ─── Presentational bits ──────────────────────────────────────────────────────

function OceanLabel({ x, y, lines, size }: { x: number; y: number; lines: string[]; size: number }) {
  return (
    <View pointerEvents="none" style={[styles.oceanWrap, { left: x - 200, top: y - size }]}>
      {lines.map((line) => (
        <Text key={line} style={[styles.oceanText, { fontSize: size, letterSpacing: size * 0.4 }]}>
          {line.toUpperCase()}
        </Text>
      ))}
    </View>
  );
}

interface WorldBoardProps {
  game: GameState;
  selected: TerritoryId | null;
  targets: Set<TerritoryId>;
  interactive: Set<TerritoryId>;
  viewMode: MapViewMode;
}

/**
 * The full 1536×1024 painted board with its cartographic overlay — mirrors
 * the web build's WorldMap.tsx. The painted board and the figures are native
 * RNImages (remote images inside react-native-svg are unreliable on iOS),
 * sandwiched between two SVG layers that carry the traced outlines, sea
 * routes, tints, rings, roundels, stars, labels, legend and frame.
 */
export const WorldBoard = React.memo(function WorldBoard({
  game,
  selected,
  targets,
  interactive,
  viewMode,
}: WorldBoardProps) {
  const defs = useMemo(
    () => activeTerritories(game.setup.useExtraTerritories),
    [game.setup.useExtraTerritories],
  );
  const edges = useMemo(
    () => buildEdges(game.setup.useExtraTerritories),
    [game.setup.useExtraTerritories],
  );
  const capitals = useMemo(() => {
    // Capital RISK secrecy (manual, Ch. 6): capitals stay hidden from other
    // commanders until the reveal fires — a viewer always knows their own.
    const viewerId = game.players.find((p) => p.isHuman)?.id;
    const map = new Map<TerritoryId, number>();
    for (const p of game.players) {
      if (p.capital && (game.capitalsRevealed || p.id === viewerId)) map.set(p.capital, p.id);
    }
    return map;
  }, [game.players, game.capitalsRevealed]);

  // View-modifier tint per territory (manual, Chapter 9: The View Modifier).
  const overlay = useMemo(() => {
    if (viewMode === 'board') return null;
    const map = new Map<TerritoryId, string>();
    if (viewMode === 'ownership') {
      for (const id of game.activeIds) {
        const owner = game.players[game.territories[id].owner];
        if (owner) map.set(id, owner.color);
      }
    } else if (viewMode === 'threats') {
      for (const id of game.activeIds) {
        const territory = game.territories[id];
        if (territory.owner < 0) continue;
        const threat = borderThreat(game, id, territory.owner);
        const ratio = threat / Math.max(1, territory.armies);
        map.set(id, heat(ratio / 3));
      }
    } else if (viewMode === 'strength') {
      const max = Math.max(1, ...game.activeIds.map((id) => game.territories[id].armies));
      for (const id of game.activeIds) {
        if (game.territories[id].owner < 0) continue;
        map.set(id, heat(game.territories[id].armies / max));
      }
    } else if (viewMode === 'empire') {
      for (const player of game.players) {
        if (!player.alive) continue;
        for (const id of largestEmpire(game, player.id)) {
          map.set(id, player.color);
        }
      }
    }
    return map;
  }, [game, viewMode]);

  return (
    <View style={styles.board} pointerEvents="none">
      {/* The painted Risk II world board (bundled with the app). Explicit
          size — bundled images otherwise render at intrinsic pixel size on
          web (inset-only styles lose the merge against it). */}
      <RNImage
        source={WORLD_BOARD}
        style={[StyleSheet.absoluteFillObject, { width: W, height: H }]}
        resizeMode="stretch"
        fadeDuration={0}
      />

      {/* Under layer: vignette, ocean lettering, sea routes, tints, rings */}
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={styles.svg}>
        <Defs>
          <RadialGradient id="seaVignette" cx="50%" cy="42%" r="85%">
            <Stop offset="0%" stopColor="hsl(30, 40%, 30%)" stopOpacity="0" />
            <Stop offset="75%" stopColor="hsl(30, 42%, 28%)" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="hsl(28, 44%, 22%)" stopOpacity="0.28" />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#seaVignette)" />

        {/* Sea routes — classic red dashed lines */}
        {edges.map((edge) =>
          edge.segments.map((s, i) => (
            <Line
              key={`${edge.key}-${i}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="#a63d2b"
              strokeOpacity={0.65}
              strokeWidth={scaleBoard(1.6)}
              strokeDasharray="5 5"
            />
          )),
        )}

        {/* View-modifier tints — fill the actual territory shape */}
        {overlay &&
          defs.map((def) => {
            const tint = overlay.get(def.id);
            if (!tint) return null;
            return (
              <Path
                key={`view-${def.id}`}
                d={TERRITORY_PATHS[def.id]}
                fill={tint}
                fillOpacity={0.36}
                stroke={tint}
                strokeOpacity={0.8}
                strokeWidth={scaleBoard(1.4)}
              />
            );
          })}

        {/* Interactive shimmer on the board view (web shows it on hover; mobile marks tappable shapes) */}
        {viewMode === 'board' &&
          defs.map((def) => {
            if (!interactive.has(def.id) || targets.has(def.id) || selected === def.id) return null;
            return (
              <Path
                key={`int-${def.id}`}
                d={TERRITORY_PATHS[def.id]}
                fill="hsl(43, 88%, 55%)"
                fillOpacity={0.1}
                stroke="hsl(43, 88%, 40%)"
                strokeOpacity={0.5}
                strokeWidth={scaleBoard(1.2)}
              />
            );
          })}

        {/* Selection / target outlines on the traced territory borders */}
        {defs.map((def) => {
          const isSelected = selected === def.id;
          const isTarget = targets.has(def.id);
          if (!isSelected && !isTarget) return null;
          return (
            <Path
              key={`ring-${def.id}`}
              d={TERRITORY_PATHS[def.id]}
              fill={isSelected ? 'hsla(43, 88%, 50%, 0.14)' : 'hsla(0, 70%, 45%, 0.12)'}
              stroke={isSelected ? 'hsl(43, 88%, 40%)' : '#b3262a'}
              strokeWidth={scaleBoard(2.5)}
              strokeDasharray={isTarget ? '6 8' : undefined}
            />
          );
        })}

        {/* Pending occupy: mark the march route while the overlay is up */}
        {game.pendingOccupy && (
          <>
            <Path
              d={TERRITORY_PATHS[game.pendingOccupy.from] ?? ''}
              fill="none"
              stroke="hsl(43, 88%, 40%)"
              strokeWidth={scaleBoard(2)}
              strokeDasharray="6 4"
            />
            <Path
              d={TERRITORY_PATHS[game.pendingOccupy.to] ?? ''}
              fill="none"
              stroke="hsl(43, 88%, 40%)"
              strokeWidth={scaleBoard(2.5)}
            />
          </>
        )}

        {/* Unclaimed territory markers + piece shadows and plastic bases */}
        {defs.map((def) => {
          const territory = game.territories[def.id];
          const cx = def.x * W;
          const cy = def.y * H;
          if (territory.owner < 0) {
            const isInteractive = interactive.has(def.id);
            return (
              <G key={`node-${def.id}`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={scaleBoard(11)}
                  fill="hsla(46, 55%, 88%, 0.55)"
                  stroke={isInteractive ? 'hsl(43, 88%, 40%)' : INK}
                  strokeWidth={isInteractive ? scaleBoard(2) : scaleBoard(1.2)}
                  strokeDasharray="3 3"
                />
              </G>
            );
          }
          const owner = game.players[territory.owner];
          const color = owner?.color ?? '#666666';
          return (
            <G key={`node-${def.id}`}>
              <Ellipse
                cx={cx + scaleBoard(1)}
                cy={cy + PIECE_SHADOW_OFFSET_Y}
                rx={scaleBoard(14.5)}
                ry={scaleBoard(4.5)}
                fill="#2e2010"
                opacity={0.25}
              />
              {/* Plastic base the piece stands on */}
              <Ellipse
                cx={cx}
                cy={cy + PIECE_BASE_OFFSET_Y}
                rx={scaleBoard(13)}
                ry={scaleBoard(4.2)}
                fill={color}
                stroke="#3a2812"
                strokeWidth={scaleBoard(1.2)}
              />
            </G>
          );
        })}
      </Svg>

      {/* Ocean lettering */}
      <OceanLabel x={scaleBoard(75)} y={scaleBoard(392)} lines={['Pacific', 'Ocean']} size={scaleBoard(14)} />
      <OceanLabel x={scaleBoard(352)} y={scaleBoard(230)} lines={['Atlantic', 'Ocean']} size={scaleBoard(12)} />
      <OceanLabel x={scaleBoard(655)} y={scaleBoard(455)} lines={['Indian', 'Ocean']} size={scaleBoard(14)} />

      {/* Figures — native RNImages tinted per player */}
      {defs.map((def) => {
        const territory = game.territories[def.id];
        if (territory.owner < 0) return null;
        const owner = game.players[territory.owner];
        return (
          <MapPiece
            key={`piece-${def.id}`}
            type={dominantPiece(territory.armies)}
            color={owner?.color ?? '#666666'}
            cx={def.x * W}
            baseY={def.y * H + PIECE_SPRITE_BASE_OFFSET_Y}
            scale={BOARD_SCALE}
          />
        );
      })}

      {/* Over layer: capital stars, roundels, name labels — native Text
          (react-native-svg text is unreliable on web, so labels are RN) */}
      {defs.map((def) => {
        const territory = game.territories[def.id];
        const cx = def.x * W;
        const cy = def.y * H;
        if (territory.owner < 0) {
          return (
            <View key={`label-${def.id}`} pointerEvents="none" style={[styles.nameWrap, { left: cx - 100, top: cy + scaleBoard(17) }]}>
              <Text style={styles.nameLabel}>{def.name}</Text>
            </View>
          );
        }
        const dim = !(interactive.has(def.id) || targets.has(def.id));
        return (
          <View key={`label-${def.id}`} pointerEvents="none" style={dim && styles.dimmed}>
            {capitals.has(def.id) && (
              <Text
                style={[
                  styles.capitalStar,
                  { left: cx - scaleBoard(15) - 20, top: cy - scaleBoard(12) - scaleBoard(11) },
                ]}
              >
                ★
              </Text>
            )}
            {/* Muster-count roundel */}
            <View
              style={[
                styles.roundel,
                {
                  left: cx + ARMY_ROUNDEL_OFFSET_X - scaleBoard(8),
                  top: cy + ARMY_ROUNDEL_OFFSET_Y - scaleBoard(8),
                },
              ]}
            >
              <Text style={[styles.roundelText, territory.armies > 99 && { fontSize: scaleBoard(8) }]}>
                {territory.armies}
              </Text>
            </View>
            <View style={[styles.nameWrap, { left: cx - 100, top: cy + scaleBoard(23) }]}>
              <Text style={styles.nameLabel}>{def.name}</Text>
            </View>
          </View>
        );
      })}

      {/* Transient attack-order arrows — board space, over the figures */}
      <BattleArrowLayer game={game} w={W} h={H} />

      {/* Double map frame */}
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={styles.svg} pointerEvents="none">
        <Rect
          x={scaleBoard(1.5)}
          y={scaleBoard(1.5)}
          width={W - scaleBoard(3)}
          height={H - scaleBoard(3)}
          fill="none"
          stroke="#7a5a2e"
          strokeWidth={scaleBoard(3)}
        />
        <Rect
          x={scaleBoard(7)}
          y={scaleBoard(7)}
          width={W - scaleBoard(14)}
          height={H - scaleBoard(14)}
          fill="none"
          stroke="#7a5a2e"
          strokeOpacity={0.6}
          strokeWidth={scaleBoard(1)}
        />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  board: { position: 'absolute', width: W, height: H },
  svg: { position: 'absolute', left: 0, top: 0, backgroundColor: 'transparent' },
  dimmed: { opacity: 0.94 },
  oceanWrap: { position: 'absolute', width: 400, alignItems: 'center' },
  oceanText: {
    color: '#8a6a3c',
    opacity: 0.8,
    fontFamily: Fonts.display,
    textAlign: 'center',
    marginBottom: scaleBoard(4),
  },
  capitalStar: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: scaleBoard(13),
    lineHeight: scaleBoard(15),
    color: '#7a5a10',
    textShadowColor: 'hsla(46, 60%, 90%, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  roundel: {
    position: 'absolute',
    width: scaleBoard(16),
    height: scaleBoard(16),
    borderRadius: scaleBoard(8),
    backgroundColor: 'hsl(46, 62%, 90%)',
    borderWidth: scaleBoard(1),
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundelText: {
    color: INK_DARK,
    fontFamily: Fonts.bodyBold,
    fontSize: scaleBoard(10),
    lineHeight: scaleBoard(13),
    textAlign: 'center',
  },
  nameWrap: { position: 'absolute', width: 200, alignItems: 'center' },
  nameLabel: {
    color: INK_DARK,
    fontFamily: Fonts.map,
    fontSize: scaleBoard(10),
    lineHeight: scaleBoard(13),
    textAlign: 'center',
    textShadowColor: 'hsla(46, 60%, 88%, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});

// ─── Continent legend (screen-space) ─────────────────────────────────────────

/**
 * Continent bonus legend — rendered by the game screen's floating chrome, not
 * on the board itself. Pinned to board space it was sliced off by any camera
 * pan or portrait framing.
 */
export function ContinentLegend() {
  return (
    <View style={legendStyles.wrap} pointerEvents="none">
      {(Object.keys(CONTINENTS) as ContinentId[]).map((id) => (
        <View key={id} style={legendStyles.item}>
          <View style={[legendStyles.dot, { backgroundColor: CONTINENTS[id].color }]} />
          <Text style={legendStyles.text}>
            {CONTINENTS[id].name} +{CONTINENTS[id].bonus}
          </Text>
        </View>
      ))}
    </View>
  );
}

const legendStyles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(21,13,9,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(222,190,115,0.35)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 3,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(222,190,115,0.6)',
  },
  text: {
    color: 'rgba(238,220,180,0.92)',
    fontFamily: Fonts.map,
    fontSize: 9.5,
  },
});
