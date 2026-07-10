---
name: World Domination mobile port
description: Architecture decisions, sync strategy, and feature status for the Expo mobile port of worldDOMINATION_2026.
---

## Location
`artifacts/mobile/` — Expo React Native app (registered artifact, slug `mobile`).

## Game logic files
All live in `artifacts/mobile/game/`. Always sync from the web repo when updating:
```
https://raw.githubusercontent.com/ales27pm/worldDOMINATION_2026/main/web/src/game/<file>
```
Files to sync (pure TS, no DOM deps): `types.ts`, `engine.ts`, `ai.ts`, `mapData.ts`, `mapShapes.ts`, `tournament.ts`, `camera.ts`, `analysis.ts`, `cards.ts`, `dice.ts`, `generals.ts`, `missions.ts`, `pieces.ts`.

**Why:** Web repo is the upstream source of truth; mobile port is a downstream consumer.

**`battleViews.ts` is the exception** — written by hand for mobile because the web version uses `new Image()` (DOM). Mobile version just exports `battleViewUrl(id)` using `assetUrl()`.

## Asset layer
- Object storage bucket: `replit-objstore-b0b71f05-e654-437f-8e5d-5a90d34315e0`
- Public asset helper: `artifacts/mobile/lib/assetUrl.ts` → `assetUrl(filePath)` → `${EXPO_PUBLIC_API_BASE_URL}/api/storage/public-objects/${filePath}`
- API server route: `GET /api/storage/public-objects/*filePath` (public, no auth)
- Assets in bucket: `public/battle-views/*.webp` (48 territories), `public/risk/fireworks/f00–f20.png`, `public/risk/sfx/*.mp3` (20 files), `public/risk/dice/red_1–6.png` + `gold_1–6.png`

## Sound system
`artifacts/mobile/lib/sfx.ts` — expo-av wrapper.
- `playSfx(name, { volume?, maxMs? }): Promise<() => void>`
- `playRandomSfx(names[], options): Promise<() => void>`
- **expo-av deprecation:** Will be removed in SDK 54; migrate to `expo-audio` when upgrading SDK. Non-blocking for now.

## Components added / updated
- `components/game/RiskDie.tsx` — authentic RISK II die sprites from object storage, tier tinting via `tintColor`
- `components/game/BattleView.tsx` — cinematic battle overlay (Modal); watches `game.lastBattle`, fires for human battles only. Press-to-roll → dice + SFX + auto-dismiss (3.2s).
- `components/game/Fireworks.tsx` — 21-frame sprite animation, 5 staggered bursts, loops. Added to `VictoryOverlay` when `playerWon`.
- `components/game/BattleReport.tsx` — inline card; uses `RiskDie` for dice.
- `components/game/GameMap.tsx` — complete rewrite with pan/pinch camera + view modes (see below).

## GameMap.tsx architecture (pan/pinch camera)

**Camera model:** maintains `(cx, cy)` — the SVG coordinate shown at the screen center — and `scale` (px per SVG unit).

**Animated transform math** (translateX/Y applied before scale in RN; scale pivots from element center):
```
translateX = (AVAIL_W - SHAPES_W)/2 + scale*(SHAPES_W/2 - cx)
translateY = (AVAIL_H - SHAPES_H)/2 + scale*(SHAPES_H/2 - cy)
```
- `AVAIL_W/H = SCREEN_W/H - HUD_TOP - HUD_BOTTOM` (96 + 90 px)
- `BASE_SCALE = AVAIL_H / SHAPES_H`, `MIN_SCALE = BASE_SCALE * 0.85`, `MAX_SCALE = BASE_SCALE * 5`

**Gestures** (RNGH v2):
- Pan (maxPointers=1): movements < 8px → tap, else camera pan. Uses `runOnJS(handleTap)`.
- Pinch (2-finger): focal-point zoom. Saves start-of-gesture cx/cy/scale to avoid drift during simultaneous pan+pinch.
- `Gesture.Simultaneous(pan, pinch)` — 1-finger and 2-finger don't conflict.

**Territory tap detection:** nearest-centre heuristic (threshold: 55 SVG units). Uses mutable refs for `activeIds` and `onTerritoryTap` so the worklet's `runOnJS` always calls the latest handler without recreating gestures.

**Why no SVG onPress:** GestureDetector + SVG onPress conflict; coordinate-based hit testing is more reliable.

## Map view modes
`MapViewMode = 'board' | 'ownership' | 'threats' | 'strength' | 'empire'`
- `board` — player colours + interactive highlights
- `ownership` — player colours, no highlights
- `threats` — heat map from `borderThreat()`, blue→red
- `strength` — heat map from per-territory army count
- `empire` — human player's largest connected empire in gold; others dimmed
- Cycle button in top-right of game screen; heat data computed in `useMemo` only when mode changes.

## Tournament system
- `context/TournamentContext.tsx` — `TournamentSession` persisted to AsyncStorage (`worlddomination.tournament`). Tracks `humanName`, `currentGame` (0-based index), `totalPoints`, `records[]`.
- `app/tournament.tsx` — full screen: pre-tournament name entry + game list + score bar + final rating (LIEUTENANT → EMPEROR).
- `sessionEnded()` — returns true if eliminated or all 16 games played.
- Flow: tournament screen → `buildTournamentSetup()` → `startGame()` → game → on gameOver, `tournamentResult()` → `recordResult()` → back to tournament screen.
- `game.tsx` detects tournament via `game.setup.tournamentGame !== undefined` and routes victory exit to `/tournament`.

## textShadow style API
React Native uses `textShadow: "0 0 12px #color"` (string shorthand, web-style). The old `textShadowColor`/`textShadowOffset`/`textShadowRadius` props are deprecated and generate warnings.

## State shape (engine.ts as of Jul 2026)
`GameState` now includes:
- `history: TurnSnapshot[]` — per-turn territory/troop census (max 300), initialized to `[]`
- `battlesFought: number`
- `winReason: string | null`
- `winner: number | null`
`normalizeState()` handles backward-compat for saves missing `history`.

## Outstanding gaps
1. SQLite persistence — web uses sql.js+IndexedDB; mobile still on AsyncStorage
2. Premium/paywall — RevenueCat mobile SDK (`react-native-purchases`) not integrated
