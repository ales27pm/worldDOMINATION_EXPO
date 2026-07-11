---
name: Same Time RISK mode architecture
description: Design decisions behind the simultaneous-turn RISK variant in the World Domination mobile app — read before touching game/sameTime.ts, the ST_* reducer cases, or the sameTime* phases in game.tsx/GamePanel.tsx.
---

## Core structure
Same Time RISK runs three sub-phases per round (`sameTimeReinforce` → `sameTimeBattle` → `sameTimeMove`), each collected via a per-player `ready` flag array before the round resolves for everyone at once. `currentPlayer` is repurposed as a rotating "whose turn to act/focus" pointer within a sub-phase (not a real turn owner) — it just walks to the next not-ready alive player, mirroring the existing election-focus pattern already in the engine. This let the sub-phases reuse the existing handoff/focus machinery instead of inventing a new one.

**Why:** keeping one `currentPlayer` pointer semantic (even though its meaning shifts per phase) avoided a second parallel "whose UI is active" concept throughout the app's components (GamePanel, TopBar, handoff overlay all already key off `currentPlayer`).

## Battle resolution
Invasions, mass-invasions, and spoils-of-war are all specific cases of one general resolver: N attacking columns vs. one defender, survivors (if defender falls and multiple attacker columns remain) fight each other for the spoils. A from-scratch native SwiftUI reimplementation of RISK found on GitHub (`ales27pm/worldDOMINATION`, unrelated codebase, discovered Jul 2026) independently arrived at the same collapsed design (its `SameTimeEngine.resolveBattle` + `resolveSpoilsOfWar`), which is a good sign this collapsing is the natural shape of the problem, not an oversimplification.

## Playback gating
The battle-report playback modal after `sameTimeBattle` resolves is dispatched via `ST_ACK_PLAYBACK`, and normally requires a human tap. But if no alive player `isHuman` (spectator/full-AI match, or the only human was just eliminated), the AI-loop `useEffect` in `game.tsx` auto-dispatches `ST_ACK_PLAYBACK` on a timer instead of waiting forever for a tap that will never come.

**Why:** without this branch, a full-AI Same Time game (or one where the human dies mid-game but AI keeps playing) would hard-stall on the first battle report of every round.

**How to apply:** any new phase that gates progress behind a human-only action needs the same "is anyone still human and alive" escape hatch, or it will deadlock in AI-only games.

## Simultaneous elimination must be resolved order-independently
A round can eliminate several players at once (A takes B's last territory while C simultaneously takes A's). Determine the eliminated set from the *final* resolved board first, then resolve kill-credit and card-inheritance as a second pass over that fixed set — never mark players dead and hand off cards while iterating player-by-player, since which player you process first would then change the outcome. When a card recipient (the direct killer) was themselves eliminated the same round, cards must cascade to *their* killer, not sit orphaned on a dead player.

**Why:** this exact bug shipped once — cards silently vanished onto an already-dead player whenever a same-round elimination chain was 2+ deep. It only shows up with 3+ players and simultaneous resolution, so it's easy to miss in a quick playtest.

**How to apply:** any future simultaneous/batch-resolution feature (not just RISK) that can produce chained eliminations/transfers in one tick needs this same "compute the final state, then resolve attribution over it" shape, not a live per-item mutation loop.
