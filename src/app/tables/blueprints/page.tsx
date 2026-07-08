"use client";

import Link from "next/link";
import { BLUEPRINT_CATALOG, BLUEPRINT_CATEGORY_ORDER, type Blueprint } from "@/lib/wildtech/blueprints";
import type { StatMods } from "@/lib/game/items";

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

export default function BlueprintTablePage() {
  const blueprintsByCategory = new Map<string, Blueprint[]>();

  for (const blueprint of BLUEPRINT_CATALOG) {
    const list = blueprintsByCategory.get(blueprint.category) ?? [];
    list.push(blueprint);
    blueprintsByCategory.set(blueprint.category, list);
  }

  for (const list of blueprintsByCategory.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const orderedCategories = [
    ...BLUEPRINT_CATEGORY_ORDER.filter((category) => blueprintsByCategory.has(category)),
    ...Array.from(blueprintsByCategory.keys()).filter(
      (category) => !(BLUEPRINT_CATEGORY_ORDER as readonly string[]).includes(category)
    ),
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
            GM Spoiler Reference
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: "clamp(30px, 4vw, 54px)", fontWeight: 950, lineHeight: 0.94 }}>
              Blueprint Table
            </div>
            <div className="wt-muted" style={{ maxWidth: 920, fontSize: 14, lineHeight: 1.6 }}>
              Every blueprint that can be found in the world, most pulled straight from the graft and loot
              tables. Reveal one to a live party from the GM Dashboard's Blueprint Discovery Console — once
              revealed, it appears as "known" on every joined character's sheet.
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
          const blueprints = blueprintsByCategory.get(category) ?? [];

          return (
            <section key={category} className="wt-card">
              <div className="wt-cardHeader">
                <div className="wt-cardTitle">{category}</div>
                <div className="wt-cardSub">
                  {blueprints.length} blueprint{blueprints.length === 1 ? "" : "s"}
                </div>
              </div>

              <div
                className="wt-cardBody"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {blueprints.map((blueprint) => {
                  const chips = formatStatMods(blueprint.statMods);

                  return (
                    <div key={blueprint.id} className="wt-item">
                      <div className="wt-itemName">{blueprint.name}</div>
                      <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                        {blueprint.description}
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
                        {typeof blueprint.mutationCost === "number" ? (
                          <span className="wt-chip">+{blueprint.mutationCost} Mutation</span>
                        ) : null}
                        {typeof blueprint.humanityLoss === "number" ? (
                          <span className="wt-chip">-{blueprint.humanityLoss} Humanity</span>
                        ) : null}
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
