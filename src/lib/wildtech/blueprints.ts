import { GRAFT_CATALOG } from "@/lib/wildtech/grafts";
import { ITEMS, ITEM_CATEGORY_ORDER, type StatMods } from "@/lib/game/items";

export type Blueprint = {
  id: string;
  name: string;
  category: string;
  sourceType: "graft" | "item";
  sourceId: string;
  description: string;
  statMods: StatMods;
  mutationCost?: number;
  humanityLoss?: number;
};

export const BLUEPRINT_CATEGORY_ORDER = ["Grafts", ...ITEM_CATEGORY_ORDER] as const;

export const BLUEPRINT_CATALOG: Blueprint[] = [
  ...GRAFT_CATALOG.map((graft): Blueprint => ({
    id: `graft-${graft.id}`,
    name: graft.name,
    category: "Grafts",
    sourceType: "graft",
    sourceId: graft.id,
    description: `${graft.ability} (Recovered from: ${graft.sourceEnemy})`,
    statMods: graft.statBoost,
    mutationCost: graft.mutationCost,
    humanityLoss: graft.humanityLoss,
  })),
  ...Object.values(ITEMS).map((item): Blueprint => ({
    id: `item-${item.id}`,
    name: item.name,
    category: item.category || "Miscellaneous",
    sourceType: "item",
    sourceId: item.id,
    description: item.description,
    statMods: item.statMods || {},
  })),
];

const BLUEPRINT_BY_ID = new Map(BLUEPRINT_CATALOG.map((b) => [b.id, b]));

export function getBlueprint(id: string): Blueprint | undefined {
  return BLUEPRINT_BY_ID.get(id);
}
