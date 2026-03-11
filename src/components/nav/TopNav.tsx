"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";

type Tab = {
  href: string;
  label: string;
  restricted?: boolean;
};

const GM_EMAIL = "luke@southwalescustomcomputers.com";

const TABS: Tab[] = [
  { href: "/character/vault", label: "Player" },
  { href: "/systems/hunger", label: "Grafting System" },
  { href: "/gm", label: "Game Master", restricted: true },
  { href: "/gm/history", label: "Game History", restricted: true },
  { href: "/tables/loot", label: "Loot Table", restricted: true },
  { href: "/tables/spells", label: "Spell Table", restricted: true },
];

function getUserLabel(user: any) {
  return user?.displayName || user?.email || "Unknown User";
}

function getUserInitial(user: any) {
  const label = getUserLabel(user).trim();
  return label.charAt(0).toUpperCase() || "U";
}

function normaliseEmail(email: string | null | undefined) {
  return String(email || "").trim().toLowerCase();
}

export default function TopNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const canAccessRestrictedTabs = normaliseEmail(user?.email) === GM_EMAIL;

  const visibleTabs = TABS.filter((tab) => {
    if (!tab.restricted) return true;
    return canAccessRestrictedTabs;
  });

  function isActive(href: string) {
    return pathname?.startsWith(href);
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await signOut(auth);
    } catch (error) {
      console.error("[TopNav] sign out failed", error);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="wt-topnav">
      <div
        className="wt-topnavInner"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
            flexWrap: "wrap",
            flex: "1 1 auto",
          }}
        >
          <Link href="/" className="wt-brand">
            WildTech
          </Link>

          <nav className="wt-tabs" aria-label="Primary navigation">
            {visibleTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={isActive(tab.href) ? "wt-navlink wt-navlinkActive" : "wt-navlink"}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            flex: "0 1 auto",
          }}
        >
          {!loading && user ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(168,85,247,0.18)",
                  background: "rgba(255,255,255,0.04)",
                  minHeight: 42,
                  maxWidth: 340,
                }}
                title={getUserLabel(user)}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={getUserLabel(user)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "999px",
                      objectFit: "cover",
                      border: "1px solid rgba(255,255,255,0.12)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    className="wt-avatarDot"
                    title="Profile"
                    style={{
                      flexShrink: 0,
                    }}
                  >
                    {getUserInitial(user)}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gap: 2,
                    minWidth: 0,
                  }}
                >
                  <div
                    className="wt-muted"
                    style={{
                      fontSize: 11,
                      lineHeight: 1,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    Logged in as
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--wt-text)",
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getUserLabel(user)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="wt-btn"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? "Signing Out…" : "Sign Out"}
              </button>
            </>
          ) : (
            <div className="wt-avatarDot" title="Profile">
              L
            </div>
          )}
        </div>
      </div>
    </header>
  );
}