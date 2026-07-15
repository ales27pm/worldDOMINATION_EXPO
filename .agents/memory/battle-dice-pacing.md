---
name: Battle dice-turn pacing
description: The RISK battle modal (BattleView) is fully tap-driven, one dice exchange revealed per tap, with no automatic timers advancing or closing it.
---

- The battle modal never auto-advances or auto-dismisses. Every dice exchange ("dice turn") requires an explicit tap to reveal, and the final result (conquered/repelled ribbon) also requires a tap to dismiss.
  **Why:** the original design auto-rolled after a ~200-550ms beat and auto-closed after ~1.15-2.5s, resolving multi-round "All-Out Attack" battles almost instantly with only the last round's dice shown against an aggregate loss count — the user found this too fast to follow and asked to see and confirm each roll.
  **How to apply:** if changing battle pacing again, keep the interaction fully click-gated; don't reintroduce `setTimeout`-driven auto-roll/auto-dismiss. Scene-mode ("full"/"fast"/"off" in `lib/battleScenes.ts`) still controls sound-effect cadence and whether a scene shows at all, but no longer gates advancement timing.
- `BattleReport` (`game/types.ts`) gained an optional `roundResults: BattleRoundResult[]` — every individual dice exchange fought, in order. Classic RISK's `ATTACK` reducer (`game/engine.ts`) now populates it (one entry per iteration of its all-out do/while loop). Same Time battle reports and reports from older saves omit it; `BattleView` falls back to treating the aggregate fields as a single combined round for those, so they still render (just without per-round granularity).
- `BattleView` tracks a `revealed` count (0..rounds.length) instead of a `ready/rolled` phase; each tap either reveals the next round (dice + a sound beat) or, once all rounds are shown, dismisses. Roundel counts and standing troop sprites tick down cumulatively as rounds are revealed, not in one jump.
- The old `mobile-e2e-testing.md` heuristic "a scene that auto-dismissed proves the full lifecycle ran" no longer applies — there is no auto-dismiss to use as a signal. Testers must tap through explicitly and check on-screen state at each step instead.
