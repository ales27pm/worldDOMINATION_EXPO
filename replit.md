# RiskConquest — World Domination

## Project Overview

**RiskConquest** is a native iOS strategy board game built with Swift and SwiftUI. It is a Risk-style game where players compete for world domination across a classic world map.

Because this is a native iOS app, it cannot run directly inside Replit's web preview. A Python web server (`main.py`) serves a project overview page on port 5000 for the Replit environment.

## Tech Stack

- **Language:** Swift 5
- **UI Framework:** SwiftUI
- **Platform:** iOS (iPhone & iPad)
- **Build Tool:** Xcode

## Project Layout

```
ios/
  RiskConquest/
    Models/          # Game data models (Player, Territory, Alliance, DiceSystem, etc.)
    ViewModels/      # GameViewModel, AIController, SameTimeEngine
    Views/           # SwiftUI views (MapView, GameView, HUDView, DiplomacyView, etc.)
    Services/        # GyroscopeService
    Assets.xcassets/ # App icon, world map images
    RiskConquestApp.swift   # App entry point
    ContentView.swift       # Root view
  WorldDomination.xcodeproj/ # Xcode project file
main.py              # Python web server for Replit environment (project overview page)
```

## Key Features

- Multiple game modes: Classic, Domination (60/80/100%), Capital Conquest, Mission
- AI opponents with strategic decision-making
- Diplomacy system (alliances, negotiations)
- Same-Time simultaneous action engine
- Generals with unique abilities
- Gyroscope-enhanced map interaction
- Risk card trading (ascending and fixed rules)
- Secret mission objectives

## Running Locally (iOS)

1. Open `ios/WorldDomination.xcodeproj` in Xcode on macOS
2. Select an iOS Simulator or connected device
3. Press Run (⌘R)

**Requirements:** Xcode 15+, iOS 17+, macOS Ventura or later

## Design Aesthetic — Napoleonic 1812 / Risk II (2000)

All UI aligns with a Napoleonic 1812 aesthetic inspired by Risk II (2000):

- **Palette:** `NapoleonicPalette` in `ConquestTheme.swift` is the single source of truth
  - `parchmentDeep/Dark/Mid/Surface/Light` — aged leather/parchment backgrounds
  - `goldBright/Mid/Dim` — imperial gold accents, borders, highlights
  - `crimson/crimsonDeep/crimsonBright` — action colors, attack indicators
  - `inkPrimary/Secondary/Muted/Faint` — text hierarchy
- **Typography:** `.imperialTitle()`, `.commandHeader()`, `.fieldBody()`, `.tacticalLabel()` — all via Font extensions
- **Components:**
  - `FieldPanelModifier` — corner-bracket framing (no rounded capsules)
  - `ImperialDivider` — ornamental divider with gold gradients
  - `SectionHeader` — roman numeral + uppercase letter-tracked title
  - `HexDieView` / `HexagonShape` — D12 hexagonal dice in color hierarchy
  - `MenuButton` / `PrimaryActionButton` — rectangular gold-bordered buttons
  - `HUDChip`, `DiceColorBadge`, `UtilityIconButton` — HUD components in ConquestTheme

## Screen Summary

| View | Period Label |
|------|-------------|
| `GameView` — menu | "Anno Domini MDCCCXII" heraldic hall |
| `GameSetupView` | "Orders of Battle" briefing |
| `HUDView` | Commander's desk — DEP/ENG/MAN/S.A.M.E. phases |
| `BattleResultView` | "Field Dispatch — Battle Report" with hex dice |
| `DiplomacyView` | "I-COM Diplomatic Corps" dispatch system |
| `PlayerListView` | "Field Commanders" roster |
| `AttackPlanView` | "Orders of Battle" scroll with Field Notes |
| `GeneralPickerView` | "General Dossiers" with threat pips |
| `MapView` | Aged cartographic palette, gold selection rings |

## Replit Environment

- The workflow runs `python3 main.py` on port 5000
- This serves a static project overview page
- Deployment target: autoscale