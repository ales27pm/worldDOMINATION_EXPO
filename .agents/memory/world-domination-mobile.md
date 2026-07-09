---
name: World Domination mobile port
description: Complete Expo app at artifacts/mobile — all game logic ported, key architecture decisions recorded.
---

## Stack
- Expo ~54, expo-router ~6, react-native-svg, expo-linear-gradient, expo-av, expo-haptics
- @expo-google-fonts/cinzel, @expo-google-fonts/playfair-display
- Pure client-side; AsyncStorage (500ms debounce) save/load

## Navigation
Stack navigation only — expo-router Stack; all screens at root (index, setup, game, records).

## Fonts
Cinzel (headings/labels) + PlayfairDisplay (body/italic). Loaded in `app/_layout.tsx` via `useFonts`.

## Colors
Warm parchment/mahogany/brass-gold palette in `constants/colors.ts`.

## Sound & Haptics
- `hooks/useSound.ts` — expo-av, dynamic import, 7 named sounds (dice, cannon, conquest, card, tap, victory, deploy)
- `hooks/useHaptics.ts` — expo-haptics wrapper, no-ops on web
- Sound wired in `app/game.tsx` via territory tap handler, useEffect watching game.phase / game.lastBattle / cardsOpen

## Critical Architecture Decisions

### Rules of Hooks in game.tsx
`app/game.tsx` uses a wrapper + inner component pattern to avoid hooks-after-conditional-return.
- `GameScreen` (default export): thin wrapper, gets game from context, redirects if null, renders `GameScreenInner`
- `GameScreenInner`: receives `{ game, dispatch, abandonGame }` props; all hooks unconditional

**Why:** The game state can be null on initial mount before redirect fires, causing a conditional return mid-component that would violate Rules of Hooks for all hooks below it.

### GameRecord shape
`GameRecord` (from `context/GameContext.tsx`) only has: `id, date, playerName, won, turns, territories, totalPlayers, objective`. No `players` array, no `winner` id, no `completedAt`. `records.tsx` must use these fields only.

### PlayerSetup shape
`PlayerSetup` uses `colorIdx: number` (not `color: string`). Map to display color via `DEFAULT_COLORS[p.colorIdx]` in setup UI.

### Valid Objective values
`type Objective = "domination60" | "domination80" | "domination100" | "capital" | "mission"` — no `"worldDomination"` or `"capitals"`.

### Valid CardRule values
`type CardRule = "ascending" | "ascendingByOne" | "setValue"` — no `"fixed"`.
Setup maps: Escalating→ascending, Fixed Values→setValue.

### GameSetup field name
`useExtraTerritories: boolean` (not `extraTerritories`).

### ALLIANCE_LEVEL_INFO
`Record<AllianceLevel, { name: string }>` — no `description` field. ProposalOverlay must not access `.description`.

### RESPOND_PROPOSAL action
Field is `accept: boolean` (not `accepted: boolean`).

### LogEntry
`LogEntry` is `{ id, turn, text, tone }` — render `entry.text` not the object itself.

### BattleReport
`conquered: boolean` (not `winner`), `attacker: number` (not `attackerId`). Has no `id` field — use a ref counter nonce in parent for animation identity.

### Authentic RISK II GFX Assets
Extracted from 8 `.gfx` files. Bundled in `artifacts/mobile/assets/images/`:
- `world-map.png` — 1536×1024 RISK II world map
- `dice/red_1..6.png`, `white_1..6.png` — fallback dice sprites (used for missing App Storage faces)

### App Storage Assets (live, bucket replit-objstore-6751d8fb-0a63-427b-867d-c26722039490)
All accessed via `artifacts/mobile/lib/storage.ts` helper (`storageUrl(objectPath)`). Public URL format:
`https://replit.com/object-storage/storage/v1/b/{BUCKET_ID}/o/{encoded}?alt=media`
Contents:
- `public/risk/dice/red_1,4,5,6.png` + `gold_1..5.png` — attacker/defender dice
- `public/risk/fireworks/f00..f20.png` — 21-frame conquest fireworks animation
- `public/battle-views/{territoryId}.webp` — per-territory battle backgrounds (48 territories)
- `public/risk/sfx/*.mp3` — full sound library (dice_roll, cannon_a/b/c, clash_a/b/c, click, defeat, fanfare, roar, stab, thud, tick, trumpet, volley_long/short, whoosh, chime)

Missing from bucket: red_2.png, red_3.png → fall back to bundled red_2/3. gold_6.png → fall back to bundled white_6.

### DieFace Animation Nonce Pattern
Metro bundler requires static `require()` for all bundled image assets — no dynamic requires. DieFace animation must be keyed by a `nonce` prop (ref counter incremented in parent per battle). For network (App Storage) images use `{ uri: url }` as `ImageSourcePropType`. Both types mixed in same Record — valid at runtime.

### FireworksOverlay Pattern
Keyed by `nonce` (not a separate ref counter) when `conquered` is true — ensures remount on consecutive conquests. Must `clearInterval` inside the `RNAnimated.timing` callback (not only in cleanup) to stop frame ticks after fade-out completes while component stays mounted.

### useSound — App Storage Audio
All sounds now stream from App Storage URIs. `Audio.Sound.createAsync({ uri }, ...)` is valid in expo-av. No bundled audio files needed.

### ErrorBoundary
Named export: `import { ErrorBoundary } from '@/components/ErrorBoundary'` (not default).

### PlayerRoster
Expects `visible: boolean` and `onClose: () => void` — it wraps a Modal internally. Use as a modal directly, don't wrap in a custom overlay View.

### PlayerState
Types exports `PlayerState` not `Player`. Use `PlayerState` everywhere.

### abandonGame type
Context types `abandonGame: () => void` (even though impl is async). Props must match.
