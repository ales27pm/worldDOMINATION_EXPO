import { useEffect, useRef } from "react";

import { playRandomSfx, playSfx, preloadSfx } from "@/lib/sfx";
import type { BattleReport, GameAction, GamePhase, GameState } from "@/game/types";

/** Samples worth having warm before the first shot is fired. */
const WARM_SET = [
  "dice_roll",
  "battle_din",
  "volley_long",
  "volley_short",
  "cannon_a",
  "clash_a",
  "thud",
  "tick",
  "click",
  "trumpet",
] as const;

/**
 * Plays a UI cue for a human-issued order. Battle audio is intentionally
 * absent here — it is driven by state (lastBattle) so AI engagements and
 * multi-round assaults sound right too.
 */
export function playActionSound(action: GameAction): void {
  switch (action.type) {
    case "CLAIM_TERRITORY":
    case "ELECTION_BID":
      playSfx("tick", { volume: 0.5, throttleMs: 120 });
      break;
    case "PLACE_INITIAL":
    case "DEPLOY":
      playSfx("thud", { volume: 0.38, throttleMs: 140 });
      break;
    case "CHOOSE_CAPITAL":
      playSfx("stab", { volume: 0.5 });
      break;
    case "TRADE_CARDS":
    case "AUTO_TRADE":
      playSfx("whoosh", { volume: 0.55 });
      break;
    case "OCCUPY":
    case "FORTIFY":
      playSfx("march", { volume: 0.38, maxMs: 2800 });
      break;
    case "PROPOSE_ALLIANCE":
      playSfx("chime", { volume: 0.5 });
      break;
    case "SEND_THREAT":
      playSfx("thud", { volume: 0.5 });
      break;
    case "RESPOND_PROPOSAL":
      playSfx(action.accept ? "chime" : "click", { volume: 0.5 });
      break;
    case "ELECTION_PASS":
    case "END_ATTACK":
    case "END_TURN":
    case "ACKNOWLEDGE_HANDOFF":
      playSfx("click", { volume: 0.45, throttleMs: 120 });
      break;
    case "ATTACK":
      // Handled by the battle report watcher / BattleView sequence.
      break;
  }
}

/**
 * State-transition sound director: watches the campaign state and plays the
 * original RISK II samples on battles, turn changes, proposals and the
 * end of the war. Battles that get the cinematic BattleView are skipped here —
 * the view runs its own, richer sequence.
 */
export function useGameSounds(game: GameState | null, battleViewsEnabled: boolean): void {
  const prevBattleRef = useRef<BattleReport | null>(game?.lastBattle ?? null);
  const prevPhaseRef = useRef<GamePhase | null>(game?.phase ?? null);
  const prevHandoffRef = useRef<boolean>(game?.awaitingHandoff ?? false);
  const prevProposalRef = useRef<GameState["pendingProposal"]>(game?.pendingProposal ?? null);
  const prevPlayerRef = useRef<number | null>(game?.currentPlayer ?? null);

  useEffect(() => {
    preloadSfx([...WARM_SET]);
  }, []);

  useEffect(() => {
    if (!game) return;

    // Battle reports — quick percussion for engagements without a cinematic.
    const battle = game.lastBattle;
    if (battle && battle !== prevBattleRef.current) {
      prevBattleRef.current = battle;
      const humanInvolved =
        Boolean(game.players[battle.attacker]?.isHuman) || Boolean(game.players[battle.defender]?.isHuman);
      const cinematic = battleViewsEnabled && humanInvolved;
      if (!cinematic) {
        playSfx("dice_roll", { volume: 0.35, throttleMs: 550 });
        playRandomSfx(["clash_a", "clash_b", "cannon_a"], { volume: 0.28, throttleMs: 420 });
        if (battle.conquered) playSfx("stab", { volume: 0.32, throttleMs: 900 });
      }
    }

    // End of the war.
    if (game.phase === "gameOver" && prevPhaseRef.current !== "gameOver") {
      const winnerIsHuman = game.winner !== null && Boolean(game.players[game.winner]?.isHuman);
      playSfx(winnerIsHuman ? "fanfare" : "defeat", { volume: 0.7 });
    }
    prevPhaseRef.current = game.phase;

    // Hot-seat handoff — a call to the next commander.
    if (game.awaitingHandoff && !prevHandoffRef.current) {
      playSfx("trumpet", { volume: 0.45, throttleMs: 800 });
    }
    prevHandoffRef.current = game.awaitingHandoff;

    // An AI general's dispatch arrives under a white flag.
    if (game.pendingProposal && game.pendingProposal !== prevProposalRef.current) {
      const target = game.players[game.pendingProposal.to];
      if (target?.isHuman) playSfx("chime", { volume: 0.5 });
    }
    prevProposalRef.current = game.pendingProposal;

    // Your turn begins (solo play — hot-seat is covered by the handoff call).
    if (
      game.currentPlayer !== prevPlayerRef.current &&
      game.players[game.currentPlayer]?.isHuman === true &&
      !game.awaitingHandoff &&
      game.phase === "reinforcement"
    ) {
      playSfx("chime", { volume: 0.35, throttleMs: 1200 });
    }
    prevPlayerRef.current = game.currentPlayer;
  }, [game, battleViewsEnabled]);
}
