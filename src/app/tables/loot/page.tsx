"use client";

import Link from "next/link";
import { ITEMS, ITEM_CATEGORY_ORDER, type Item, type StatMods } from "@/lib/game/items";

function formatStatMods(mods?: StatMods) {
  const chips: string[] = [];
  if (!mods) return chips;

  (["ATT", "DEF", "TEC", "HEA", "CHA"] as const).forEach((key) => {
    const value = mods[key];
    if (typeof value === "number" && value !== 0) {
      chips.push(`${key} ${value > 0 ? "+" : ""}${value}`);
    }
  });

  return chips;
}

export default function LootTablePage() {
  const itemsByCategory = new Map<string, Item[]>();

  for (const item of Object.values(ITEMS)) {
    const category = item.category || "Miscellaneous";
    const list = itemsByCategory.get(category) ?? [];
    list.push(item);
    itemsByCategory.set(category, list);
  }

  for (const list of itemsByCategory.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const orderedCategories = [
    ...ITEM_CATEGORY_ORDER.filter((category) => itemsByCategory.has(category)),
    ...Array.from(itemsByCategory.keys()).filter((category) => !ITEM_CATEGORY_ORDER.includes(category as any)),
  ];

  return (
    <div className="wt-page">
      <section
        className="wt-card"
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 14% 18%, rgba(168,85,247,0.18), transparent 26%), radial-gradient(circle at 85% 22%, rgba(211,138,43,0.12), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08)), var(--wt-card)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.10), transparent 20%, transparent 80%, rgba(0,0,0,0.12)), repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 36px)",
            opacity: 0.6,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: 24,
            display: "grid",
            gap: 14,
          }}
        >
          <div className="wt-badge wt-badgeAccent" style={{ width: "fit-content" }}>
            Reference Table
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: "clamp(30px, 4vw, 54px)", fontWeight: 950, lineHeight: 0.94 }}>
              Loot Table
            </div>
            <div className="wt-muted" style={{ maxWidth: 920, fontSize: 14, lineHeight: 1.6 }}>
              Every weapon, armour, medical, and utility item available to hand out from the GM Dashboard.
              This list mirrors the live item catalog, so anything shown here can be given to a player from
              the "Give Item" panel on a joined character.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/gm" className="wt-btn wt-btnPrimary">
              GM Dashboard
            </Link>
            <Link href="/dashboard" className="wt-btn">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
        {orderedCategories.map((category) => {
          const items = itemsByCategory.get(category) ?? [];

          return (
            <section key={category} className="wt-card">
              <div className="wt-cardHeader">
                <div className="wt-cardTitle">{category}</div>
                <div className="wt-cardSub">{items.length} item{items.length === 1 ? "" : "s"}</div>
              </div>

              <div
                className="wt-cardBody"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {items.map((item) => {
                  const chips = formatStatMods(item.statMods);

                  return (
                    <div key={item.id} className="wt-item">
                      <div className="wt-itemName">{item.name}</div>
                      <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                        {item.description}
                      </div>
                      <div className="wt-chipRow">
                        {chips.length > 0 ? (
                          chips.map((chip) => (
                            <span key={chip} className="wt-chip">
                              {chip}
                            </span>
                          ))
                        ) : (
                          <span className="wt-chip">No stat change</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
