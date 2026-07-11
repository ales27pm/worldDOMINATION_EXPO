import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { TERRITORY_MAP } from '@/game/mapData';
import { shouldShowBattleScene, useBattleSceneMode } from '@/lib/battleScenes';
import type { GameState, TerritoryId } from '@/game/types';

interface Shown {
  from: TerritoryId;
  to: TerritoryId;
  color: string;
}

interface Props {
  game: GameState;
  /** Board pixel size — passed in to avoid a circular import with WorldBoard. */
  w: number;
  h: number;
}

/**
 * Transient on-map attack arrow — the original RISK II draws every battle as
 * an order arrow on the board itself; only select assaults cut to the
 * cinematic. Keyed off `battlesFought` (monotonic counter — state objects are
 * deep-cloned every dispatch, so identity is useless), coloured per attacker,
 * faded out after a short hold.
 */
export function BattleArrowLayer({ game, w, h }: Props) {
  const stamp = game.battlesFought;
  const sceneMode = useBattleSceneMode();
  const opacity = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<Shown | null>(null);
  const lastStamp = useRef(stamp);

  useEffect(() => {
    const report = game.lastBattle;
    if (stamp === lastStamp.current || !report) {
      lastStamp.current = stamp;
      return;
    }
    lastStamp.current = stamp;
    // Battles that earn the cinematic are narrated there — an arrow on top
    // would double the theatre. The arrow covers everything else (AI
    // skirmishes, and all battles when scenes are off).
    if (shouldShowBattleScene(game, report, sceneMode)) return;
    setShown({
      from: report.from,
      to: report.to,
      color: game.players[report.attacker]?.color ?? '#8f1d12',
    });
    opacity.setValue(1);
    const anim = Animated.timing(opacity, {
      toValue: 0,
      duration: 900,
      delay: 500,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setShown(null);
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  if (!shown) return null;
  const from = TERRITORY_MAP[shown.from];
  const to = TERRITORY_MAP[shown.to];
  if (!from || !to) return null;

  const s = w / 1000; // board-unit scale — matches WorldBoard's scaleBoard
  const x1 = from.x * w;
  const y1 = from.y * h;
  const x2 = to.x * w;
  const y2 = to.y * h;

  // Split the order across the map edge when the short path wraps
  // (Alaska ↔ Kamchatka) — same convention as the sea routes.
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  if (Math.abs(x2 - x1) > w / 2) {
    const leftward = x1 < x2; // exits the left edge, re-enters on the right
    const exitX = leftward ? 0 : w;
    const entryX = leftward ? w : 0;
    const d1 = leftward ? x1 : w - x1;
    const d2 = leftward ? w - x2 : x2;
    const t = d1 / Math.max(1, d1 + d2);
    const yi = y1 + (y2 - y1) * t;
    segs.push({ x1, y1, x2: exitX, y2: yi });
    segs.push({ x1: entryX, y1: yi, x2, y2 });
  } else {
    segs.push({ x1, y1, x2, y2 });
  }

  // Trim the shaft away from both territory roundels and fit the head.
  const first = segs[0];
  const last = segs[segs.length - 1];
  const dx0 = first.x2 - first.x1;
  const dy0 = first.y2 - first.y1;
  const len0 = Math.max(1, Math.hypot(dx0, dy0));
  const startX = first.x1 + (dx0 / len0) * Math.min(16 * s, len0 * 0.3);
  const startY = first.y1 + (dy0 / len0) * Math.min(16 * s, len0 * 0.3);
  first.x1 = startX;
  first.y1 = startY;

  const ldx = last.x2 - last.x1;
  const ldy = last.y2 - last.y1;
  const llen = Math.max(1, Math.hypot(ldx, ldy));
  const ux = ldx / llen;
  const uy = ldy / llen;
  const tipX = last.x2 - ux * 10 * s;
  const tipY = last.y2 - uy * 10 * s;
  const headLen = 26 * s;
  const baseX = tipX - ux * headLen;
  const baseY = tipY - uy * headLen;
  last.x2 = baseX + ux * 2 * s; // tuck the shaft just under the head
  last.y2 = baseY + uy * 2 * s;
  const px = -uy;
  const py = ux;
  const halfW = 11 * s;
  const head = `${tipX},${tipY} ${baseX + px * halfW},${baseY + py * halfW} ${baseX - px * halfW},${baseY - py * halfW}`;
  const EDGE = 'rgba(20, 8, 4, 0.6)';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
        {segs.map((sg, i) => (
          <Line
            key={`edge-${i}`}
            x1={sg.x1}
            y1={sg.y1}
            x2={sg.x2}
            y2={sg.y2}
            stroke={EDGE}
            strokeWidth={9.5 * s}
            strokeLinecap="round"
          />
        ))}
        <Polygon points={head} fill={EDGE} stroke={EDGE} strokeWidth={3.5 * s} strokeLinejoin="round" />
        {segs.map((sg, i) => (
          <Line
            key={`core-${i}`}
            x1={sg.x1}
            y1={sg.y1}
            x2={sg.x2}
            y2={sg.y2}
            stroke={shown.color}
            strokeWidth={6 * s}
            strokeLinecap="round"
          />
        ))}
        <Polygon points={head} fill={shown.color} />
        <Circle cx={startX} cy={startY} r={5.5 * s} fill={shown.color} stroke={EDGE} strokeWidth={1.5 * s} />
      </Svg>
    </Animated.View>
  );
}
