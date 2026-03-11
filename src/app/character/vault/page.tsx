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

export default function CharacterVaultPage() {
  const { user, loading: authLoading } = useAuth();

  const [characters, setCharacters] = useState<CharacterDoc[]>([]);
  const [loadingChars, setLoadingChars] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCharacters() {
      if (authLoading) return;

      if (!user?.uid) {
        if (mounted) {
          setCharacters([]);
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
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load characters.");
      } finally {
        if (mounted) setLoadingChars(false);
      }
    }

    loadCharacters();

    return () => {
      mounted = false;
    };
  }, [user?.uid, authLoading]);

  const activeCount = useMemo(
    () => characters.filter((c) => !!c.activeGameId).length,
    [characters]
  );

  if (authLoading) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardBody">Loading character vault…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">Sign in required</div>
            <div className="wt-cardSub">
              You need to sign in to open your Character Vault.
            </div>
          </div>
          <div className="wt-cardBody">
            <Link href="/dashboard" className="wt-btn wt-btnPrimary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-page">
      {/* Hero / Header */}
      <section
        className="wt-card"
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 12% 18%, rgba(168,85,247,0.16), transparent 26%), radial-gradient(circle at 88% 20%, rgba(211,138,43,0.12), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08)), var(--wt-card)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.10), transparent 20%, transparent 80%, rgba(0,0,0,0.12)), repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 38px)",
            opacity: 0.55,
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
            Character Vault
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 950, lineHeight: 0.95 }}>
                Your Contractors
              </div>
              <div className="wt-muted" style={{ maxWidth: 760, fontSize: 14, lineHeight: 1.55 }}>
                Every survivor you’ve forged for the Sprawl lives here. Review their archetypes,
                inspect their loadouts, and jump straight back into the sheet that matters.
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/character/create" className="wt-btn wt-btnJoin">
                  Create Character
                </Link>
                <Link href="/dashboard" className="wt-btn wt-btnPrimary">
                  Back to Dashboard
                </Link>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div className="wt-item">
                <div className="wt-kicker">Stored</div>
                <div className="wt-itemName">{characters.length}</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Total contractors
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Active</div>
                <div className="wt-itemName">{activeCount}</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  In linked sessions
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Status</div>
                <div className="wt-itemName">
                  {loadingChars ? "Syncing" : err ? "Alert" : "Ready"}
                </div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Vault connection
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="wt-card" style={{ marginTop: 18 }}>
        <div className="wt-cardHeader">
          <div className="wt-cardTitleRow">
            <div>
              <div className="wt-cardTitle">Saved Characters</div>
              <div className="wt-cardSub">
                Browse all characters tied to your account.
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
              <div style={{ color: "var(--wt-red)", fontWeight: 900 }}>Error</div>
              <div className="wt-muted" style={{ fontSize: 12 }}>{err}</div>
              <div style={{ marginTop: 10 }}>
                <Link href="/dashboard" className="wt-btn">
                  Back to Dashboard
                </Link>
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
                <div className="wt-kicker">Vault Empty</div>
                <div className="wt-itemName">No contractors stored yet</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Your first character will appear here once created.
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
                <div className="wt-kicker">First Step</div>
                <div className="wt-itemName">Choose an archetype</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Pick a dangerous specialist, choose starting gear, and save them to the vault.
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
                    }}
                  >
                    <div className="wt-cardHeader wt-cardHeaderCompact">
                      <div className="wt-cardTitleRow">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{getArchetypeGlyph(char.classId)}</span>
                          <div>
                            <div style={{ fontWeight: 950, fontSize: 15 }}>{char.name}</div>
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
                        <div style={{ fontSize: 13, fontWeight: 900 }}>{char.bonusName}</div>
                        <div className="wt-muted" style={{ fontSize: 12 }}>{char.bonusText}</div>
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

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 2,
                        }}
                      >
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

      <style jsx>{`
        @media (max-width: 1100px) {
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

          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}