export type SectorStatus = "liberated" | "destroyed" | "not_visited" | "needs_interaction";

export type SectorDef = {
  id: string;
  number: number | null;
  name: string;
  icon: string;
  color: string;
  isHub?: boolean;
};

export const SECTOR_STATUS_META: Record<
  SectorStatus,
  { label: string; shortLabel: string; icon: string; color: string }
> = {
  liberated: { label: "Liberated", shortLabel: "Liberated", icon: "✅", color: "#22c55e" },
  destroyed: { label: "Destroyed", shortLabel: "Destroyed", icon: "💥", color: "#ef4444" },
  not_visited: { label: "Not Visited", shortLabel: "Unvisited", icon: "❓", color: "#64748b" },
  needs_interaction: { label: "Needs Interaction", shortLabel: "Needs Action", icon: "⚠️", color: "#eab308" },
};

export const DEFAULT_SECTOR_STATUS: SectorStatus = "not_visited";

// Ring order, clockwise starting from the top (12 o'clock), matching the Sanctuary Campaign map art.
// Sector 3 is intentionally absent from the map — its disappearance is part of the campaign's story.
// Note: the hub keeps id "spire" even though it now displays as "The Bunker" — travel station IDs are
// built from this id, so changing it would silently orphan every already-toggled spoke station in Firestore.
export const SECTOR_DEFS: SectorDef[] = [
  { id: "spire", number: null, name: "The Bunker", icon: "🛡️", color: "#38bdf8", isHub: true },
  { id: "final_sector", number: 10, name: "Final Sector", icon: "❓", color: "#64748b" },
  { id: "the_quarry", number: 9, name: "The Quarry", icon: "⛏️", color: "#d97706" },
  { id: "reactor_core", number: 8, name: "Reactor Core", icon: "☢️", color: "#ef4444" },
  { id: "sludge_works", number: 7, name: "Sludge Works", icon: "\u{1F3ED}", color: "#84cc16" },
  { id: "old_city", number: 6, name: "Old City", icon: "\u{1F3D9}️", color: "#9ca3af" },
  { id: "hydroponics", number: 1, name: "Hydroponics", icon: "\u{1F33E}", color: "#22c55e" },
  { id: "foundry", number: 2, name: "The Foundry", icon: "\u{1F528}", color: "#f59e0b" },
  { id: "sunken_docks", number: 4, name: "Sunken Docks", icon: "\u{1F4E1}", color: "#06b6d4" },
  { id: "glass_desert", number: 5, name: "Glass Desert", icon: "\u{1F48E}", color: "#a855f7" },
];

export const RING_ORDER = SECTOR_DEFS.filter((s) => !s.isHub).map((s) => s.id);

export const HUB_ID = "spire";

export function getSectorDef(id: string): SectorDef | undefined {
  return SECTOR_DEFS.find((s) => s.id === id);
}

export type SectorConnection = {
  a: string;
  b: string;
};

// Ring edges (each outer sector to its two ring-neighbours) + spoke edges (every outer sector to the Spire).
export const SECTOR_CONNECTIONS: SectorConnection[] = [
  ...RING_ORDER.map((id, i) => ({ a: id, b: RING_ORDER[(i + 1) % RING_ORDER.length] })),
  ...RING_ORDER.map((id) => ({ a: HUB_ID, b: id })),
];

export type TravelStationDef = {
  id: string;
  a: string;
  b: string;
  slot: 1 | 2;
};

// Two independently lockable travel stations per connection.
export const TRAVEL_STATIONS: TravelStationDef[] = SECTOR_CONNECTIONS.flatMap((conn) => [
  { id: `${conn.a}__${conn.b}__1`, a: conn.a, b: conn.b, slot: 1 as const },
  { id: `${conn.a}__${conn.b}__2`, a: conn.a, b: conn.b, slot: 2 as const },
]);

export function stationsForSector(sectorId: string): TravelStationDef[] {
  return TRAVEL_STATIONS.filter((s) => s.a === sectorId || s.b === sectorId);
}

export function otherSector(station: TravelStationDef, sectorId: string): string {
  return station.a === sectorId ? station.b : station.a;
}
