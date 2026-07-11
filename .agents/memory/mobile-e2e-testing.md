---
name: Mobile board e2e testing
description: How to drive and verify the World Domination board with the Playwright tester (camera glide, tap targets, battle-scene capture)
---

- The map camera re-frames with a ~1.5s glide after EVERY tap and phase change. Tester clicks computed from a stale screenshot land on ocean.
  **Why:** three tester rounds failed as "attack not dispatched" (July 2026) before the glide was diagnosed.
  **How to apply:** instruct the tester: after any tap, wait 2s, take a FRESH screenshot, and compute the next click only from that frame.
- The whole board is pointerEvents="none"; taps are position hit-tests (territory polygons + ~30-unit fallback radius around piece anchors). Badges/pieces are decoration — clicks "on the badge" only work via pass-through, so any settled-camera position inside the territory works.
- Battle-scene capture: the modal mounts instantly on a valid attack and always contains the text "assaults". Reliable probe: click enemy → immediately waitFor text "assaults" (6s timeout), never blind screenshots. For the ROLLED state (dice in trays), waitFor "TAP TO CONTINUE" — it appears the same frame the dice land — then screenshot immediately without tapping (any tap dismisses).
- A scene that auto-dismissed proves the full lifecycle ran (the dismiss timer only starts inside the roll phase), so a vanished scene means dice rendered even if never photographed. Don't let the tester's "modal bug" claims override this signal — demand the LAST BATTLE card as dispatch evidence.
- Transient auto-hiding UI (elements that linger ~5-7s) cannot be judged by tester screenshots alone — tester roundtrips (poll + capture + upload) routinely exceed the linger, producing false "element missing" verdicts. **Why:** three July 2026 rounds reported the battle recap card missing when two were pure capture latency. **How to apply:** for transients, add temporary `__DEV__` console probes (render/effect/timer logs), have the tester quote every probe line VERBATIM in order, and demand a screenshot taken the instant the trigger clears; judge from the probe timeline, not frame presence. Remove probes after.
- Always view the tester's evidence screenshots yourself before accepting a failure verdict. **Why:** a July 2026 run returned "failure — rolled dice trays never captured" while its own screenshot showed the complete rolled state (dice, losses, ribbon); the tester misread its evidence. **How to apply:** on any visual-assertion failure, `viewImage` the cited frames first; only iterate on the app if the pixels actually show the problem.
