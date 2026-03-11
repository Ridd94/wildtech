export type StatMods = {
  ATT?: number;
  TEC?: number;
  CHA?: number;
  DEF?: number;
  HEA?: number;
};

export type CharacterGraft = {
  id: string;
  name: string;
  sourceEnemy: string;
  statBoost: StatMods;
  ability: string;
  mutationCost: number;
  humanityLoss: number;
};

export const GRAFT_CATALOG: CharacterGraft[] = [
  {
    id: "laser-eye",
    name: "Laser Eye",
    sourceEnemy: "Mutated sentry, optic horror, corrupted surveillance beast",
    statBoost: { TEC: 2 },
    ability: "Gain a ranged beam attack that can mark or burn a target.",
    mutationCost: 1,
    humanityLoss: 1,
  },
  {
    id: "gun-fused-arm",
    name: "Gun-Fused Arm",
    sourceEnemy: "War-relic mutant with a firearm grown into bone and steel",
    statBoost: { ATT: 2 },
    ability: "Gain a built-in ballistic attack; cannot be disarmed normally.",
    mutationCost: 2,
    humanityLoss: 1,
  },
  {
    id: "crawler-tendons",
    name: "Crawler Tendons",
    sourceEnemy: "Wall-running maintenance aberration",
    statBoost: { DEF: 1 },
    ability: "Climb vertical surfaces and ignore some movement penalties.",
    mutationCost: 1,
    humanityLoss: 1,
  },
  {
    id: "shock-spine",
    name: "Shock Spine",
    sourceEnemy: "Cable-fed electro-mutant",
    statBoost: { TEC: 1, ATT: 1 },
    ability: "Discharge static into melee attackers or power dead machinery briefly.",
    mutationCost: 2,
    humanityLoss: 2,
  },
  {
    id: "reinforced-organ-sack",
    name: "Reinforced Organ Sack",
    sourceEnemy: "Industrial butcher-beast, vat-grown tank organism",
    statBoost: { HEA: 3 },
    ability: "Reduce severe injury once per encounter.",
    mutationCost: 2,
    humanityLoss: 1,
  },
  {
    id: "predator-jaw-assembly",
    name: "Predator Jaw Assembly",
    sourceEnemy: "Ferals, sewer hunters, bio-metal scavengers",
    statBoost: { ATT: 1 },
    ability: "Gain a brutal close-range bite attack and intimidation edge.",
    mutationCost: 1,
    humanityLoss: 2,
  },
];

export function getGraftById(id: string) {
  return GRAFT_CATALOG.find((g) => g.id === id) ?? null;
}

export function getGraftTotals(grafts: CharacterGraft[] = []): Required<StatMods> {
  const total: Required<StatMods> = {
    ATT: 0,
    TEC: 0,
    CHA: 0,
    DEF: 0,
    HEA: 0,
  };

  for (const graft of grafts) {
    const mods = graft.statBoost || {};
    total.ATT += mods.ATT ?? 0;
    total.TEC += mods.TEC ?? 0;
    total.CHA += mods.CHA ?? 0;
    total.DEF += mods.DEF ?? 0;
    total.HEA += mods.HEA ?? 0;
  }

  return total;
}

export function getTotalMutationFromGrafts(grafts: CharacterGraft[] = []) {
  return grafts.reduce((sum, graft) => sum + (graft.mutationCost ?? 0), 0);
}

export function getTotalHumanityLossFromGrafts(grafts: CharacterGraft[] = []) {
  return grafts.reduce((sum, graft) => sum + (graft.humanityLoss ?? 0), 0);
}