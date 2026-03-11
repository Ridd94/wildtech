// src/lib/game/items.ts

export type StatKey = "ATT" | "TEC" | "CHA" | "DEF" | "HEA";

export type StatMods = Partial<Record<StatKey, number>>;

export type Item = {
  id: string;
  name: string;
  description: string;
  statMods?: StatMods;
};

export const ITEMS: Record<string, Item> = {
  pistol: {
    id: "pistol",
    name: "Scrap Pistol",
    description:
      "A battered revolver powered by unstable soul-batteries. Loud, crude, and deadly.",
    statMods: { ATT: 2 },
  },

  knife: {
    id: "knife",
    name: "Gutter Knife",
    description:
      "A rusted street blade. Not elegant, but it gets the job done.",
    statMods: { ATT: 1 },
  },

  jacket: {
    id: "jacket",
    name: "Carbon Jacket",
    description:
      "Reinforced urban armor lined with carbon weave plating.",
    statMods: { DEF: 2 },
  },

  neon_visor: {
    id: "neon_visor",
    name: "Neon Targeting Visor",
    description:
      "A flickering HUD visor that sharpens targeting overlays.",
    statMods: { TEC: 2 },
  },

  med_patch: {
    id: "med_patch",
    name: "Med Patch",
    description:
      "Emergency regeneration gel patch. Burns like static.",
    statMods: { HEA: 1 },
  },
};

export function getItem(itemId: string): Item | null {
  return ITEMS[itemId] ?? null;
}