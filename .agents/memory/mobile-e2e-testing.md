---
name: Mobile board e2e testing
description: How to drive and verify the World Domination board with the Playwright tester (camera glide, tap targets, battle-scene capture)
---

- The map camera re-frames with a ~1.5s glide after EVERY tap and phase change. Tester clicks computed from a stale screenshot land on ocean.
  **Why:** three tester rounds failed as "attack not dispatched" (July 2026) before the glide was diagnosed.
  **How to apply:** instruct the tester: after any tap, wait 2s, take a FRESH screenshot, and compute the next click only from that frame.
- The whole board is pointerEvents="none"; taps are position hit-tests (territory polygons + ~30-unit fallback radius around piece anchors). Badges/pieces are decoration — clicks "on the badge" only work via pass-through, so any settled-camera position inside the territory works.
- Battle-scene capture: the modal mounts instantly on a valid attack and always contains the text "assaults". Reliable probe: click enemy → immediately waitFor text "assaults" (6s timeout), never blind screenshots. Dice render only after a pre-roll beat (700ms in FULL mode) then hold ~3s — screenshot on mount AND ~1s later.
- A scene that auto-dismissed proves the full lifecycle ran (the dismiss timer only starts inside the roll phase), so a vanished scene means dice rendered even if never photographed. Don't let the tester's "modal bug" claims override this signal — demand the LAST BATTLE card as dispatch evidence.
