"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { type CharacterGraft } from "@/lib/wildtech/grafts";

type StatMods = {
  ATT?: number;
  TEC?: number;
  CHA?: number;
  DEF?: number;
  HEA?: number;
};

type SavedRosterCharacter = {
  characterId: string;
  ownerId: string;
  name: string;
  classId: string;
  className: string;
  description: string;
  bonusName: string;
  bonusText: string;
  statMods: StatMods;
  equipment: string[];
  mutationLevel: number;
  humanity: number;
  grafts: CharacterGraft[];
  currentHp: number;
  maxHp: number;
  savedAt?: any;
};

type GameDoc = {
  code: string;
  gmId: string;
  status: "open" | "closed" | "ended" | "saved";
  createdAt?: any;
  updatedAt?: any;
  endedAt?: any;
  savedAt?: any;
  savedRoster?: SavedRosterCharacter[];
};

function formatDate(value: any) {
  if (!value?.toDate) return "—";
  try {
    return value.toDate().toLocaleString();
  } catch {
    return "—";
  }
}

function formatModChips(mods?: StatMods) {
  const chips: string[] = [];
  if (!mods) return chips;

  if (mods.ATT) chips.push(`ATT ${mods.ATT > 0 ? "+" : ""}${mods.ATT}`);
  if (mods.TEC) chips.push(`TEC ${mods.TEC > 0 ? "+" : ""}${mods.TEC}`);
  if (mods.CHA) chips.push(`CHA ${mods.CHA > 0 ? "+" : ""}${mods.CHA}`);
  if (mods.DEF) chips.push(`DEF ${mods.DEF > 0 ? "+" : ""}${mods.DEF}`);
  if (mods.HEA) chips.push(`HEA ${mods.HEA > 0 ? "+" : ""}${mods.HEA}`);

  return chips;
}

export default function GameHistoryPage() {
  const { user, loading } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyGames, setHistoryGames] = useState<Array<GameDoc & { id: string }>>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({});

  const selectedGame = useMemo(
    () => historyGames.find((game) => game.id === selectedGameId) ?? null,
    [historyGames, selectedGameId]
  );

  function toggleExpanded(playerId: string) {
    setExpandedPlayers((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setHistoryGames([]);
      setSelectedGameId("");
      return;
    }

    setError("");

    const q = query(collection(db, "games"), where("gmId", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const nextGames = snapshot.docs
          .map((snap) => ({
            id: snap.id,
            ...(snap.data() as GameDoc),
          }))
          .filter((game) => game.status === "saved");

        nextGames.sort((a, b) => {
          const aTime = a.savedAt?.seconds ?? 0;
          const bTime = b.savedAt?.seconds ?? 0;
          return bTime - aTime;
        });

        setHistoryGames(nextGames);

        setSelectedGameId((current) => {
          if (current && nextGames.some((game) => game.id === current)) {
            return current;
          }
          return nextGames[0]?.id ?? "";
        });
      },
      (err) => {
        console.error("[GM History] history query failed", err);
        setError(err?.message || "Failed to load game history.");
      }
    );

    return () => unsub();
  }, [user, loading]);

  async function reopenSavedGame(game: GameDoc & { id: string }) {
    if (!user) return;

    setBusy(true);
    setError("");

    try {
      const batch = writeBatch(db);
      const roster = Array.isArray(game.savedRoster) ? game.savedRoster : [];

      batch.update(doc(db, "games", game.id), {
        status: "open",
        updatedAt: serverTimestamp(),
      });

      for (const member of roster) {
        batch.update(doc(db, "characters", member.characterId), {
          activeGameId: game.id,
          currentHp: member.currentHp,
          maxHp: member.maxHp,
          equipment: member.equipment,
          grafts: member.grafts,
          mutationLevel: member.mutationLevel,
          humanity: member.humanity,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (err: any) {
      console.error("[GM History] reopenSavedGame failed", err);
      setError(err?.message || "Failed to reopen saved game.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardBody">Loading game history…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">Game History</div>
            <div className="wt-cardSub">You need to be signed in to access saved sessions.</div>
          </div>
          <div className="wt-cardBody">
            <Link href="/" className="wt-btn wt-btnPrimary">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-page">
      <section
        className="wt-card"
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 14% 18%, rgba(168,85,247,0.18), transparent 26%), radial-gradient(circle at 85% 22%, rgba(211,138,43,0.10), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08)), var(--wt-card)",
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
            Archived Session Vault
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: "clamp(30px, 4vw, 54px)", fontWeight: 950, lineHeight: 0.94 }}>
              Game History
            </div>
            <div className="wt-muted" style={{ maxWidth: 920, fontSize: 14, lineHeight: 1.6 }}>
              Review saved sessions, inspect the roster snapshot from the moment the game ended, and reopen archived games when needed.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/gm" className="wt-btn wt-btnPrimary">
              Back to GM Dashboard
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="wt-card" style={{ borderColor: "rgba(239,68,68,0.35)" }}>
          <div className="wt-cardBody">
            <div className="wt-itemName" style={{ color: "#fecaca" }}>
              {error}
            </div>
          </div>
        </section>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 0.85fr) minmax(0, 1.15fr)",
          gap: 18,
        }}
      >
        <section className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">Saved Sessions</div>
            <div className="wt-cardSub">Archived games preserved with final player state.</div>
          </div>

          <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
            {historyGames.length === 0 ? (
              <div className="wt-item">
                <div className="wt-itemName">No saved games yet</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Use End & Save from the GM Dashboard to archive a session here.
                </div>
              </div>
            ) : (
              historyGames.map((game) => {
                const isSelected = game.id === selectedGameId;
                const rosterCount = Array.isArray(game.savedRoster) ? game.savedRoster.length : 0;

                return (
                  <button
                    key={game.id}
                    type="button"
                    className="wt-item"
                    onClick={() => setSelectedGameId(game.id)}
                    style={{
                      textAlign: "left",
                      borderColor: isSelected ? "rgba(168,85,247,0.55)" : undefined,
                      background: isSelected ? "rgba(168,85,247,0.08)" : undefined,
                      cursor: "pointer",
                    }}
                  >
                    <div className="wt-itemTop">
                      <div>
                        <div className="wt-itemName">Code: {game.code}</div>
                        <div className="wt-muted" style={{ fontSize: 12 }}>
                          Game ID: {game.id}
                        </div>
                        <div className="wt-muted" style={{ fontSize: 12 }}>
                          Saved: {formatDate(game.savedAt)}
                        </div>
                        <div className="wt-muted" style={{ fontSize: 12 }}>
                          Players: {rosterCount}
                        </div>
                      </div>
                      <span className="wt-tag">Saved</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">Saved Session Detail</div>
            <div className="wt-cardSub">Roster snapshot captured at the point of archiving.</div>
          </div>

          <div className="wt-cardBody" style={{ display: "grid", gap: 12 }}>
            {!selectedGame ? (
              <div className="wt-item">
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Select a saved game to inspect its history.
                </div>
              </div>
            ) : (
              <>
                <div className="wt-item">
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-kicker">Saved Session</div>
                      <div className="wt-itemName">Code: {selectedGame.code}</div>
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        Saved At: {formatDate(selectedGame.savedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="wt-btn wt-btnPrimary wt-btnSmall"
                      onClick={() => reopenSavedGame(selectedGame)}
                      disabled={busy}
                    >
                      {busy ? "Working..." : "Reopen Saved Game"}
                    </button>
                  </div>
                </div>

                {(selectedGame.savedRoster ?? []).length === 0 ? (
                  <div className="wt-item">
                    <div className="wt-itemName">No saved roster found</div>
                  </div>
                ) : (
                  (selectedGame.savedRoster ?? []).map((player) => {
                    const expanded = !!expandedPlayers[player.characterId];

                    return (
                      <div key={player.characterId} className="wt-item" style={{ display: "grid", gap: 10 }}>
                        <div className="wt-itemTop" style={{ alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div className="wt-itemName">{player.name}</div>
                            <div className="wt-muted" style={{ fontSize: 12 }}>
                              Class: {player.className} ({player.classId})
                            </div>
                            <div className="wt-muted" style={{ fontSize: 12 }}>
                              HP Snapshot: {player.currentHp} / {player.maxHp}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="wt-btn wt-btnSmall"
                            onClick={() => toggleExpanded(player.characterId)}
                          >
                            {expanded ? "Collapse" : "Expand"}
                          </button>
                        </div>

                        {expanded ? (
                          <>
                            <div className="wt-chipRow">
                              {formatModChips(player.statMods).length > 0 ? (
                                formatModChips(player.statMods).map((chip) => (
                                  <span key={chip} className="wt-chip">
                                    {chip}
                                  </span>
                                ))
                              ) : (
                                <span className="wt-chip">No base stat mods</span>
                              )}
                              <span className="wt-chip">Mutation {player.mutationLevel}</span>
                              <span className="wt-chip">Humanity {player.humanity}</span>
                            </div>

                            <div>
                              <div className="wt-kicker">Equipment Snapshot</div>
                              <div className="wt-chipRow" style={{ marginTop: 8 }}>
                                {player.equipment.length === 0 ? (
                                  <span className="wt-chip">No equipment</span>
                                ) : (
                                  player.equipment.map((item) => (
                                    <span key={item} className="wt-chip">
                                      {item}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="wt-kicker">Grafts Snapshot</div>
                              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                                {player.grafts.length === 0 ? (
                                  <div className="wt-chipRow">
                                    <span className="wt-chip">No grafts</span>
                                  </div>
                                ) : (
                                  player.grafts.map((graft) => (
                                    <div key={graft.id} className="wt-item">
                                      <div className="wt-itemTop">
                                        <div>
                                          <div className="wt-itemName">{graft.name}</div>
                                          <div className="wt-muted" style={{ fontSize: 12 }}>
                                            {graft.sourceEnemy}
                                          </div>
                                        </div>
                                        <span className="wt-tag">Graft</span>
                                      </div>

                                      <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55, marginTop: 8 }}>
                                        {graft.ability}
                                      </div>

                                      <div className="wt-chipRow">
                                        {formatModChips(graft.statBoost).length > 0 ? (
                                          formatModChips(graft.statBoost).map((chip) => (
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
                                  ))
                                )}
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}