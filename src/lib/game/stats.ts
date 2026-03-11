// src/lib/game/stats.ts

import { StatKey, StatMods, getStat } from "@/lib/game/character";
import { getItem } from "@/lib/game/items";

export const STAT_KEYS: StatKey[] = ["ATT", "TEC", "CHA", "DEF", "HEA"];

export function addMods(a: StatMods | undefined, b: StatMods | undefined): StatMods {
  const out: StatMods = {};
  for (const k of STAT_KEYS) {
    const v = getStat(a, k) + getStat(b, k);
    if (v !== 0) out[k] = v;
  }
  return out;
}

export function sumEquipmentMods(equipmentIds: string[] | undefined): StatMods {
  const out: StatMods = {};
  const ids = Array.isArray(equipmentIds) ? equipmentIds : [];

  for (const id of ids) {
    const item = getItem(id);
    const mods = item?.statMods;
    if (!mods) continue;

    for (const k of STAT_KEYS) {
      const add = mods[k];
      if (typeof add !== "number" || add === 0) continue;
      out[k] = (out[k] ?? 0) + add;
    }
  }

  return out;
}

/**
 * Final stats used for gameplay:
 * base (archetype) + equipment
 */
export function computeFinalStats(base: StatMods | undefined, equipmentIds: string[] | undefined): StatMods {
  const gear = sumEquipmentMods(equipmentIds);
  return addMods(base, gear);
}