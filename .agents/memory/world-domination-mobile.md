---
name: World Domination mobile port
description: Architecture decisions for the Risk-like game ported to React Native Expo at artifacts/mobile
---

## Structure

- `game/` — pure TypeScript game logic (engine, ai, types, mapData, mapShapes, etc.) — no React deps
- `context/GameContext.tsx` — React state via useReducer wrapping gameReducer, AsyncStorage auto-save
- `app/` — expo-router Stack screens: index, setup, game, records (tabs/ is dead, redirects to /)
- `components/game/` — GameMap (SVG map), GamePanel (bottom HUD), GameOverlays (modals), etc.

## Key decisions

**Map rendering**: react-native-svg (v15.12.1) with all 48 territory SVG paths at 1536×1024 viewBox. Map fits to available height and is horizontally scrollable via ScrollView. Territory taps use SVG Path `onPress`.

**No @react-native-community/slider**: Not installed. OccupyOverlay uses a +/− stepper instead.

**Color scheme**: Dark Napoleonic military theme. `constants/colors.ts` exports named `Colors` (not default). The hook `useColors.ts` was rewritten to simply return Colors (old hook expected nested light/dark structure).

**AI loop**: `useEffect` + `setTimeout` in `app/game.tsx`. Fires when `!isHumanTurn && !awaitingHandoff && !pendingProposal`. Delay: 100ms for initial phases, 180ms for main game phases.

**DispatchLog**: Must pass `visible={logOpen}` — the `Modal` inside uses this prop. Early versions accidentally left modal always open (critical bug, now fixed).

**Adjacency validation**: `ATTACK` and `FORTIFY` in engine.ts both validate adjacency against TERRITORY_MAP[from].neighbors filtered by activeIds.

**Why**: Engine-level validation ensures rules integrity even if UI sends a bad dispatch.

**PLAYER_COLORS**: Array of 8 {hex, name} objects indexed by colorIdx. Used by engine to set player.color.

**Tabs directory**: `app/(tabs)/` files redirect to `/` — kept to avoid build errors but not used.

## Packages actually used from devDeps

- react-native-svg ~15.12.1 ✓
- @react-native-async-storage/async-storage 2.2.0 ✓
- expo-linear-gradient ~15.0.8 ✓
- react-native-gesture-handler ~2.28.0 (installed, not used in map — using ScrollView instead)
- react-native-reanimated ~4.1.1 (installed, not used yet)
- @expo-google-fonts/inter ^0.4.0 ✓
