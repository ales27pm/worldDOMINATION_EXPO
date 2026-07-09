import type { DiceTier } from "./types";

export const DICE_FACES: Record<DiceTier, number[]> = {
  white: [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6],
  yellow: [1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6],
  green: [1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6],
  red: [1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6],
  black: [1, 2, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6],
};

export const DICE_TIER_COLORS: Record<DiceTier, { fill: string; text: string }> = {
  white: { fill: "#e8e2d2", text: "#2e2417" },
  yellow: { fill: "#e0b52e", text: "#2e2417" },
  green: { fill: "#3d8533", text: "#f2ecdc" },
  red: { fill: "#a1292e", text: "#f2ecdc" },
  black: { fill: "#26221c", text: "#f2ecdc" },
};

export function tierForAttacker(armies: number): DiceTier {
  if (armies <= 3) return "white";
  if (armies <= 7) return "yellow";
  if (armies <= 12) return "green";
  if (armies <= 18) return "red";
  return "black";
}

export function tierForDefender(armies: number): DiceTier {
  if (armies <= 6) return "white";
  if (armies <= 12) return "yellow";
  if (armies <= 20) return "green";
  return "red";
}

export function rollTier(tier: DiceTier): number {
  const faces = DICE_FACES[tier];
  return faces[Math.floor(Math.random() * faces.length)] ?? 3;
}

export interface BattleRound {
  attackerRolls: number[];
  defenderRolls: number[];
  attackerLosses: number;
  defenderLosses: number;
}

export function resolveBattleRound(attackerArmies: number, defenderArmies: number): BattleRound {
  const attackCount = Math.min(3, attackerArmies - 1);
  const defendCount = Math.min(2, defenderArmies);
  const attackerRolls = Array.from({ length: attackCount }, () => 1 + Math.floor(Math.random() * 6)).sort(
    (a, b) => b - a,
  );
  const defenderRolls = Array.from({ length: defendCount }, () => 1 + Math.floor(Math.random() * 6)).sort(
    (a, b) => b - a,
  );
  let attackerLosses = 0;
  let defenderLosses = 0;
  const comparisons = Math.min(attackerRolls.length, defenderRolls.length);
  for (let i = 0; i < comparisons; i += 1) {
    if ((attackerRolls[i] ?? 0) > (defenderRolls[i] ?? 0)) {
      defenderLosses += 1;
    } else {
      attackerLosses += 1;
    }
  }
  return { attackerRolls, defenderRolls, attackerLosses, defenderLosses };
}
