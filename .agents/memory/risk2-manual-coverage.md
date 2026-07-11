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

## Not implemented — the one real gap
"Same Time RISK" — an entirely different simultaneous-turn mode (all players submit orders each round, then a 5-tier priority resolution: border clashes → mass invasions → invasions → spoils of war → surge attacks). Requires:
- Different reinforcement formula and continent bonus table (Same Time uses 4/4/5/6/6/8, not the Classic 2/2/3/5/5/7).
- A 12-sided "tiered dice" system (5 colors: white/yellow/orange/red/black, keyed to army-size brackets).

**The tiered-D12 dice tables ARE already built** in `game/dice.ts` (`DICE_FACES`, `tierForAttacker`/`tierForDefender`) and their face-value distributions match the manual's tables exactly face-for-face — just under the name "green" instead of "orange" for the third tier, and currently unused by the live battle resolver (`resolveBattleRound` uses simple classic D6 logic). This looks like intentional groundwork for Same Time RISK that was never finished with the simultaneous-turn engine/UI around it.

**Why this matters:** an explore subagent pass on this codebase claimed missions and the card-territory bonus were "not implemented" — that was wrong/stale. Always verify rule-coverage claims by reading `engine.ts`/`cards.ts`/`missions.ts`/`dice.ts` directly before trusting a summary, especially on a codebase this mature.

**How to apply:** if asked to "finish" or "add" Same Time RISK, treat it as a large new game mode (new phase model, order-submission UI, priority resolver) — not a small patch — and confirm scope with the user before building.
