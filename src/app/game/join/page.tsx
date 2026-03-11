"use client";

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

type GameDoc = {
  name: string;
  status: "open" | "closed";
  gmId: string;
  createdAt?: any;
};

export default function JoinGamePage() {
  const { user, loading } = useAuth();
  const [games, setGames] = useState<Array<{ id: string } & GameDoc>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "games"), where("status", "==", "open"));
        const snap = await getDocs(q);
        const list: Array<{ id: string } & GameDoc> = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as GameDoc) }));
        setGames(list);
      } catch (e: any) {
        console.error(e);
        setErr("Failed to load games. Check Firestore rules.");
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="card">
        <h1 className="h1">Join Game</h1>
        <p className="p">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="card">
        <h1 className="h1">Join Game</h1>
        <p className="p">You must sign in first.</p>
        <div className="row">
          <Link className="btn" href="/">
            Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="card">
      <h1 className="h1">Join Game</h1>
      <p className="p">Choose an open session created by the GM.</p>

      {err ? (
        <p className="p" style={{ color: "#ff7a7a" }}>
          {err}
        </p>
      ) : null}

      {games.length === 0 ? (
        <p className="p">No open games right now.</p>
      ) : (
        <div className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {games.map((g) => (
            <div
              key={g.id}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                padding: 14,
                background: "rgba(255,255,255,0.03)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>{g.name}</div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>Game ID: {g.id}</div>
              </div>

              <button
                className="btn btn-primary"
                disabled={busy === g.id}
                onClick={async () => {
                  setErr(null);
                  setBusy(g.id);
                  try {
                    // Must have a character
                    const charSnap = await getDoc(doc(db, "characters", user.uid));
                    if (!charSnap.exists()) {
                      setErr("No character found. Create one first.");
                      return;
                    }

                    // Add member doc (id = user.uid)
                    await setDoc(doc(db, "games", g.id, "members", user.uid), {
                      userId: user.uid,
                      joinedAt: serverTimestamp(),
                    });

                    // Set player's active game
                    await updateDoc(doc(db, "characters", user.uid), {
                      activeGameId: g.id,
                      updatedAt: serverTimestamp(),
                    });

                    // Optional: confirm via UI
                    alert(`Joined ${g.name}!`);
                  } catch (e: any) {
                    console.error(e);
                    setErr("Failed to join game. Check Firestore rules.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === g.id ? "Joining…" : "Join"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: 14 }}>
        <Link className="btn" href="/dashboard">
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}