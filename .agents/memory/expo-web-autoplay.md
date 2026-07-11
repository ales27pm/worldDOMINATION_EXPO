---
name: Web autoplay policy & expo-audio
description: Expo web crashes with uncaught NotAllowedError when audio plays before a user gesture; how the sfx engine gates playback.
---

**Rule: On web, never call `play()` (directly or via expo-audio) before the first user gesture.**
**Why:** Browser autoplay policy rejects pre-gesture playback with `NotAllowedError`. expo-audio (≤1.1.1) does not catch the internal HTMLMediaElement `play()` promise, so the rejection surfaces as an *uncaught* error — on Expo web dev this crashes into the red error overlay (seen as repeated `AudioPlayerWeb#_createMediaElement` dumps when React mount effects fired battle sounds). A try/catch around the `play()` call cannot catch it — the rejection is async inside the library.
**How to apply:** The sfx engine (`artifacts/mobile/lib/sfx.ts`) keeps an `unlocked` flag, false on web until a capture-phase `pointerdown`/`keydown` fires; pre-gesture cues are dropped, never queued (replaying stale battle sounds after unlock is worse than silence). A tightly-scoped `unhandledrejection` handler additionally swallows DOMException `NotAllowedError` plus media-flavored `AbortError` only — suppressing generic AbortError app-wide masks real errors (architect flag). Creating/preloading players pre-gesture is fine: policy blocks playback, not loading. Native is unaffected (`unlocked` starts true off-web).
