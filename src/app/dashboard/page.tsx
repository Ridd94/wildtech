"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";

type CharacterDoc = {
  id: string;
  ownerId: string;
  name: string;
  classId: string;
  className: string;
  description: string;
  bonusName: string;
  bonusText: string;
  statMods?: {
    ATT?: number;
    TEC?: number;
    CHA?: number;
    DEF?: number;
    HEA?: number;
  };
  equipment?: string[];
  activeGameId?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

type SprawlStatus = {
  powerGridPct: number;
  powerGridLabel: string;
  waterSupply: string;
  amalgamActivity: string;
  contractorsActive: number;
  staticLevel: string;
  contractPressure: string;
};

function formatStatMods(mods?: CharacterDoc["statMods"]): string[] {
  if (!mods) return [];

  const out: string[] = [];
  if (mods.ATT) out.push(`ATT ${mods.ATT > 0 ? `+${mods.ATT}` : mods.ATT}`);
  if (mods.TEC) out.push(`TEC ${mods.TEC > 0 ? `+${mods.TEC}` : mods.TEC}`);
  if (mods.CHA) out.push(`CHA ${mods.CHA > 0 ? `+${mods.CHA}` : mods.CHA}`);
  if (mods.DEF) out.push(`DEF ${mods.DEF > 0 ? `+${mods.DEF}` : mods.DEF}`);
  if (mods.HEA) out.push(`HEA ${mods.HEA > 0 ? `+${mods.HEA}` : mods.HEA}`);
  return out;
}

function getArchetypeGlyph(classId?: string) {
  switch (classId) {
    case "soul-slinger":
      return "⚡";
    case "fog-walker":
      return "🌫️";
    case "vane-priest":
      return "⛪";
    case "hemostat-merc":
      return "🩸";
    case "trench-stalker":
      return "🛠️";
    case "firmament-fallen":
      return "☀️";
    case "signal-jockey":
      return "📡";
    case "scav-gnoll":
      return "🦴";
    case "circuit-breaker":
      return "🔧";
    case "wire-thief":
      return "🧪";
    case "mimic-synth":
      return "🤖";
    case "key-holder":
      return "🗝️";
    case "scrap-mason":
      return "🧱";
    case "grave-looter":
      return "💀";
    case "web-crawler":
      return "🕷️";
    default:
      return "◆";
  }
}

function buildSprawlStatus(characterCount: number): SprawlStatus {
  const powerGridPct = 28 + Math.floor(Math.random() * 51);

  let powerGridLabel = "Stable";
  if (powerGridPct < 40) powerGridLabel = "Failing";
  else if (powerGridPct < 55) powerGridLabel = "Unstable";
  else if (powerGridPct < 68) powerGridLabel = "Strained";

  const waterOptions = [
    "Contaminated",
    "Metallic",
    "Reclaimed",
    "Purple-Tainted",
    "Thin but Drinkable",
  ];

  const amalgamOptions = [
    "Dormant",
    "Rising",
    "Aggressive",
    "Swarming",
    "Migrating",
  ];

  const staticOptions = [
    "Low Whisper",
    "Buzzing",
    "Loud",
    "Screaming",
    "Carrier Wave",
  ];

  const pressureOptions = [
    "Routine Cleanup",
    "Emergency Salvage",
    "High-Risk Contract Surge",
    "Blackout Response",
    "Containment Breach",
  ];

  return {
    powerGridPct,
    powerGridLabel,
    waterSupply: waterOptions[Math.floor(Math.random() * waterOptions.length)],
    amalgamActivity: amalgamOptions[Math.floor(Math.random() * amalgamOptions.length)],
    contractorsActive: Math.max(3, characterCount + 7 + Math.floor(Math.random() * 12)),
    staticLevel: staticOptions[Math.floor(Math.random() * staticOptions.length)],
    contractPressure: pressureOptions[Math.floor(Math.random() * pressureOptions.length)],
  };
}

function getPowerTagClass(label: string) {
  if (label === "Stable") return "wt-tag wt-tagEquipped";
  return "wt-tag";
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();

  const [characters, setCharacters] = useState<CharacterDoc[]>([]);
  const [loadingChars, setLoadingChars] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sprawlStatus, setSprawlStatus] = useState<SprawlStatus | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCharacters() {
      if (!user?.uid) {
        if (mounted) {
          setCharacters([]);
          setSprawlStatus(buildSprawlStatus(0));
          setLoadingChars(false);
        }
        return;
      }

      setLoadingChars(true);
      setErr(null);

      try {
        const q = query(
          collection(db, "characters"),
          where("ownerId", "==", user.uid),
          orderBy("updatedAt", "desc")
        );

        const snap = await getDocs(q);

        if (!mounted) return;

        const rows: CharacterDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CharacterDoc, "id">),
        }));

        setCharacters(rows);
        setSprawlStatus(buildSprawlStatus(rows.length));
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load characters.");
        setSprawlStatus(buildSprawlStatus(0));
      } finally {
        if (mounted) setLoadingChars(false);
      }
    }

    loadCharacters();

    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const featuredCharacter = useMemo(() => {
    return characters.length > 0 ? characters[0] : null;
  }, [characters]);

  if (authLoading) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardBody">Loading dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-page">
      <section
        className="wt-card"
        style={{
          minHeight: 340,
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 12% 18%, rgba(168,85,247,0.18), transparent 26%), radial-gradient(circle at 88% 20%, rgba(211,138,43,0.14), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08)), var(--wt-card)",
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
            display: "grid",
            gridTemplateColumns: "1.25fr 0.75fr",
            gap: 18,
            padding: 28,
          }}
        >
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div className="wt-badge wt-badgeAccent" style={{ width: "fit-content" }}>
              The Sprawl Awaits
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(34px, 5vw, 64px)",
                  lineHeight: 0.95,
                  fontWeight: 950,
                  letterSpacing: "-0.03em",
                }}
              >
                Enter
                <br />
                WildTech
              </h1>

              <p
                className="wt-muted"
                style={{
                  margin: 0,
                  maxWidth: 760,
                  fontSize: 15,
                  lineHeight: 1.55,
                }}
              >
                A vertical graveyard of neon, rust, hunger, and machine ghosts.
                Build your contractor, arm them with scrap-forged gear, harvest power from your enemies,
                and descend into the failing guts of the arcology.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/character/create" className="wt-btn wt-btnJoin">
                Create Character
              </Link>
              <Link href="/character/vault" className="wt-btn wt-btnPrimary">
                Open Character Vault
              </Link>
              <Link href="/gm/guide" className="wt-btn">
                Read GM Guide
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
                marginTop: 4,
              }}
            >
              <div className="wt-item">
                <div className="wt-kicker">Play Style</div>
                <div className="wt-itemName">Survival Cyber-Fantasy</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Grim, strange, and high-risk.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Core Loop</div>
                <div className="wt-itemName">Scavenge → Graft → Descend</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Growth comes from what you dare to become.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Tone</div>
                <div className="wt-itemName">Neon Ruin & Hungry Steel</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Beauty, rot, and pressure in equal measure.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <div className="wt-card" style={{ background: "rgba(0,0,0,0.14)" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitleRow">
                  <div>
                    <div className="wt-cardTitle">Sprawl Status</div>
                    <div className="wt-cardSub">
                      Simulated world-state feed from the arcology.
                    </div>
                  </div>
                  <span className="wt-badge">Live Feed</span>
                </div>
              </div>

              <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
                <div className="wt-item">
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-itemName">Power Grid</div>
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        {sprawlStatus ? `${sprawlStatus.powerGridPct}% capacity` : "Reading..."}
                      </div>
                    </div>
                    <span className={getPowerTagClass(sprawlStatus?.powerGridLabel || "Stable")}>
                      {sprawlStatus?.powerGridLabel || "Reading"}
                    </span>
                  </div>
                </div>

                <div className="wt-item">
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-itemName">Water Supply</div>
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        Lower-tier reservoir quality scan.
                      </div>
                    </div>
                    <span className="wt-tag">{sprawlStatus?.waterSupply || "Scanning"}</span>
                  </div>
                </div>

                <div className="wt-item">
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-itemName">Amalgam Activity</div>
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        Motion traces from maintenance arteries.
                      </div>
                    </div>
                    <span className="wt-tag wt-tagEquipped">
                      {sprawlStatus?.amalgamActivity || "Pending"}
                    </span>
                  </div>
                </div>

                <div className="wt-item">
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-itemName">Contractors Active</div>
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        Registered descent-ready operators.
                      </div>
                    </div>
                    <span className="wt-tag">{sprawlStatus?.contractorsActive ?? "--"}</span>
                  </div>
                </div>

                <div className="wt-item">
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-itemName">Static Level</div>
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        Neural-link interference across the district.
                      </div>
                    </div>
                    <span className="wt-tag">{sprawlStatus?.staticLevel || "Tuning"}</span>
                  </div>
                </div>

                <div className="wt-item">
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-itemName">Contract Pressure</div>
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        Current demand from the upper tiers.
                      </div>
                    </div>
                    <span className="wt-tag">{sprawlStatus?.contractPressure || "Pending"}</span>
                  </div>
                </div>
              </div>
            </div>

            {featuredCharacter ? (
              <div className="wt-card" style={{ background: "rgba(0,0,0,0.14)" }}>
                <div className="wt-cardHeader">
                  <div className="wt-cardTitleRow">
                    <div>
                      <div className="wt-cardTitle">Active Contractor</div>
                      <div className="wt-cardSub">
                        Your most recently updated character.
                      </div>
                    </div>
                    <span className="wt-badge wt-badgeAccent">Ready</span>
                  </div>
                </div>

                <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 26 }}>
                      {getArchetypeGlyph(featuredCharacter.classId)}
                    </div>
                    <div>
                      <div className="wt-itemName" style={{ fontSize: 16 }}>
                        {featuredCharacter.name}
                      </div>
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        {featuredCharacter.className}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/character/${featuredCharacter.id}`}
                    className="wt-btn wt-btnPrimary"
                    style={{ width: "fit-content" }}
                  >
                    Open Character Sheet
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 18,
          marginTop: 18,
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitleRow">
                <div>
                  <div className="wt-cardTitle">Your Contractors</div>
                  <div className="wt-cardSub">
                    Characters ready to return to the Sprawl.
                  </div>
                </div>
                <Link href="/character/create" className="wt-btn wt-btnPrimary">
                  New Character
                </Link>
              </div>
            </div>

            <div className="wt-cardBody">
              {loadingChars ? (
                <div className="wt-item">
                  <div className="wt-muted" style={{ fontSize: 12 }}>
                    Loading characters…
                  </div>
                </div>
              ) : err ? (
                <div className="wt-item" style={{ borderColor: "rgba(255,93,93,0.28)" }}>
                  <div style={{ fontWeight: 900, color: "var(--wt-red)" }}>
                    Could not load characters
                  </div>
                  <div className="wt-muted" style={{ fontSize: 12 }}>
                    {err}
                  </div>
                </div>
              ) : characters.length === 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div className="wt-item">
                    <div className="wt-kicker">No contractors yet</div>
                    <div className="wt-itemName">Start your first descent</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Create a character and begin shaping your place in the Sprawl.
                    </div>
                    <Link
                      href="/character/create"
                      className="wt-btn wt-btnJoin"
                      style={{ width: "fit-content", marginTop: 8 }}
                    >
                      Create Character
                    </Link>
                  </div>

                  <div className="wt-item">
                    <div className="wt-kicker">New players</div>
                    <div className="wt-itemName">Learn the grafting rules</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Power in WildTech can be harvested from the bodies of the things you kill.
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  {characters.map((char) => {
                    const mods = formatStatMods(char.statMods);
                    return (
                      <Link
                        key={char.id}
                        href={`/character/${char.id}`}
                        className="wt-card"
                        style={{
                          display: "block",
                          background: "rgba(255,255,255,0.02)",
                          transition: "transform 140ms ease",
                        }}
                      >
                        <div className="wt-cardHeader wt-cardHeaderCompact">
                          <div className="wt-cardTitleRow">
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 18 }}>
                                {getArchetypeGlyph(char.classId)}
                              </span>
                              <div>
                                <div style={{ fontWeight: 950, fontSize: 15 }}>
                                  {char.name}
                                </div>
                                <div className="wt-muted" style={{ fontSize: 12 }}>
                                  {char.className}
                                </div>
                              </div>
                            </div>

                            <span className="wt-badge">
                              {(char.equipment || []).length}/4 equipped
                            </span>
                          </div>
                        </div>

                        <div className="wt-cardBody wt-cardBodyCompact" style={{ display: "grid", gap: 10 }}>
                          <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
                            {char.description}
                          </div>

                          <div style={{ display: "grid", gap: 6 }}>
                            <div className="wt-kicker">Bonus</div>
                            <div style={{ fontSize: 13, fontWeight: 900 }}>
                              {char.bonusName}
                            </div>
                            <div className="wt-muted" style={{ fontSize: 12 }}>
                              {char.bonusText}
                            </div>
                          </div>

                          <div className="wt-chipRow">
                            {mods.length > 0 ? (
                              mods.map((mod) => (
                                <span key={mod} className="wt-chip">
                                  {mod}
                                </span>
                              ))
                            ) : (
                              <span className="wt-chip">No listed stat mods</span>
                            )}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                            <span className="wt-tag">
                              {char.activeGameId ? "In Session" : "Standalone"}
                            </span>
                            <span className="wt-muted" style={{ fontSize: 12 }}>
                              Open Sheet →
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">What kind of game is WildTech?</div>
              <div className="wt-cardSub">
                A quick orientation for first-time players.
              </div>
            </div>

            <div
              className="wt-cardBody"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div className="wt-item">
                <div className="wt-kicker">1. Build</div>
                <div className="wt-itemName">Create a dangerous survivor</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Choose an archetype with sharp strengths and painful tradeoffs.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">2. Graft</div>
                <div className="wt-itemName">Harvest power from the enemy</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Defeated horrors can become upgrades — if you accept the cost.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">3. Descend</div>
                <div className="wt-itemName">Face the rot below</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  The lower tiers are unstable, hungry, and full of machine ruin.
                </div>
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">Quick Access</div>
              <div className="wt-cardSub">
                Jump straight into the most-used parts of the system.
              </div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
              <Link href="/character/create" className="wt-item">
                <div className="wt-itemTop">
                  <div>
                    <div className="wt-itemName">Create Character</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Build a new contractor for the Sprawl.
                    </div>
                  </div>
                  <span className="wt-tag">Start</span>
                </div>
              </Link>

              <Link href="/character/vault" className="wt-item">
                <div className="wt-itemTop">
                  <div>
                    <div className="wt-itemName">Character Vault</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Browse and manage your saved characters.
                    </div>
                  </div>
                  <span className="wt-tag">Open</span>
                </div>
              </Link>

              <Link href="/systems/hunger" className="wt-item">
                <div className="wt-itemTop">
                  <div>
                    <div className="wt-itemName">Grafting System</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Learn how harvested mutations become player power.
                    </div>
                  </div>
                  <span className="wt-tag">Rules</span>
                </div>
              </Link>

              <Link href="/tables/loot" className="wt-item">
                <div className="wt-itemTop">
                  <div>
                    <div className="wt-itemName">Loot Table</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      See the kinds of treasures and trash you may find.
                    </div>
                  </div>
                  <span className="wt-tag">Table</span>
                </div>
              </Link>
            </div>
          </section>

          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">The Arcology Speaks</div>
              <div className="wt-cardSub">
                Flavor text to set the tone before play.
              </div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 12 }}>
              <div className="wt-item">
                <div
                  className="wt-muted"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  “You were born in the rain, and unless you sign the contract,
                  you will likely die in it.”
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Rumors from below</div>
                <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                  Tier 8 maintenance shafts are said to be choking with fused metal,
                  wet wire nests, and things that learned how to move without being
                  built for it.
                </div>
              </div>
            </div>
          </section>

          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">Session Status</div>
              <div className="wt-cardSub">
                Multiplayer/session tools can grow into this panel later.
              </div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
              <div className="wt-item">
                <div className="wt-itemTop">
                  <div>
                    <div className="wt-itemName">Join a Game</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      No active session connected.
                    </div>
                  </div>
                  <span className="wt-tag">Idle</span>
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-itemTop">
                  <div>
                    <div className="wt-itemName">Party Feed</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Party tools and shared runs can slot in here later.
                    </div>
                  </div>
                  <span className="wt-tag">Future</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1180px) {
          div[style*="grid-template-columns: 1.25fr 0.75fr"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 1050px) {
          div[style*="grid-template-columns: 1.2fr 0.8fr"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 900px) {
          div[style*="grid-template-columns: repeat(3, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="grid-template-columns: repeat(2, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}