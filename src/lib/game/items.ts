// src/lib/game/items.ts

export type StatKey = "ATT" | "TEC" | "CHA" | "DEF" | "HEA";

export type StatMods = Partial<Record<StatKey, number>>;

export type Item = {
  id: string;
  name: string;
  description: string;
  category?: string;
  statMods?: StatMods;
};

export const ITEMS: Record<string, Item> = {
  // Melee Weapons
  rusted_pipe: {
    id: "rusted_pipe",
    name: "Rusted Pipe",
    description: "A length of scavenged pipe. Ugly, heavy, and always within reach.",
    category: "Melee Weapons",
    statMods: { ATT: 1 },
  },
  knife: {
    id: "knife",
    name: "Gutter Knife",
    description:
      "A rusted street blade honed sharp enough to find the gaps in armor. High crit potential.",
    category: "Melee Weapons",
    statMods: { ATT: 2 },
  },
  scrap_axe: {
    id: "scrap_axe",
    name: "Scrap Axe",
    description: "A cobbled-together axe built for brutal, over-committed swings.",
    category: "Melee Weapons",
    statMods: { ATT: 3, DEF: -1 },
  },
  machete: {
    id: "machete",
    name: "Machete",
    description: "Simple, sturdy, and never runs out of ammo.",
    category: "Melee Weapons",
    statMods: { ATT: 3 },
  },
  shock_baton: {
    id: "shock_baton",
    name: "Shock Baton",
    description: "A police-surplus baton rewired to deliver a paralyzing jolt on contact.",
    category: "Melee Weapons",
    statMods: { ATT: 2, TEC: 1 },
  },
  monoblade: {
    id: "monoblade",
    name: "Monoblade",
    description: "An edge only atoms thick, capable of slipping past light plating like it isn't there.",
    category: "Melee Weapons",
    statMods: { ATT: 4, TEC: 1 },
  },
  chainsword: {
    id: "chainsword",
    name: "Chainsword",
    description: "A roaring, chain-toothed blade that turns fights into massacres — and turns allies uneasy.",
    category: "Melee Weapons",
    statMods: { ATT: 5, DEF: -1, CHA: -1 },
  },
  vibro_knife: {
    id: "vibro_knife",
    name: "Vibro Knife",
    description: "A resonating blade that vibrates through tissue with surgical precision.",
    category: "Melee Weapons",
    statMods: { ATT: 4, TEC: 2 },
  },

  // Pistols
  pistol: {
    id: "pistol",
    name: "Scrap Pistol",
    description:
      "A battered revolver powered by unstable soul-batteries. Loud, crude, and deadly.",
    category: "Pistols",
    statMods: { ATT: 2 },
  },
  scrap_revolver: {
    id: "scrap_revolver",
    name: "Scrap Revolver",
    description: "A battered six-shot revolver assembled from spare parts. Dependable and simple.",
    category: "Pistols",
    statMods: { ATT: 2 },
  },
  heavy_revolver: {
    id: "heavy_revolver",
    name: "Heavy Revolver",
    description: "An oversized hand cannon that hits like a truck and kicks like one too.",
    category: "Pistols",
    statMods: { ATT: 4 },
  },
  auto_pistol: {
    id: "auto_pistol",
    name: "Auto Pistol",
    description: "A compact automatic sidearm built for fast follow-up shots.",
    category: "Pistols",
    statMods: { ATT: 3, TEC: 1 },
  },
  smart_pistol: {
    id: "smart_pistol",
    name: "Smart Pistol",
    description: "An onboard targeting chip nudges every shot toward center mass.",
    category: "Pistols",
    statMods: { ATT: 3, TEC: 2 },
  },
  soul_revolver: {
    id: "soul_revolver",
    name: "Soul Revolver",
    description: "A ritual-etched revolver that fires condensed soul-charges instead of lead.",
    category: "Pistols",
    statMods: { ATT: 4, TEC: 2, CHA: 1 },
  },

  // SMGs
  rust_smg: {
    id: "rust_smg",
    name: "Rust SMG",
    description: "A cheaply stamped submachine gun, more rust than steel but it still cycles.",
    category: "SMGs",
    statMods: { ATT: 3 },
  },
  tactical_smg: {
    id: "tactical_smg",
    name: "Tactical SMG",
    description: "A compensated SMG tuned for tight, controllable burst fire.",
    category: "SMGs",
    statMods: { ATT: 4, TEC: 1 },
  },
  smart_smg: {
    id: "smart_smg",
    name: "Smart SMG",
    description: "Recoil-compensating firmware keeps every burst on target.",
    category: "SMGs",
    statMods: { ATT: 4, TEC: 2 },
  },

  // Rifles
  assault_rifle: {
    id: "assault_rifle",
    name: "Assault Rifle",
    description: "A reliable, mass-produced rifle carried by half the gangs in the sprawl.",
    category: "Rifles",
    statMods: { ATT: 5 },
  },
  battle_rifle: {
    id: "battle_rifle",
    name: "Battle Rifle",
    description: "A heavier-caliber rifle built to reach out and drop targets at range.",
    category: "Rifles",
    statMods: { ATT: 6 },
  },
  rail_rifle: {
    id: "rail_rifle",
    name: "Rail Rifle",
    description: "A magnetic rail rifle that punches straight through plated armor.",
    category: "Rifles",
    statMods: { ATT: 7, TEC: 1 },
  },
  plasma_carbine: {
    id: "plasma_carbine",
    name: "Plasma Carbine",
    description: "A compact carbine that spits superheated plasma bolts.",
    category: "Rifles",
    statMods: { ATT: 6, TEC: 2 },
  },
  gauss_rifle: {
    id: "gauss_rifle",
    name: "Gauss Rifle",
    description: "A coil-driven rifle capable of near-instant, devastating impacts. Rare and coveted.",
    category: "Rifles",
    statMods: { ATT: 8, TEC: 2 },
  },

  // Shotguns
  pump_shotgun: {
    id: "pump_shotgun",
    name: "Pump Shotgun",
    description: "A no-frills pump-action shotgun that ends arguments up close.",
    category: "Shotguns",
    statMods: { ATT: 5 },
  },
  combat_shotgun: {
    id: "combat_shotgun",
    name: "Combat Shotgun",
    description: "A semi-automatic combat shotgun that keeps firing as fast as you can pull.",
    category: "Shotguns",
    statMods: { ATT: 6 },
  },
  auto_shotgun: {
    id: "auto_shotgun",
    name: "Auto Shotgun",
    description:
      "A fully automatic shotgun that saturates a wide arc — devastating, but hard to brace against.",
    category: "Shotguns",
    statMods: { ATT: 7, DEF: -1 },
  },

  // Heavy Weapons
  flamethrower: {
    id: "flamethrower",
    name: "Flamethrower",
    description: "A fuel-fed flamethrower that turns a room into a furnace. Nobody trusts the person carrying it.",
    category: "Heavy Weapons",
    statMods: { ATT: 6, TEC: 1, CHA: -1 },
  },
  minigun: {
    id: "minigun",
    name: "Minigun",
    description:
      "A rotary-barreled minigun that shreds cover and nerves alike, but weighs you down and draws every eye.",
    category: "Heavy Weapons",
    statMods: { ATT: 8, DEF: -2, CHA: -2 },
  },
  grenade_launcher: {
    id: "grenade_launcher",
    name: "Grenade Launcher",
    description: "A break-action launcher that lobs explosive payloads with unnerving ease.",
    category: "Heavy Weapons",
    statMods: { ATT: 7, TEC: 1, CHA: -1 },
  },
  coil_cannon: {
    id: "coil_cannon",
    name: "Coil Cannon",
    description: "An unstable prototype coil cannon capable of catastrophic single-shot damage — if it doesn't cook off first.",
    category: "Heavy Weapons",
    statMods: { ATT: 9, DEF: -2, TEC: 2, CHA: -2 },
  },

  // Armour
  leather_jacket: {
    id: "leather_jacket",
    name: "Leather Jacket",
    description: "A worn leather jacket that reads as street, not soldier. Light, comfortable, unassuming.",
    category: "Armour",
    statMods: { DEF: 1, CHA: 1 },
  },
  jacket: {
    id: "jacket",
    name: "Carbon Jacket",
    description: "Reinforced urban armor lined with carbon weave plating.",
    category: "Armour",
    statMods: { DEF: 2 },
  },
  tactical_vest: {
    id: "tactical_vest",
    name: "Tactical Vest",
    description: "A plated tactical vest with integrated medical padding, standard for corp security.",
    category: "Armour",
    statMods: { DEF: 3, HEA: 1 },
  },
  riot_armour: {
    id: "riot_armour",
    name: "Riot Armour",
    description: "Bulky riot plating built to stop everything — including friendly conversation.",
    category: "Armour",
    statMods: { DEF: 4, HEA: 2, CHA: -1 },
  },
  nanoweave_suit: {
    id: "nanoweave_suit",
    name: "Nanoweave Suit",
    description: "A suit of reactive nanoweave fibers that stiffen on impact and interface with onboard systems.",
    category: "Armour",
    statMods: { DEF: 3, TEC: 2 },
  },
  heavy_exoskeleton: {
    id: "heavy_exoskeleton",
    name: "Heavy Exoskeleton",
    description: "A full-body combat exoskeleton — nearly unstoppable, and nearly impossible to look human in.",
    category: "Armour",
    statMods: { ATT: 1, DEF: 5, TEC: -1, HEA: 3, CHA: -2 },
  },

  // Medical
  med_patch: {
    id: "med_patch",
    name: "Med Patch",
    description: "Emergency regeneration gel patch. Burns like static.",
    category: "Medical",
    statMods: { HEA: 1 },
  },
  trauma_kit: {
    id: "trauma_kit",
    name: "Trauma Kit",
    description: "A field trauma kit stocked with clotting foam and quick sutures.",
    category: "Medical",
    statMods: { HEA: 2 },
  },
  combat_stim: {
    id: "combat_stim",
    name: "Combat Stim",
    description: "A sharp adrenaline stim that dulls pain and sharpens aggression, briefly.",
    category: "Medical",
    statMods: { ATT: 1, HEA: 1 },
  },
  nano_injector: {
    id: "nano_injector",
    name: "Nano Injector",
    description: "A syringe of medical nanites that knit tissue and interface with cybernetics.",
    category: "Medical",
    statMods: { TEC: 1, HEA: 2 },
  },
  regen_injector: {
    id: "regen_injector",
    name: "Regen Injector",
    description: "A heavy-duty regenerative injector reserved for the worst wounds.",
    category: "Medical",
    statMods: { HEA: 3 },
  },

  // Utilities
  neon_visor: {
    id: "neon_visor",
    name: "Neon Targeting Visor",
    description: "A flickering HUD visor that sharpens targeting overlays.",
    category: "Utilities",
    statMods: { TEC: 2 },
  },
  grapple_launcher: {
    id: "grapple_launcher",
    name: "Grapple Launcher",
    description: "A wrist-mounted grapple launcher for fast repositioning and vertical escapes.",
    category: "Utilities",
    statMods: { DEF: 1, TEC: 1 },
  },
  motion_scanner: {
    id: "motion_scanner",
    name: "Motion Scanner",
    description: "A handheld scanner that pings movement through walls and smoke.",
    category: "Utilities",
    statMods: { TEC: 2 },
  },
  signal_jammer: {
    id: "signal_jammer",
    name: "Signal Jammer",
    description: "A short-range jammer that scrambles nearby electronics and comms.",
    category: "Utilities",
    statMods: { TEC: 2 },
  },
  drone_controller: {
    id: "drone_controller",
    name: "Drone Controller",
    description: "A rugged controller rig for commandeering or piloting combat drones.",
    category: "Utilities",
    statMods: { TEC: 3 },
  },
  shield_projector: {
    id: "shield_projector",
    name: "Shield Projector",
    description: "Projects a short-lived energy barrier to absorb incoming damage.",
    category: "Utilities",
    statMods: { DEF: 2, TEC: 1 },
  },
  hologram_decoy: {
    id: "hologram_decoy",
    name: "Hologram Decoy",
    description: "Deploys a convincing holographic double to pull fire and attention.",
    category: "Utilities",
    statMods: { DEF: 1, TEC: 2, CHA: 1 },
  },
  cloaking_module: {
    id: "cloaking_module",
    name: "Cloaking Module",
    description: "A short-burst optical cloak that bends light around the wearer.",
    category: "Utilities",
    statMods: { DEF: 1, TEC: 3 },
  },
};

export const ITEM_CATEGORY_ORDER = [
  "Melee Weapons",
  "Pistols",
  "SMGs",
  "Rifles",
  "Shotguns",
  "Heavy Weapons",
  "Armour",
  "Medical",
  "Utilities",
] as const;

export function getItem(itemId: string): Item | null {
  return ITEMS[itemId] ?? null;
}
