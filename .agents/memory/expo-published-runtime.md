---
name: Published Expo runtime module gaps
description: Replit's published mobile runtime registers fewer native view modules than dev Expo Go — some expo-* views crash only in the published app.
---

**Rule:** Do not rely on expo-* native *view* modules beyond what the app already proves works in the published runtime. `expo-linear-gradient` is confirmed broken there; render gradients with `react-native-svg` instead (see `components/GradientFill.tsx` in the mobile app — vertical/horizontal, locations, transparent-stop handling).

**Why:** The published iOS bundle (served from `code-react-native.replit.app`) runs in a Replit-hosted native shell, not Expo Go. That shell registers only a subset of native view managers. A screen using `expo-linear-gradient` crashed in production with:
`Invariant Violation: View config getter callback for component 'ViewManagerAdapter_ExpoLinearGradient_...' must be a function (received 'undefined')`
while the same code worked in dev (Expo Go ships every module) and on web (no native views). Dev/device testing via QR cannot catch this class of bug.

**How to apply:**
- Adding any new native view dependency to the mobile app → assume it may not exist in the published shell; prefer `react-native-svg`, `expo-image`, and core RN views, which are proven there.
- If a published app shows a themed error-boundary screen right after a publish that added a new expo view package, suspect this first; the stack trace's bundle URL (`code-react-native.replit.app`) confirms it's the published runtime.
- Non-view native modules proven working in the published shell: `expo-sqlite`, `expo-audio` (module functions, not view managers).
- Fixes only reach phones after the user republishes — the old published bundle keeps crashing regardless of local changes.

**Package.json note:** the Expo scaffold intentionally keeps core runtime libs (expo, react-native, react-native-svg, etc.) in `devDependencies`; the publish pipeline installs them. Don't "correct" this by moving individual libs to `dependencies`.
