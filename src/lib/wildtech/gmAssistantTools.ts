import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { GRAFT_CATALOG, type CharacterGraft } from "@/lib/wildtech/grafts";
import { ITEMS } from "@/lib/game/items";

type StatMods = {
  ATT?: number;
  TEC?: number;
  CHA?: number;
  DEF?: number;
  HEA?: number;
};

type ItemResolved = {
  id: string;
  name: string;
  description?: string;
  mods?: StatMods;
};

export type JoinedCharacter = {
  id: string;
  name: string;
  className?: string;
  equipment?: string[];
  customItems?: ItemResolved[];
  grafts?: CharacterGraft[];
  availableGraftIds?: string[];
  currentHp?: number;
  maxHp?: number;
  mutationLevel?: number;
  humanity?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function resolvePresetItem(itemId: string): ItemResolved | null {
  const item = ITEMS[itemId];
  if (!item) return null;
  return { id: item.id, name: item.name, description: item.description, mods: item.statMods };
}

export const PRESET_ITEM_CATALOG = Object.values(ITEMS).map((it) => ({ id: it.id, name: it.name }));
export const GRAFT_ID_NAME_CATALOG = GRAFT_CATALOG.map((g) => ({ id: g.id, name: g.name }));

export const GM_ASSISTANT_TOOLS = [
  {
    name: "remove_player_from_game",
    description:
      "Remove a player's character from the current live game session. They can rejoin later with the game code.",
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string", description: "The character's Firestore document ID from the roster." },
      },
      required: ["characterId"],
    },
  },
  {
    name: "set_character_health",
    description: "Set a character's current HP to an exact value (clamped between 0 and their max HP).",
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string" },
        currentHp: { type: "number", description: "The new current HP value." },
      },
      required: ["characterId", "currentHp"],
    },
  },
  {
    name: "set_character_max_health",
    description:
      "Set a character's maximum HP (clamped between 1 and 99). Current HP is re-clamped to the new max if needed.",
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string" },
        maxHp: { type: "number" },
      },
      required: ["characterId", "maxHp"],
    },
  },
  {
    name: "add_preset_item",
    description: "Give a character one of the known preset items from the item catalog provided in context.",
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string" },
        itemId: { type: "string", description: "The preset item's catalog ID." },
      },
      required: ["characterId", "itemId"],
    },
  },
  {
    name: "add_custom_item",
    description: "Give a character a brand-new custom item that isn't in the preset catalog.",
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        statMods: {
          type: "object",
          description: 'Optional stat modifiers, e.g. {"ATT": 1, "DEF": 2}.',
          properties: {
            ATT: { type: "number" },
            TEC: { type: "number" },
            CHA: { type: "number" },
            DEF: { type: "number" },
            HEA: { type: "number" },
          },
        },
      },
      required: ["characterId", "name"],
    },
  },
  {
    name: "remove_item",
    description: "Remove an equipped item (preset or custom) from a character.",
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string" },
        itemId: { type: "string", description: "The item's ID as shown in the character's equipment list." },
      },
      required: ["characterId", "itemId"],
    },
  },
  {
    name: "assign_graft",
    description:
      "Unlock a prototype graft for a character so it appears in their Prototype Grafts list for installation. Does not install it automatically.",
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string" },
        graftId: { type: "string", description: "The graft's catalog ID." },
      },
      required: ["characterId", "graftId"],
    },
  },
] as const;

type ToolExecutionResult = { summary: string } | { error: string };

export async function executeGmAssistantTool(
  db: Firestore,
  roster: JoinedCharacter[],
  toolName: string,
  input: any
): Promise<ToolExecutionResult> {
  const target = roster.find((c) => c.id === input?.characterId);
  if (!target) {
    return { error: "No character with that ID is currently in this game." };
  }

  const ref = db.collection("characters").doc(target.id);

  switch (toolName) {
    case "remove_player_from_game": {
      await ref.update({ activeGameId: null, updatedAt: FieldValue.serverTimestamp() });
      return { summary: `Removed ${target.name} from the game.` };
    }

    case "set_character_health": {
      const maxHp = typeof target.maxHp === "number" ? target.maxHp : 10;
      const nextHp = clamp(Number(input.currentHp), 0, maxHp);
      if (!Number.isFinite(nextHp)) return { error: "currentHp must be a number." };
      await ref.update({ currentHp: nextHp, updatedAt: FieldValue.serverTimestamp() });
      target.currentHp = nextHp;
      return { summary: `Set ${target.name}'s HP to ${nextHp}/${maxHp}.` };
    }

    case "set_character_max_health": {
      const clampedMax = clamp(Number(input.maxHp), 1, 99);
      if (!Number.isFinite(clampedMax)) return { error: "maxHp must be a number." };
      const currentHp = typeof target.currentHp === "number" ? target.currentHp : clampedMax;
      const nextCurrent = clamp(currentHp, 0, clampedMax);
      await ref.update({ maxHp: clampedMax, currentHp: nextCurrent, updatedAt: FieldValue.serverTimestamp() });
      target.maxHp = clampedMax;
      target.currentHp = nextCurrent;
      return { summary: `Set ${target.name}'s max HP to ${clampedMax} (current HP now ${nextCurrent}).` };
    }

    case "add_preset_item": {
      const item = resolvePresetItem(String(input.itemId));
      if (!item) return { error: "Unknown preset item ID." };
      const current = Array.isArray(target.equipment) ? target.equipment : [];
      if (current.includes(item.id)) return { error: `${target.name} already has ${item.name}.` };
      const nextEquipment = [...current, item.id];
      await ref.update({ equipment: nextEquipment, updatedAt: FieldValue.serverTimestamp() });
      target.equipment = nextEquipment;
      return { summary: `Gave ${item.name} to ${target.name}.` };
    }

    case "add_custom_item": {
      const name = String(input.name || "").trim();
      if (!name) return { error: "Item name is required." };
      const rawMods = input.statMods || {};
      const mods: StatMods = {};
      (["ATT", "TEC", "CHA", "DEF", "HEA"] as const).forEach((key) => {
        const val = Number(rawMods[key]);
        if (Number.isFinite(val) && val !== 0) mods[key] = val;
      });
      const newItem: ItemResolved = {
        id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        description: input.description ? String(input.description).trim() : "",
        mods,
      };
      const nextEquipment = [...(Array.isArray(target.equipment) ? target.equipment : []), newItem.id];
      const nextCustom = [...(Array.isArray(target.customItems) ? target.customItems : []), newItem];
      await ref.update({
        equipment: nextEquipment,
        customItems: nextCustom,
        updatedAt: FieldValue.serverTimestamp(),
      });
      target.equipment = nextEquipment;
      target.customItems = nextCustom;
      return { summary: `Gave a custom item "${name}" to ${target.name}.` };
    }

    case "remove_item": {
      const itemId = String(input.itemId);
      const current = Array.isArray(target.equipment) ? target.equipment : [];
      if (!current.includes(itemId)) return { error: `${target.name} doesn't have that item.` };
      const nextEquipment = current.filter((id) => id !== itemId);
      const nextCustom = (target.customItems ?? []).filter((entry) => entry.id !== itemId);
      await ref.update({
        equipment: nextEquipment,
        customItems: nextCustom,
        updatedAt: FieldValue.serverTimestamp(),
      });
      target.equipment = nextEquipment;
      target.customItems = nextCustom;
      return { summary: `Removed an item from ${target.name}.` };
    }

    case "assign_graft": {
      const graft = GRAFT_CATALOG.find((g) => g.id === input.graftId);
      if (!graft) return { error: "Unknown graft ID." };
      const installed = new Set((target.grafts ?? []).map((g) => g.id));
      const unlocked = new Set(target.availableGraftIds ?? []);
      if (installed.has(graft.id)) return { error: `${target.name} already has ${graft.name} installed.` };
      if (unlocked.has(graft.id)) return { error: `${target.name} already has ${graft.name} unlocked.` };
      const nextUnlocked = [...(target.availableGraftIds ?? []), graft.id];
      await ref.update({
        availableGraftIds: nextUnlocked,
        updatedAt: FieldValue.serverTimestamp(),
      });
      target.availableGraftIds = nextUnlocked;
      return { summary: `Unlocked ${graft.name} for ${target.name}.` };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
