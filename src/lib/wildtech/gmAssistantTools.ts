import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { GRAFT_CATALOG, type CharacterGraft } from "@/lib/wildtech/grafts";
import { ITEMS } from "@/lib/game/items";
import { getBlueprint } from "@/lib/wildtech/blueprints";

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
  classId?: string;
  className?: string;
  equipment?: string[];
  customItems?: ItemResolved[];
  grafts?: CharacterGraft[];
  availableGraftIds?: string[];
  knownBlueprintIds?: string[];
  soulCharges?: number;
  currentHp?: number;
  maxHp?: number;
  mutationLevel?: number;
  humanity?: number;
};

export type GameContext = {
  id: string;
  scrapAmount: number;
};

const SOUL_SLINGER_CLASS_ID = "soul-slinger";
const SOUL_CHARGE_MAX = 5;
const SCRAP_MAX = 20;

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
  {
    name: "reveal_blueprint_to_party",
    description:
      "Reveal a blueprint to the entire party — every joined character in this session learns it and it appears on their character sheets under Known Blueprints. Blueprint IDs are the graft or item catalog ID prefixed with \"graft-\" or \"item-\" (e.g. \"graft-cybernetic-laser-eye\", \"item-gauss_rifle\").",
    input_schema: {
      type: "object",
      properties: {
        blueprintId: { type: "string" },
      },
      required: ["blueprintId"],
    },
  },
  {
    name: "add_custom_graft",
    description:
      "Grant a character a brand-new custom graft that isn't in the graft catalog. Installs immediately (adds to their installed grafts, raises Mutation, lowers Humanity) — there is no separate unlock step for custom grafts.",
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string" },
        name: { type: "string" },
        sourceEnemy: { type: "string", description: "Optional flavor text for where the graft came from." },
        ability: { type: "string", description: "What the graft does." },
        statBoost: {
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
        mutationCost: { type: "number", description: "Mutation Level increase from installing this graft." },
        humanityLoss: { type: "number", description: "Humanity decrease from installing this graft." },
      },
      required: ["characterId", "name"],
    },
  },
  {
    name: "set_soul_charges",
    description:
      `Set a Soul-Slinger character's current Soul Charges (clamped between 0 and ${SOUL_CHARGE_MAX}). Only meaningful for characters with the Soul-Slinger class.`,
    input_schema: {
      type: "object",
      properties: {
        characterId: { type: "string" },
        soulCharges: { type: "number" },
      },
      required: ["characterId", "soulCharges"],
    },
  },
  {
    name: "adjust_party_scrap",
    description: `Set the party's shared Scrap amount for this session (clamped between 0 and ${SCRAP_MAX}). Applies to the whole party, not one character.`,
    input_schema: {
      type: "object",
      properties: {
        scrapAmount: { type: "number" },
      },
      required: ["scrapAmount"],
    },
  },
] as const;

type ToolExecutionResult = { summary: string } | { error: string };

export async function executeGmAssistantTool(
  db: Firestore,
  roster: JoinedCharacter[],
  toolName: string,
  input: any,
  gameContext?: GameContext
): Promise<ToolExecutionResult> {
  if (toolName === "adjust_party_scrap") {
    if (!gameContext) return { error: "No active game to apply this to." };
    const clamped = clamp(Number(input?.scrapAmount), 0, SCRAP_MAX);
    if (!Number.isFinite(clamped)) return { error: "scrapAmount must be a number." };
    await db.collection("games").doc(gameContext.id).update({
      scrapAmount: clamped,
      updatedAt: FieldValue.serverTimestamp(),
    });
    gameContext.scrapAmount = clamped;
    return { summary: `Set party Scrap to ${clamped}/${SCRAP_MAX}.` };
  }

  if (toolName === "reveal_blueprint_to_party") {
    const blueprint = getBlueprint(String(input?.blueprintId));
    if (!blueprint) return { error: "Unknown blueprint ID." };
    if (roster.length === 0) return { error: "No players are currently in this session." };

    const missing = roster.filter((c) => !(c.knownBlueprintIds ?? []).includes(blueprint.id));
    if (missing.length === 0) {
      return { error: `The whole party already knows ${blueprint.name}.` };
    }

    const batch = db.batch();
    for (const character of missing) {
      batch.update(db.collection("characters").doc(character.id), {
        knownBlueprintIds: FieldValue.arrayUnion(blueprint.id),
        updatedAt: FieldValue.serverTimestamp(),
      });
      character.knownBlueprintIds = [...(character.knownBlueprintIds ?? []), blueprint.id];
    }
    await batch.commit();

    return { summary: `Revealed the "${blueprint.name}" blueprint to the party.` };
  }

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

    case "add_custom_graft": {
      const name = String(input.name || "").trim();
      if (!name) return { error: "Graft name is required." };
      const rawBoost = input.statBoost || {};
      const statBoost: StatMods = {};
      (["ATT", "TEC", "CHA", "DEF", "HEA"] as const).forEach((key) => {
        const val = Number(rawBoost[key]);
        if (Number.isFinite(val) && val !== 0) statBoost[key] = val;
      });
      const mutationCost = Number(input.mutationCost) || 0;
      const humanityLoss = Number(input.humanityLoss) || 0;
      const newGraft: CharacterGraft = {
        id: `custom-graft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        sourceEnemy: input.sourceEnemy ? String(input.sourceEnemy).trim() : "GM Custom",
        ability: input.ability ? String(input.ability).trim() : "No ability text provided.",
        statBoost,
        mutationCost,
        humanityLoss,
      };
      const nextGrafts = [...(Array.isArray(target.grafts) ? target.grafts : []), newGraft];
      const nextMutation = (target.mutationLevel ?? 0) + mutationCost;
      const nextHumanity = Math.max(0, (target.humanity ?? 10) - humanityLoss);
      await ref.update({
        grafts: nextGrafts,
        mutationLevel: nextMutation,
        humanity: nextHumanity,
        updatedAt: FieldValue.serverTimestamp(),
      });
      target.grafts = nextGrafts;
      target.mutationLevel = nextMutation;
      target.humanity = nextHumanity;
      return { summary: `Granted the custom graft "${name}" to ${target.name}.` };
    }

    case "set_soul_charges": {
      const clamped = clamp(Number(input.soulCharges), 0, SOUL_CHARGE_MAX);
      if (!Number.isFinite(clamped)) return { error: "soulCharges must be a number." };
      if (target.classId !== SOUL_SLINGER_CLASS_ID) {
        return { error: `${target.name} isn't a Soul-Slinger, so they don't have Soul Charges.` };
      }
      await ref.update({ soulCharges: clamped, updatedAt: FieldValue.serverTimestamp() });
      target.soulCharges = clamped;
      return { summary: `Set ${target.name}'s Soul Charges to ${clamped}/${SOUL_CHARGE_MAX}.` };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
