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

## Components added (this session)
- `components/game/RiskDie.tsx` — authentic RISK II die sprites from object storage, tier tinting via `tintColor`
- `components/game/BattleView.tsx` — cinematic battle overlay (Modal); watches `game.lastBattle`, fires for human battles only. Press-to-roll → dice + SFX + auto-dismiss (3.2s).
- `components/game/Fireworks.tsx` — 21-frame sprite animation, 5 staggered bursts, loops. Added to `VictoryOverlay` when `playerWon`.
- `components/game/BattleReport.tsx` — inline card; updated to use `RiskDie` instead of colored boxes.

## textShadow style API
React Native uses `textShadow: "0px 2px 6px rgba(0,0,0,0.9)"` (string shorthand). The old `textShadowColor`/`textShadowOffset`/`textShadowRadius` props are deprecated and generate warnings.

## State shape (engine.ts as of Jul 2026)
`GameState` now includes:
- `history: TurnSnapshot[]` — per-turn territory/troop census (max 300), initialized to `[]`
- `battlesFought: number`
- `winReason: string | null`
- `winner: number | null`
`normalizeState()` handles backward-compat for saves missing `history`.

## Outstanding gaps (not yet ported)
1. Map view modes (board/ownership/threats/strength/empire heat-map) — web `WorldMap.tsx`
2. Camera/pan-pinch-zoom — web `MapViewport.tsx`; mobile still uses ScrollView
3. Tournament screen UI — logic exists (`tournament.ts`), no mobile screen yet
4. Premium/paywall — RevenueCat mobile SDK (`react-native-purchases`) not integrated
5. SQLite persistence — web uses sql.js+IndexedDB; mobile still on AsyncStorage
