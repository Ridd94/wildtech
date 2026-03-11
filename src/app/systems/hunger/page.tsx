"use client";

import Link from "next/link";
import { GRAFT_CATALOG } from "@/lib/wildtech/grafts";

type GraftTier = {
  tier: string;
  mutationRange: string;
  humanityEffect: string;
  description: string;
  risk: string;
};

const GRAFT_TIERS: GraftTier[] = [
  {
    tier: "Stable Alteration",
    mutationRange: "0–2",
    humanityEffect: "Minor strain",
    description:
      "Fresh grafts still feel like tools attached to a person. The player remains recognizably human, though not untouched.",
    risk: "Cosmetic shifts, phantom pain, strange impulses.",
  },
  {
    tier: "Visible Deviation",
    mutationRange: "3–5",
    humanityEffect: "Noticeable erosion",
    description:
      "The grafts stop looking supplemental and begin to redefine the body. Civilians stare. Guards hesitate. Mirrors become difficult.",
    risk: "Social penalties, unstable body language, invasive urges.",
  },
  {
    tier: "Predatory Transition",
    mutationRange: "6–8",
    humanityEffect: "Severe loss",
    description:
      "The character is becoming something adapted for violence, survival, or utility rather than personhood.",
    risk: "Compulsions, sensory distortion, rising loss of self-control.",
  },
  {
    tier: "Post-Human Collapse",
    mutationRange: "9+",
    humanityEffect: "Critical degradation",
    description:
      "The character is on the edge of becoming more graft than human. Power rises, but so does the chance of losing identity entirely.",
    risk: "GM-triggered episodes, inability to blend in, catastrophic transformation pressure.",
  },
];

function formatStatBoost(statBoost: {
  ATT?: number;
  TEC?: number;
  CHA?: number;
  DEF?: number;
  HEA?: number;
}) {
  const parts: string[] = [];

  if (typeof statBoost.ATT === "number" && statBoost.ATT !== 0) {
    parts.push(`ATT ${statBoost.ATT > 0 ? "+" : ""}${statBoost.ATT}`);
  }
  if (typeof statBoost.TEC === "number" && statBoost.TEC !== 0) {
    parts.push(`TEC ${statBoost.TEC > 0 ? "+" : ""}${statBoost.TEC}`);
  }
  if (typeof statBoost.CHA === "number" && statBoost.CHA !== 0) {
    parts.push(`CHA ${statBoost.CHA > 0 ? "+" : ""}${statBoost.CHA}`);
  }
  if (typeof statBoost.DEF === "number" && statBoost.DEF !== 0) {
    parts.push(`DEF ${statBoost.DEF > 0 ? "+" : ""}${statBoost.DEF}`);
  }
  if (typeof statBoost.HEA === "number" && statBoost.HEA !== 0) {
    parts.push(`HEA ${statBoost.HEA > 0 ? "+" : ""}${statBoost.HEA}`);
  }

  return parts.length ? parts.join(", ") : "No stat change";
}

export default function GraftingSystemPage() {
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
            Proprietary Rule System
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: "clamp(30px, 4vw, 54px)", fontWeight: 950, lineHeight: 0.94 }}>
              Grafting System
            </div>
            <div className="wt-muted" style={{ maxWidth: 920, fontSize: 14, lineHeight: 1.6 }}>
              In WildTech, powerful enemies are not just defeated — they are harvested.
              When a mutant, amalgam, or bio-mechanical horror carries something useful,
              a player may choose to graft that trait onto their own body. This grants
              new strength, attacks, and utility, but every graft pushes the character
              further from humanity and deeper into mutation.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/dashboard" className="wt-btn wt-btnPrimary">
              Back to Dashboard
            </Link>
            <Link href="/character/vault" className="wt-btn">
              Open Character Vault
            </Link>
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: 18,
          marginTop: 18,
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">Core Rule</div>
              <div className="wt-cardSub">Power can be stolen from the things below.</div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 12 }}>
              <div className="wt-item">
                <div className="wt-kicker">Trigger</div>
                <div className="wt-itemName">Defeat a mutated or graft-bearing enemy</div>
                <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                  If an enemy possesses a usable biological or cybernetic feature — such as a laser eye,
                  gun-fused limb, shock organ, crawler tendons, armored hide, or similar mutation —
                  the party may attempt to recover and graft it.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Reward</div>
                <div className="wt-itemName">Stat increases and new abilities</div>
                <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                  Successful grafts can raise core stats and grant new attacks, movement types,
                  passive bonuses, resistances, or utility powers.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Price</div>
                <div className="wt-itemName">Mutation rises, humanity falls</div>
                <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                  Every graft increases the character’s Mutation Level and decreases their Humanity.
                  Greater power always carries a deeper identity cost.
                </div>
              </div>
            </div>
          </section>

          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">How Grafting Works</div>
              <div className="wt-cardSub">Simple structure for moment-to-moment play.</div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 12 }}>
              <div className="wt-item">
                <div className="wt-kicker">Step 1</div>
                <div className="wt-itemName">Recover the graft</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  After defeating an eligible enemy, the group or GM identifies whether a viable graft can be extracted.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Step 2</div>
                <div className="wt-itemName">Assign the benefit</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  The graft grants a clear reward: stat boost, new attack, passive effect, traversal ability, or sensory upgrade.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Step 3</div>
                <div className="wt-itemName">Apply the cost</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  The player increases Mutation and reduces Humanity according to the graft’s intensity.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Step 4</div>
                <div className="wt-itemName">Track the consequence</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  At higher Mutation Levels, the character may suffer physical distortion, social penalties,
                  compulsions, or loss-of-self events determined by the GM.
                </div>
              </div>
            </div>
          </section>

          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">Example Grafts</div>
              <div className="wt-cardSub">These now mirror the live graft catalog used by characters.</div>
            </div>

            <div
              className="wt-cardBody"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {GRAFT_CATALOG.map((graft) => (
                <div key={graft.id} className="wt-card" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="wt-cardHeader wt-cardHeaderCompact">
                    <div className="wt-cardTitleRow">
                      <div>
                        <div className="wt-cardTitle">{graft.name}</div>
                        <div className="wt-cardSub">{graft.sourceEnemy}</div>
                      </div>
                      <span className="wt-badge">Graft</span>
                    </div>
                  </div>

                  <div className="wt-cardBody wt-cardBodyCompact" style={{ display: "grid", gap: 10 }}>
                    <div className="wt-item">
                      <div className="wt-kicker">Stat Boost</div>
                      <div className="wt-itemName">{formatStatBoost(graft.statBoost)}</div>
                    </div>

                    <div className="wt-item">
                      <div className="wt-kicker">Ability</div>
                      <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                        {graft.ability}
                      </div>
                    </div>

                    <div className="wt-chipRow">
                      <span className="wt-chip">+{graft.mutationCost} Mutation</span>
                      <span className="wt-chip">-{graft.humanityLoss} Humanity</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">Mutation Scale</div>
              <div className="wt-cardSub">The body changes first. The mind follows.</div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
              {GRAFT_TIERS.map((tier) => (
                <div key={tier.tier} className="wt-item">
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-itemName">{tier.tier}</div>
                      <div className="wt-muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Mutation: {tier.mutationRange}
                      </div>
                    </div>
                    <span className="wt-tag">{tier.humanityEffect}</span>
                  </div>

                  <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                    {tier.description}
                  </div>

                  <div className="wt-chipRow">
                    <span className="wt-chip">{tier.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">Design Intent</div>
              <div className="wt-cardSub">What makes this system interesting in play.</div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
              <div className="wt-item">
                <div className="wt-itemName">Temptation over safety</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Every graft should feel desirable enough that the player wants it, even when the cost is worrying.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-itemName">Power with identity loss</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  This is not clean technology. It is survival through controlled self-corruption.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-itemName">Enemy traits become player progression</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  The monsters teach players what kinds of growth are possible by literally wearing those powers on their bodies.
                </div>
              </div>
            </div>
          </section>

          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">GM Guidance</div>
              <div className="wt-cardSub">Simple rulings for early sessions.</div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
              <div className="wt-item">
                <div className="wt-kicker">Minor graft</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Usually grants one small stat bonus or narrow utility effect.
                </div>
                <div className="wt-chipRow">
                  <span className="wt-chip">+1 Mutation</span>
                  <span className="wt-chip">-1 Humanity</span>
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Major graft</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Grants a combat option, strong traversal effect, or major stat increase.
                </div>
                <div className="wt-chipRow">
                  <span className="wt-chip">+2 Mutation</span>
                  <span className="wt-chip">-1 to -2 Humanity</span>
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Severe graft</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Grants signature monster power and should visibly change the body.
                </div>
                <div className="wt-chipRow">
                  <span className="wt-chip">+3 Mutation</span>
                  <span className="wt-chip">-2 Humanity or more</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          div[style*="grid-template-columns: 1.15fr 0.85fr"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 900px) {
          div[style*="grid-template-columns: repeat(2, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}