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
- Bucket (id in `DEFAULT_OBJECT_STORAGE_BUCKET_ID`; never print it) reconciled to exact web parity: 117 objects under `<public-search-path>/public/risk/...` — 21 sfx mp3, 12 dice png, 21 fireworks png, 48 battle-views webp, 11 art png (board, sea parchment, compass, ship, serpent, wood table, crest, laurel, hero, 3 piece sprites), world-map.png.
- Public asset helper: `artifacts/mobile/lib/assetUrl.ts`; base URL precedence `extra.apiBaseUrl` → `EXPO_PUBLIC_API_BASE_URL` → `EXPO_PUBLIC_DOMAIN` (https prepended). No `__DEV__` gating — same code path in dev and prod builds.
- API server route: `GET /api/storage/public-objects/*filePath` (public, no auth). `artifacts/mobile/lib/art.ts` centralizes art URLs (`ART`, `PIECE_ART`).

**ACL pitfall:** objects uploaded via the storage pane have no ACL metadata, so the SDK's `downloadObject` rejected them even on the public route. Fix: `downloadObject` accepts `{ assumePublic: true }`, which the public route passes *after* resolving the object inside the public search paths (so it stays safe). Any new public-serving route must do the same.

## Sound system
`artifacts/mobile/lib/sfx.ts` — **expo-audio** engine (migrated from deprecated expo-av, Jul 2026), 21 samples.
- `playSfx(name, { volume?, throttleMs?, maxMs? })` returns a **synchronous** stop handle (fade-out ~320ms). Never make it return a Promise — BattleView cleanup pushes handles into a ref synchronously.
- Design: one warm pooled `AudioPlayer` per sample (`preloadSfx`) + transient players for overlap; mute persisted to AsyncStorage key `risk2.sound` ("off"/"on"); `useSfxMuted` via useSyncExternalStore; audio mode `playsInSilentMode: true`.
- **expo-audio simplifications vs expo-av:** `createAudioPlayer` is synchronous and `volume`/`muted` are sync properties, so the old async-load mute race and preload in-flight map are gone. Pooled players are rewound (`pause()` + `seekTo(0)`) at `finish()` time so replay just calls `play()`. `seekTo` takes **seconds**, not ms. Transient players must be `remove()`d on finish or they leak native objects; treat `!isLoaded && playbackState === "error"` status as terminal cleanup.
- `hooks/useGameSounds.ts` ports the web sound director: `playActionSound(action)` for UI cues (wrap the reducer dispatch; AI orders use rawDispatch to skip cues) + state-transition effects for battle/fanfare/trumpet/chime.

## Components added / updated
- `components/game/RiskDie.tsx` — authentic RISK II die sprites from object storage, tier tinting via `tintColor`
- `components/game/BattleView.tsx` — cinematic battle overlay (Modal); watches `game.lastBattle`, fires for human battles only. Press-to-roll → dice + SFX + auto-dismiss (3.2s).
- `components/game/Fireworks.tsx` — 21-frame sprite animation, 5 staggered bursts, loops. Added to `VictoryOverlay` when `playerWon`.
- `components/game/BattleReport.tsx` — inline card; uses `RiskDie` for dice.
- `components/game/GameMap.tsx` — complete rewrite with pan/pinch camera + view modes (see below).

## Map stack architecture (mirrors web WorldMap/MapViewport/PieceSprite split)

- `GameMap.tsx` is a thin composition: `MapViewport` (camera rig) wrapping `WorldBoard` (full 1536×1024 board render). `PieceSprite.tsx` holds `MAP_PIECE_BOX` + `MapPiece`/`PieceIcon`.
- **Camera:** `game/camera.ts` is byte-identical to web. MapViewport keeps current+target `{cx,cy,vw}` in reanimated shared values; a `useFrameCallback` glides with the web ease `k = 1 − e^(−7.5·dt)`. Auto mode follows `cameraForAttention(computeAttention(game, selected))`; drag(>7px)/pinch switch to manual; `autoKey` (phase|player|occupy|handoff) re-engages auto; double-tap zooms 2.4× or re-engages auto when deep; control cluster = Auto / ±1.45× / Full.
- Board transform: `translateX = (viewW − MAP_W)/2 + s·(MAP_W/2 − cx)` (same for Y), `s = viewW/vw`. Viewport measures itself with onLayout (works full-bleed under floating chrome).
- **Tap detection:** point-in-polygon against `TERRITORY_PATHS` (subpaths split on 'M', even-odd test, bbox pre-reject) with nearest-centre fallback (~30 board-scale units) for taps on figures overhanging small shapes. Single/double tap via `Gesture.Exclusive(doubleTap, singleTap)`.
- **Piece tinting:** white-plastic sprite RNImage + same sprite with `tintColor` **prop** (not style — style.tintColor is deprecated on web) at 0.55 opacity ≈ web's feColorMatrix channel multiply.

**SVG text is broken on react-native-svg web:** `Text` from react-native-svg renders invisibly/mispositioned in Expo web (shapes in the same Svg render fine). All board text — roundel counts, territory names, ocean lettering, legend, capital ★ — must be native RN `<Text>`/`<View>` absolutely positioned in board coordinates over the Svg layers. Keep it that way; don't move labels back into Svg.

**Dev preview trick:** `/game?autostart=1` auto-starts a 4-player demo campaign (gated on `__DEV__`) so the game screen can be screenshotted without manual setup. The screen is split into a guard wrapper + `CampaignScreen` because conditional early-returns before hooks crash once the game appears mid-mount.

## Map view modes
`MapViewMode = 'board' | 'ownership' | 'threats' | 'strength' | 'empire'`
- `board` — player colours + interactive highlights
- `ownership` — player colours, no highlights
- `threats` — heat map from `borderThreat()`, blue→red
- `strength` — heat map from per-territory army count
- `empire` — human player's largest connected empire in gold; others dimmed
- Cycle button in top-right of game screen; heat data computed in `useMemo` only when mode changes.

## Persistence (SQLite, web-parity)
- `db/` mirrors web `web/src/db/repository.ts`: `types.ts` (records + 12 seeded high scores), `repository.native.ts` (expo-sqlite, `worlddomination.db`), `repository.ts` (AsyncStorage-JSON fallback with identical API — used by Expo **web** preview because expo-sqlite's OPFS backend can't run behind the proxied iframe), `migrate.ts` (one-time legacy AsyncStorage import; marker key `worlddomination.dbMigrated`; legacy keys preserved).
- **Keep both repository files' exports in lockstep** — Metro picks `.native.ts` on iOS/Android, tsc/web use `repository.ts`.
- GameContext: debounced autosave (400ms) via `saveCampaignState`, but on `phase === 'gameOver'` it instead calls `recordCompletedCampaign` once (ref-guarded) — that archives the campaign, bumps `commander_stats`, and deletes the save slot. Don't autosave a gameOver state or the slot resurrects.
- Tournament table extends web schema with `records_json` + `score_submitted` (mobile keeps per-game records; web doesn't). High score submitted once per run: on elimination/completion in `recordResult`, or on resign in `endTournament` (games completed = records.length, minus the elimination game).
- Records screen (`app/records.tsx`) = Hall of Records (ledger stats, top-10 commanders, campaign archive); the 12-slot high-score ledger lives on the tournament screen (web parity). Both refresh via `useFocusEffect`.

## Tournament system
- `context/TournamentContext.tsx` — `TournamentSession` persisted via `db/repository`. Tracks `humanName`, `currentGame` (0-based index), `totalPoints`, `records[]`, `scoreSubmitted`.
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

## Fonts & theme (web parity)
- Fonts via @expo-google-fonts: Alegreya (body, 400–800 + italics), IM Fell English (map/taglines, + italic), IM Fell English SC (display). Tokens in `constants/typography.ts` (`Fonts`, `trackingImperial(fontSize)` = 0.22em, `TextShadows`). Inter was fully removed — don't reintroduce it.
- Palette in `constants/colors.ts` re-valued to the web build: walnut bg #251a13, parchment text #ede0c0, gold #debe73, parchment sea #e7d8b1, ink stroke #362516, plus parchment scale / ink / gold / crimson ramps. Legacy key names kept so existing components didn't need edits.

## Expo Go native-module crash after dependency/config changes
`ViewManagerAdapter_ExpoXxx ... must be a function (received undefined)` on device (e.g. for `expo-linear-gradient`) after unrelated JS changes is usually a stale Metro/Expo bundler cache, not a real linking bug. Fix: stop the workflow, `rm -rf .expo node_modules/.cache` in `artifacts/mobile`, restart. Confirmed fix on iPhone/Expo Go, Jul 2026.

## Outstanding gaps
1. Premium/paywall (RevenueCat) — **user cancelled this work; do not reintroduce it.**
2. expo-audio battle sound engine (`lib/sfx.ts`) verified on physical iPhone and Android devices (Jul 2026) — mute, overlapping SFX, ambience fade-out, and repeated-battle stability all confirmed on both platforms.
