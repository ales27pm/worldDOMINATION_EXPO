---
name: Risk II manual rule coverage
description: What the World Domination mobile game already implements vs. the official Risk II PC manual, verified by direct code read (not subagent summary).
---

## Verified fully implemented (matches manual exactly, checked line-by-line Jul 2026)
- Victory objectives: 60%/80% Domination (exact territory targets for 42 & 48-territory maps), 100% Domination, Capital RISK (2/3/4 required enemy capitals by player count, must hold own capital), Mission RISK (full 15-card classic mission deck: 8 destroy-color, 4 continent pairs, occupy-24 fallback, fortified-18).
- Territory allocation: Random deal (weighted toward border territories), Territory Grab, Elections (100 pts/territory, 10-pt neighbor influence, 50 pts/battalion leftover conversion) — all three wired into setup UI.
- Card trading: all 3 rule variants (Ascending 4/6/8/10/12/15+5, Ascending-by-one, Set Value 4/6/8/10) plus the +2 bonus armies when a traded card depicts a territory the trader occupies, and mandatory trade at 5+ cards.
- Classic dice: attacker up to 3 / defender up to 2, defender wins ties, AND the "minimum battalions moved in = dice used in the winning roll" rule (easy to miss — it's there).
- Continent bonuses match the Classic RISK table exactly.
- Fortify (tactical move) restricted to single-hop border/dotted-line neighbors, one move per turn — matches manual, not a "connected chain" variant.

## Same Time RISK — now implemented (Jul 2026)
The simultaneous-turn mode described below was built; see [Same Time RISK mode](same-time-risk-mode.md) for the architecture and decisions. Remaining gaps are tracked as project follow-up tasks (surge-target UI, phase banners, draw-win/elimination test coverage) rather than memory.

**Why this matters:** an explore subagent pass on this codebase once claimed missions and the card-territory bonus were "not implemented" — that was wrong/stale. Always verify rule-coverage claims by reading `engine.ts`/`cards.ts`/`missions.ts`/`dice.ts` directly before trusting a summary, especially on a codebase this mature.

## Second audit pass (Jul 2026) — dice, I-Com, Same Time missions
A full re-read of the manual against the code turned up real gaps beyond the first pass, now fixed:
- **Dice fidelity**: the 5th-tier die's face array summed to 53 instead of the manual's stated 54 (avg 4.5) — off by one face. Also, the manual explicitly names/colors this tier "Orange," but the code called it `"green"` with a green fill; renamed the `DiceTier` value and its color to orange throughout (`types.ts`, `dice.ts`, `RiskDie.tsx`).
- **Level II alliance pact was too strict**: it broke on *any* attack, same as Level III. The manual grants Level II one exception — a single attack into an "insignificant" (non-protected) territory doesn't break it; a second one, or an attack on a protected target, does. Implemented via a one-shot `insignificantAttackUsed` flag on the `Alliance` record.
- **I-Com (diplomacy) was Classic-only and AI-initiated-only**: `PROPOSE_ALLIANCE`/`SEND_THREAT` reducer cases and the AI's proposal logic were gated to `phase === "reinforcement"` only, so Same Time RISK had zero diplomacy despite the manual describing it for both modes. Also, the human player had no UI to *initiate* a pact/threat — only to respond to AI-initiated ones. Both fixed: reducer + AI now also act during `sameTimeReinforce`, and `PlayerRoster` grew threat/pact buttons per opponent card when I-Com is open (reinforcement phase, exactly one human alive, no existing pact).
- **Same Time Mission RISK reused the Classic mission deck** — the manual specifies a distinct, harder Same Time deck (continent+presence-in-all-others, continent+8-elsewhere, continent+3-named-territories, etc.) and states Same Time missions can't be claimed before Game Round 3. Built a separate `buildSameTimeDeck()` in `missions.ts` and gated mission victory on `state.turn >= 3` when `turnStyle === "sameTime"`. Not modeled: the manual's Mission 2 dynamic-retarget-by-territory-ownership nuance — deliberately simplified out (padded deck with extra "destroy" instances instead) as not worth the complexity.

**Why this matters:** even a codebase that passed one full audit can have real gaps — re-reading manual chapters that "sound" already covered (dice, alliances, missions) surfaced concrete numeric and structural bugs. Don't assume a prior clean audit means a second pass is redundant.
