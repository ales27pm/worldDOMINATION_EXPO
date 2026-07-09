import type { CardType } from "./types";

export type PieceType = Exclude<CardType, "wild">;

export const PIECE_VALUES: Record<PieceType, number> = {
  infantry: 1, cavalry: 5, artillery: 10,
};

export const PIECE_LABEL: Record<PieceType, string> = {
  infantry: "Infantry", cavalry: "Cavalry", artillery: "Artillery",
};

export interface PieceCount {
  type: PieceType;
  count: number;
}

export function pieceBreakdown(armies: number): PieceCount[] {
  let rest = Math.max(0, Math.floor(armies));
  const artillery = Math.floor(rest / PIECE_VALUES.artillery);
  rest -= artillery * PIECE_VALUES.artillery;
  const cavalry = Math.floor(rest / PIECE_VALUES.cavalry);
  rest -= cavalry * PIECE_VALUES.cavalry;
  const result: PieceCount[] = [];
  if (artillery > 0) result.push({ type: "artillery", count: artillery });
  if (cavalry > 0) result.push({ type: "cavalry", count: cavalry });
  if (rest > 0) result.push({ type: "infantry", count: rest });
  return result;
}

export function dominantPiece(armies: number): PieceType {
  if (armies >= PIECE_VALUES.artillery) return "artillery";
  if (armies >= PIECE_VALUES.cavalry) return "cavalry";
  return "infantry";
}

export function breakdownLabel(armies: number): string {
  const parts = pieceBreakdown(armies);
  if (parts.length === 0) return "no armies";
  return parts.map((p) => `${p.count} ${PIECE_LABEL[p.type].toLowerCase()}`).join(", ");
}
