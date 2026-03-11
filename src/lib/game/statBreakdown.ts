// src/lib/game/statBreakdown.ts

import { StatKey, StatMods, getStat } from "@/lib/game/character";
import { getItem } from "@/lib/game/items";

export type StatContribution = {
  source: string;
  value: number;
};

export type StatBreakdown = Record<StatKey, StatContribution[]>;

export const STAT_KEYS: StatKey[] = ["ATT", "TEC", "CHA", "DEF", "HEA"];

export function computeStatBreakdown(
  base: StatMods | undefined,
  equipment: string[] | undefined
): StatBreakdown {
  const breakdown: StatBreakdown = {
    ATT: [],
    TEC: [],
    CHA: [],
    DEF: [],
    HEA: [],
  };

  // Base (archetype)
  for (const key of STAT_KEYS) {
    const v = getStat(base, key);
    if (v !== 0) {
      breakdown[key].push({
        source: "Archetype",
        value: v,
      });
    }
  }

  // Equipment
  const ids = Array.isArray(equipment) ? equipment : [];

  for (const id of ids) {
    const item = getItem(id);
    if (!item || !item.statMods) continue;

    for (const key of STAT_KEYS) {
      const v = item.statMods[key];
      if (!v) continue;

      breakdown[key].push({
        source: item.name,
        value: v,
      });
    }
  }

  return breakdown;
}