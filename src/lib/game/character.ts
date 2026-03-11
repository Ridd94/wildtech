// src/lib/game/character.ts

export type StatKey = "ATT" | "TEC" | "CHA" | "DEF" | "HEA";

export type StatMods = Partial<Record<StatKey, number>>;

export type CharacterDoc = {
  ownerId: string;
  name: string;

  classId: string;
  className: string;
  description: string;

  bonusName: string;
  bonusText: string;

  statMods: StatMods;

  equipment: string[];
  activeGameId: string | null;

  createdAt?: any;
  updatedAt?: any;
};

export function getStat(statMods: StatMods | undefined, key: StatKey): number {
  const v = statMods?.[key];
  return typeof v === "number" ? v : 0;
}

/**
 * Simple derived HP rule (easy to tweak later):
 * Base HP 10 + (HEA * 4) + (DEF * 2)
 */
export function computeMaxHP(statMods: StatMods | undefined): number {
  const hea = getStat(statMods, "HEA");
  const def = getStat(statMods, "DEF");
  const hp = 10 + hea * 4 + def * 2;
  return Math.max(1, hp);
}

export function formatSigned(n: number): string {
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : `${n}`;
}

export const STAT_LABELS: Record<StatKey, string> = {
  ATT: "Attack",
  TEC: "Tech",
  CHA: "Charm",
  DEF: "Defense",
  HEA: "Health",
};