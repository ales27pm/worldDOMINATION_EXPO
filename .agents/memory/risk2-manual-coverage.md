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
