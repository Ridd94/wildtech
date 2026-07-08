"use client";

import Link from "next/link";
import { GRAFT_CATALOG, type CharacterGraft } from "@/lib/wildtech/grafts";

function formatStatMods(mods?: CharacterGraft["statBoost"]) {
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

export default function GraftTablePage() {
  const grafts = [...GRAFT_CATALOG].sort((a, b) => a.name.localeCompare(b.name));

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
              Graft Table
            </div>
            <div className="wt-muted" style={{ maxWidth: 920, fontSize: 14, lineHeight: 1.6 }}>
              Every graft that can be harvested and unlocked for a player. This list mirrors the live graft
              catalog used by the Graft Assignment Console on the GM Dashboard and by the Blueprint system.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/gm" className="wt-btn wt-btnPrimary">
              GM Dashboard
            </Link>
            <Link href="/systems/hunger" className="wt-btn">
              Grafting System Rules
            </Link>
            <Link href="/dashboard" className="wt-btn">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
        <section className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">All Grafts</div>
            <div className="wt-cardSub">
              {grafts.length} graft{grafts.length === 1 ? "" : "s"}
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
            {grafts.map((graft) => {
              const chips = formatStatMods(graft.statBoost);

              return (
                <div key={graft.id} className="wt-item">
                  <div className="wt-itemName">{graft.name}</div>
                  <div className="wt-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {graft.sourceEnemy}
                  </div>
                  <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                    {graft.ability}
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
                    <span className="wt-chip">+{graft.mutationCost} Mutation</span>
                    <span className="wt-chip">-{graft.humanityLoss} Humanity</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
