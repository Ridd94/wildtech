"use client";

import Link from "next/link";
import SignInButton from "@/components/auth/SignInButton";
import SignOutButton from "@/components/auth/SignOutButton";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="wt-page">
      <section
        className="wt-card"
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "calc(100vh - 120px)",
          display: "grid",
          alignItems: "center",
          background:
            "radial-gradient(circle at 12% 16%, rgba(168,85,247,0.24), transparent 24%), radial-gradient(circle at 82% 18%, rgba(99,102,241,0.15), transparent 22%), radial-gradient(circle at 75% 78%, rgba(168,85,247,0.10), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.025), rgba(0,0,0,0.14)), var(--wt-card)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.14), transparent 18%, transparent 82%, rgba(0,0,0,0.16)), repeating-linear-gradient(180deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 38px)",
            opacity: 0.72,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          <section
            style={{
              display: "grid",
              gap: 16,
              padding: 28,
            }}
          >
            <div className="wt-badge wt-badgeAccent" style={{ width: "fit-content" }}>
              WildTech // Neon Descent Protocol
            </div>

            <div style={{ display: "grid", gap: 12, maxWidth: 860 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(40px, 6vw, 88px)",
                  lineHeight: 0.9,
                  fontWeight: 950,
                  letterSpacing: "-0.04em",
                }}
              >
                Harvest power.
                <br />
                Spend yourself.
              </h1>

              <p
                className="wt-muted"
                style={{
                  margin: 0,
                  maxWidth: 760,
                  fontSize: 15,
                  lineHeight: 1.75,
                }}
              >
                WildTech is a dark cyberpunk RPG set in a dying vertical city where operatives
                descend into poisoned understructure, destroy mutated horrors, and graft stolen
                power into their own bodies. Every upgrade makes you stronger. Every upgrade makes
                you less human.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginTop: 6,
              }}
            >
              <div className="wt-item">
                <div className="wt-kicker">Rule Pillar</div>
                <div className="wt-itemName">Grafting</div>
                <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                  Defeat mutated enemies and harvest their body-tech as progression.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">World Tone</div>
                <div className="wt-itemName">Dark Matte Cyberpunk</div>
                <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                  Acid rain, neon ruin, purple growth, rusted systems, failing city machinery.
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Core Cost</div>
                <div className="wt-itemName">Identity Degradation</div>
                <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
                  Mutation rises. Humanity falls. Survival demands self-corruption.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              {loading ? (
                <span className="wt-btn wt-btnPrimary" style={{ opacity: 0.7, cursor: "default" }}>
                  Checking access...
                </span>
              ) : user ? (
                <>
                  <Link href="/dashboard" className="wt-btn wt-btnPrimary">
                    Enter Dashboard
                  </Link>
                  <Link href="/character/vault" className="wt-btn">
                    Character Vault
                  </Link>
                  <Link href="/systems/hunger" className="wt-btn">
                    Grafting System
                  </Link>
                </>
              ) : (
                <>
                  <SignInButton />
                  <Link href="/systems/hunger" className="wt-btn">
                    View Grafting Rules
                  </Link>
                </>
              )}
            </div>
          </section>

          <aside
            className="wt-card"
            style={{
              alignSelf: "stretch",
              background: "rgba(255,255,255,0.025)",
              display: "grid",
              gap: 14,
              padding: 22,
            }}
          >
            <div className="wt-cardHeader wt-cardHeaderCompact" style={{ padding: 0 }}>
              <div className="wt-cardTitleRow">
                <div>
                  <div className="wt-cardTitle">Access Terminal</div>
                  <div className="wt-cardSub">
                    Authenticate to enter the Sprawl operational network.
                  </div>
                </div>
                <span className="wt-badge">Auth</span>
              </div>
            </div>

            {loading ? (
              <div className="wt-item">
                <div className="wt-kicker">Status</div>
                <div className="wt-itemName">Scanning authentication state...</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Establishing user link to WildTech systems.
                </div>
              </div>
            ) : user ? (
              <>
                <div className="wt-item">
                  <div className="wt-kicker">Status</div>
                  <div className="wt-itemName">Authenticated</div>
                  <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    You are signed in and cleared to access the dashboard, character vault, and
                    operative systems.
                  </div>
                </div>

                <div className="wt-item">
                  <div className="wt-kicker">Operator</div>
                  <div className="wt-itemName">{user.displayName || "Unnamed User"}</div>
                  <div className="wt-muted" style={{ fontSize: 12 }}>
                    {user.email ?? user.uid}
                  </div>
                </div>

                <div className="wt-item">
                  <div className="wt-kicker">Actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                    <Link href="/dashboard" className="wt-btn wt-btnPrimary">
                      Open Dashboard
                    </Link>
                    <SignOutButton />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="wt-item">
                  <div className="wt-kicker">Status</div>
                  <div className="wt-itemName">No active session</div>
                  <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    Sign in with Google to access your WildTech characters, dashboard state, and
                    graft progression.
                  </div>
                </div>

                <div className="wt-item">
                  <div className="wt-kicker">Entry Protocol</div>
                  <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    Authentication uses your Firebase Google sign-in flow. Once authorized, your
                    characters are loaded from Firestore under the active user account.
                  </div>
                </div>

                <SignInButton />
              </>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}