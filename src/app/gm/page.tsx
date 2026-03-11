"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateGameCode } from "@/lib/wildtech/games";
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

type CharacterDoc = {
  ownerId: string;
  name: string;
  classId: string;
  className: string;
  description: string;
  bonusName: string;
  bonusText: string;
  statMods: StatMods;
  equipment: string[];
  mutationLevel?: number;
  humanity?: number;
  grafts?: CharacterGraft[];
  activeGameId: string | null;
  currentHp?: number;
  maxHp?: number;
  createdAt?: any;
  updatedAt?: any;
};

type JoinedCharacter = CharacterDoc & {
  id: string;
};

type ItemResolved = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  mods?: StatMods;
};

const FALLBACK_ITEMS: ItemResolved[] = [
  {
    id: "carbon-jacket",
    name: "Carbon Jacket",
    description: "Reinforced urban armor lined with carbon weave plating.",
    mods: { DEF: 2 },
  },
  {
    id: "gutter-knife",
    name: "Gutter Knife",
    description: "A rusted street blade. Not elegant, but it gets the job done.",
    mods: { ATT: 1 },
  },
  {
    id: "med-patch",
    name: "Med Patch",
    description: "Emergency regeneration gel patch. Burns like static.",
    mods: { HEA: 1 },
  },
  {
    id: "neon-targeting-visor",
    name: "Neon Targeting Visor",
    description: "A flickering HUD visor that sharpens targeting overlays.",
    mods: { TEC: 2 },
  },
  {
    id: "scrap-pistol",
    name: "Scrap Pistol",
    description: "A battered revolver powered by unstable soul-batteries.",
    mods: { ATT: 2 },
  },
  {
    id: "knife",
    name: "Knife",
    description: "A simple blade. Gets the point across.",
    mods: { ATT: 1 },
  },
  {
    id: "pistol",
    name: "Pistol",
    description: "A sidearm with a nasty bark.",
    mods: { ATT: 2 },
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function statValue(mods: StatMods | undefined, key: keyof StatMods) {
  return mods?.[key] ?? 0;
}

function totalGraftStat(grafts: CharacterGraft[] | undefined, key: keyof StatMods) {
  return (grafts ?? []).reduce((sum, graft) => sum + (graft.statBoost?.[key] ?? 0), 0);
}

function totalItemStat(items: ItemResolved[], key: keyof StatMods) {
  return items.reduce((sum, item) => sum + (item.mods?.[key] ?? 0), 0);
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

function mutationTotal(character: CharacterDoc) {
  return typeof character.mutationLevel === "number" ? character.mutationLevel : 0;
}

function humanityTotal(character: CharacterDoc) {
  return typeof character.humanity === "number" ? character.humanity : 10;
}

function formatDate(value: any) {
  if (!value) return "—";

  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleString();
    } catch {
      return "—";
    }
  }

  if (typeof value?.seconds === "number") {
    try {
      return new Date(value.seconds * 1000).toLocaleString();
    } catch {
      return "—";
    }
  }

  return "—";
}

export default function GmPage() {
  const { user, loading } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [games, setGames] = useState<Array<GameDoc & { id: string }>>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [joinedCharacters, setJoinedCharacters] = useState<JoinedCharacter[]>([]);
  const [hpBusyId, setHpBusyId] = useState<string>("");
  const [itemsModule, setItemsModule] = useState<any>(null);
  const [expandedCharacters, setExpandedCharacters] = useState<Record<string, boolean>>({});
  const [currentHpInputs, setCurrentHpInputs] = useState<Record<string, string>>({});
  const [maxHpInputs, setMaxHpInputs] = useState<Record<string, string>>({});

  const firebaseProjectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "missing-project-id";

  const fallbackMap = useMemo(() => {
    const map: Record<string, ItemResolved> = {};
    for (const item of FALLBACK_ITEMS) {
      map[item.id] = item;
    }
    return map;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      try {
        const mod = await import("@/lib/game/items");
        if (mounted) {
          setItemsModule(mod);
        }
      } catch {
        if (mounted) {
          setItemsModule(null);
        }
      }
    }

    loadItems();

    return () => {
      mounted = false;
    };
  }, []);

  function resolveFromModule(itemId: string): ItemResolved | null {
    const mod = itemsModule;
    if (!mod) return null;

    const byId =
      mod.itemsById ||
      mod.ITEMS_BY_ID ||
      mod.ITEM_BY_ID ||
      mod.byId ||
      mod.default?.itemsById ||
      null;

    if (byId && typeof byId === "object" && byId[itemId]) {
      const it = byId[itemId];
      return {
        id: itemId,
        name: it.name || it.title || itemId,
        description: it.description || it.desc || "",
        tags: it.tags || [],
        mods: it.statMods || it.mods || it.bonus || {},
      };
    }

    const list =
      mod.ITEMS ||
      mod.items ||
      mod.ITEM_LIST ||
      mod.ALL_ITEMS ||
      mod.default?.ITEMS ||
      mod.default?.items ||
      null;

    if (Array.isArray(list)) {
      const found = list.find((x: any) => x?.id === itemId);
      if (found) {
        return {
          id: itemId,
          name: found.name || found.title || itemId,
          description: found.description || found.desc || "",
          tags: found.tags || [],
          mods: found.statMods || found.mods || found.bonus || {},
        };
      }
    }

    return null;
  }

  function resolveItem(itemId: string): ItemResolved {
    const fromModule = resolveFromModule(itemId);
    if (fromModule) return fromModule;
    if (fallbackMap[itemId]) return fallbackMap[itemId];
    return {
      id: itemId,
      name: itemId,
      description: "",
      mods: {},
    };
  }

  function getResolvedEquipment(character: CharacterDoc) {
    return (character.equipment ?? []).map(resolveItem);
  }

  function totalStat(character: CharacterDoc, key: keyof StatMods) {
    const equipment = getResolvedEquipment(character);
    return (
      statValue(character.statMods, key) +
      totalGraftStat(character.grafts, key) +
      totalItemStat(equipment, key)
    );
  }

  function isExpanded(characterId: string) {
    return !!expandedCharacters[characterId];
  }

  function toggleExpanded(characterId: string) {
    setExpandedCharacters((prev) => ({
      ...prev,
      [characterId]: !prev[characterId],
    }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    for (const character of joinedCharacters) {
      next[character.id] = true;
    }
    setExpandedCharacters(next);
  }

  function collapseAll() {
    setExpandedCharacters({});
  }

  function buildSavedRoster(characters: JoinedCharacter[]): SavedRosterCharacter[] {
    return characters.map((character) => ({
      characterId: character.id,
      ownerId: character.ownerId,
      name: character.name,
      classId: character.classId,
      className: character.className,
      description: character.description,
      bonusName: character.bonusName,
      bonusText: character.bonusText,
      statMods: character.statMods || {},
      equipment: Array.isArray(character.equipment) ? character.equipment : [],
      mutationLevel: typeof character.mutationLevel === "number" ? character.mutationLevel : 0,
      humanity: typeof character.humanity === "number" ? character.humanity : 10,
      grafts: Array.isArray(character.grafts) ? character.grafts : [],
      currentHp: typeof character.currentHp === "number" ? character.currentHp : 10,
      maxHp: typeof character.maxHp === "number" ? character.maxHp : 10,
    }));
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setGames([]);
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
          .filter((game) => game.status !== "saved");

        nextGames.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;
          return bTime - aTime;
        });

        setGames(nextGames);

        setSelectedGameId((current) => {
          if (current && nextGames.some((game) => game.id === current)) {
            return current;
          }
          return nextGames[0]?.id ?? "";
        });
      },
      (err) => {
        console.error("[GM Dashboard] games query failed", {
          message: err?.message,
          code: err?.code,
          uid: user.uid,
          projectId: firebaseProjectId,
        });
        setError(
          `Failed to load GM games. Project: ${firebaseProjectId}. User: ${user.uid}. ${err?.message || ""}`.trim()
        );
      }
    );

    return () => unsub();
  }, [user, loading, firebaseProjectId]);

  useEffect(() => {
    if (loading) return;
    if (!user || !selectedGameId) {
      setJoinedCharacters([]);
      return;
    }

    setError("");

    const q = query(
      collection(db, "characters"),
      where("activeGameId", "==", selectedGameId)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const nextCharacters = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...(snap.data() as CharacterDoc),
        }));

        nextCharacters.sort((a, b) => a.name.localeCompare(b.name));
        setJoinedCharacters(nextCharacters);

        setCurrentHpInputs((prev) => {
          const next = { ...prev };
          for (const character of nextCharacters) {
            const currentHp =
              typeof character.currentHp === "number" ? character.currentHp : 10;
            next[character.id] = String(currentHp);
          }
          return next;
        });

        setMaxHpInputs((prev) => {
          const next = { ...prev };
          for (const character of nextCharacters) {
            const maxHp =
              typeof character.maxHp === "number" ? character.maxHp : 10;
            next[character.id] = String(maxHp);
          }
          return next;
        });
      },
      (err) => {
        console.error("[GM Dashboard] joined characters query failed", {
          message: err?.message,
          code: err?.code,
          uid: user.uid,
          projectId: firebaseProjectId,
          selectedGameId,
        });
        setError(
          `Failed to load joined players. Project: ${firebaseProjectId}. Game: ${selectedGameId}. ${err?.message || ""}`.trim()
        );
      }
    );

    return () => unsub();
  }, [user, loading, selectedGameId, firebaseProjectId]);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? null,
    [games, selectedGameId]
  );

  async function createNewGame() {
    if (!user) return;

    setBusy(true);
    setError("");

    try {
      let code = generateGameCode();
      let exists = true;
      let safety = 0;

      while (exists && safety < 10) {
        const existing = await getDocs(
          query(collection(db, "games"), where("code", "==", code))
        );

        if (existing.empty) {
          exists = false;
        } else {
          code = generateGameCode();
        }

        safety += 1;
      }

      const created = await addDoc(collection(db, "games"), {
        code,
        gmId: user.uid,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSelectedGameId(created.id);
    } catch (err: any) {
      console.error("[GM Dashboard] createNewGame failed", {
        message: err?.message,
        code: err?.code,
        uid: user.uid,
        projectId: firebaseProjectId,
      });
      setError(err?.message || "Failed to create new game.");
    } finally {
      setBusy(false);
    }
  }

  async function adjustHealth(characterId: string, nextHp: number) {
    const target = joinedCharacters.find((c) => c.id === characterId);
    if (!target) return;

    const maxHp = typeof target.maxHp === "number" ? target.maxHp : 10;
    const clamped = clamp(nextHp, 0, maxHp);

    setHpBusyId(characterId);
    setError("");

    try {
      await updateDoc(doc(db, "characters", characterId), {
        currentHp: clamped,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("[GM Dashboard] adjustHealth failed", {
        message: err?.message,
        code: err?.code,
        characterId,
        uid: user?.uid,
        projectId: firebaseProjectId,
      });
      setError(err?.message || "Failed to update health.");
    } finally {
      setHpBusyId("");
    }
  }

  async function adjustMaxHealth(characterId: string, nextMaxHp: number) {
    const target = joinedCharacters.find((c) => c.id === characterId);
    if (!target) return;

    const currentHp = typeof target.currentHp === "number" ? target.currentHp : 10;
    const clampedMax = clamp(nextMaxHp, 1, 99);
    const clampedCurrent = clamp(currentHp, 0, clampedMax);

    setHpBusyId(characterId);
    setError("");

    try {
      await updateDoc(doc(db, "characters", characterId), {
        maxHp: clampedMax,
        currentHp: clampedCurrent,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("[GM Dashboard] adjustMaxHealth failed", {
        message: err?.message,
        code: err?.code,
        characterId,
        uid: user?.uid,
        projectId: firebaseProjectId,
      });
      setError(err?.message || "Failed to update maximum health.");
    } finally {
      setHpBusyId("");
    }
  }

  async function setExactHealth(characterId: string, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    await adjustHealth(characterId, parsed);
  }

  async function setExactMaxHealth(characterId: string, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    await adjustMaxHealth(characterId, parsed);
  }

  async function closeGame(gameId: string) {
    setBusy(true);
    setError("");

    try {
      await updateDoc(doc(db, "games", gameId), {
        status: "closed",
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("[GM Dashboard] closeGame failed", {
        message: err?.message,
        code: err?.code,
        uid: user?.uid,
        gameId,
        projectId: firebaseProjectId,
      });
      setError(err?.message || "Failed to close game.");
    } finally {
      setBusy(false);
    }
  }

  async function reopenGame(gameId: string) {
    setBusy(true);
    setError("");

    try {
      await updateDoc(doc(db, "games", gameId), {
        status: "open",
        endedAt: null,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("[GM Dashboard] reopenGame failed", {
        message: err?.message,
        code: err?.code,
        uid: user?.uid,
        gameId,
        projectId: firebaseProjectId,
      });
      setError(err?.message || "Failed to reopen game.");
    } finally {
      setBusy(false);
    }
  }

  async function endGame(gameId: string) {
    setBusy(true);
    setError("");

    try {
      const membersSnap = await getDocs(
        query(collection(db, "characters"), where("activeGameId", "==", gameId))
      );

      const batch = writeBatch(db);

      batch.update(doc(db, "games", gameId), {
        status: "ended",
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      membersSnap.docs.forEach((memberDoc) => {
        batch.update(doc(db, "characters", memberDoc.id), {
          activeGameId: null,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      if (selectedGameId === gameId) {
        setJoinedCharacters([]);
      }
    } catch (err: any) {
      console.error("[GM Dashboard] endGame failed", {
        message: err?.message,
        code: err?.code,
        uid: user?.uid,
        gameId,
        projectId: firebaseProjectId,
      });
      setError(err?.message || "Failed to end game.");
    } finally {
      setBusy(false);
    }
  }

  async function endAndSaveGame(gameId: string) {
    setBusy(true);
    setError("");

    try {
      const membersSnap = await getDocs(
        query(collection(db, "characters"), where("activeGameId", "==", gameId))
      );

      const members = membersSnap.docs.map((snap) => ({
        id: snap.id,
        ...(snap.data() as CharacterDoc),
      })) as JoinedCharacter[];

      const savedRoster = buildSavedRoster(members);
      const batch = writeBatch(db);

      batch.update(doc(db, "games", gameId), {
        status: "saved",
        endedAt: serverTimestamp(),
        savedAt: serverTimestamp(),
        savedRoster,
        updatedAt: serverTimestamp(),
      });

      membersSnap.docs.forEach((memberDoc) => {
        batch.update(doc(db, "characters", memberDoc.id), {
          activeGameId: null,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      if (selectedGameId === gameId) {
        setJoinedCharacters([]);
      }
    } catch (err: any) {
      console.error("[GM Dashboard] endAndSaveGame failed", {
        message: err?.message,
        code: err?.code,
        uid: user?.uid,
        gameId,
        projectId: firebaseProjectId,
      });
      setError(err?.message || "Failed to end and save game.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardBody">Loading GM dashboard…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">GM Dashboard</div>
            <div className="wt-cardSub">You need to be signed in to access game control.</div>
          </div>
          <div className="wt-cardBody" style={{ display: "grid", gap: 12 }}>
            <div className="wt-item">
              <div className="wt-kicker">Firebase Project</div>
              <div className="wt-itemName">{firebaseProjectId}</div>
            </div>
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
            Game Master Control
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: "clamp(30px, 4vw, 54px)", fontWeight: 950, lineHeight: 0.94 }}>
              GM Dashboard
            </div>
            <div className="wt-muted" style={{ maxWidth: 920, fontSize: 14, lineHeight: 1.6 }}>
              Run active sessions, close joining when needed, end games cleanly, or archive them into Game History with saved player state.
            </div>
          </div>

          <div className="wt-chipRow">
            <span className="wt-chip">Project: {firebaseProjectId}</span>
            <span className="wt-chip">GM UID: {user.uid}</span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="wt-btn wt-btnPrimary"
              onClick={createNewGame}
              disabled={busy}
            >
              {busy ? "Working..." : "Start New Game"}
            </button>

            <Link href="/gm/history" className="wt-btn">
              Game History
            </Link>

            <Link href="/dashboard" className="wt-btn">
              Back to Dashboard
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
        <div style={{ display: "grid", gap: 18 }}>
          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">Active / Ended Sessions</div>
              <div className="wt-cardSub">Saved sessions are moved to Game History.</div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 10 }}>
              {games.length === 0 ? (
                <div className="wt-item">
                  <div className="wt-itemName">No games created yet</div>
                  <div className="wt-muted" style={{ fontSize: 12 }}>
                    Start a new game to generate a code players can join with.
                  </div>
                </div>
              ) : (
                games.map((game) => {
                  const isSelected = game.id === selectedGameId;

                  return (
                    <div
                      key={game.id}
                      className="wt-item"
                      style={{
                        display: "grid",
                        gap: 10,
                        borderColor: isSelected ? "rgba(168,85,247,0.55)" : undefined,
                        background: isSelected ? "rgba(168,85,247,0.08)" : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedGameId(game.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          margin: 0,
                          textAlign: "left",
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
                              Created: {formatDate(game.createdAt)}
                            </div>
                            <div className="wt-muted" style={{ fontSize: 12 }}>
                              Ended: {formatDate(game.endedAt)}
                            </div>
                          </div>
                          <span className="wt-tag">{game.status}</span>
                        </div>
                      </button>

                      <div className="wt-chipRow">
                        {game.status === "open" ? (
                          <button
                            type="button"
                            className="wt-btn wt-btnSmall"
                            onClick={() => closeGame(game.id)}
                            disabled={busy}
                          >
                            Close Game
                          </button>
                        ) : game.status === "closed" ? (
                          <button
                            type="button"
                            className="wt-btn wt-btnSmall"
                            onClick={() => reopenGame(game.id)}
                            disabled={busy}
                          >
                            Reopen Game
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className="wt-btn wt-btnSmall"
                          onClick={() => endGame(game.id)}
                          disabled={busy}
                        >
                          End Game
                        </button>

                        <button
                          type="button"
                          className="wt-btn wt-btnPrimary wt-btnSmall"
                          onClick={() => endAndSaveGame(game.id)}
                          disabled={busy}
                        >
                          End & Save
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="wt-card">
            <div className="wt-cardHeader">
              <div className="wt-cardTitle">Session Controls</div>
              <div className="wt-cardSub">Manage the currently selected game.</div>
            </div>

            <div className="wt-cardBody" style={{ display: "grid", gap: 12 }}>
              {!selectedGame ? (
                <div className="wt-item">
                  <div className="wt-muted" style={{ fontSize: 12 }}>
                    Select or create a game to view controls.
                  </div>
                </div>
              ) : (
                <>
                  <div className="wt-item">
                    <div className="wt-kicker">Join Code</div>
                    <div className="wt-itemName" style={{ fontSize: 24 }}>
                      {selectedGame.code}
                    </div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Players should enter this code on their character sheet.
                    </div>
                  </div>

                  <div className="wt-item">
                    <div className="wt-kicker">Status</div>
                    <div className="wt-itemName">
                      {selectedGame.status === "open"
                        ? "Open for Joining"
                        : selectedGame.status === "closed"
                        ? "Closed"
                        : "Ended"}
                    </div>
                    <div className="wt-chipRow">
                      {selectedGame.status === "open" ? (
                        <button
                          type="button"
                          className="wt-btn wt-btnSmall"
                          onClick={() => closeGame(selectedGame.id)}
                          disabled={busy}
                        >
                          Close Game
                        </button>
                      ) : selectedGame.status === "closed" ? (
                        <button
                          type="button"
                          className="wt-btn wt-btnSmall"
                          onClick={() => reopenGame(selectedGame.id)}
                          disabled={busy}
                        >
                          Reopen Game
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="wt-btn wt-btnSmall"
                        onClick={() => endGame(selectedGame.id)}
                        disabled={busy}
                      >
                        End Game
                      </button>

                      <button
                        type="button"
                        className="wt-btn wt-btnPrimary wt-btnSmall"
                        onClick={() => endAndSaveGame(selectedGame.id)}
                        disabled={busy}
                      >
                        End & Save
                      </button>
                    </div>
                  </div>

                  <div className="wt-item">
                    <div className="wt-kicker">Players Joined</div>
                    <div className="wt-itemName">{joinedCharacters.length}</div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Live character roster for this selected game.
                    </div>
                  </div>

                  <div className="wt-chipRow">
                    <button type="button" className="wt-btn wt-btnSmall" onClick={expandAll}>
                      Expand All
                    </button>
                    <button type="button" className="wt-btn wt-btnSmall" onClick={collapseAll}>
                      Collapse All
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <section className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">Joined Players</div>
            <div className="wt-cardSub">
              Collapse cards for quick scanning, expand them for full character detail.
            </div>
          </div>

          <div className="wt-cardBody" style={{ display: "grid", gap: 12 }}>
            {!selectedGame ? (
              <div className="wt-item">
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Select a game to view joined players.
                </div>
              </div>
            ) : joinedCharacters.length === 0 ? (
              <div className="wt-item">
                <div className="wt-itemName">No players joined yet</div>
                <div className="wt-muted" style={{ fontSize: 12 }}>
                  Share the code <strong>{selectedGame.code}</strong> so players can join with a character.
                </div>
              </div>
            ) : (
              joinedCharacters.map((character) => {
                const currentHp =
                  typeof character.currentHp === "number" ? character.currentHp : 10;
                const maxHp =
                  typeof character.maxHp === "number" ? character.maxHp : 10;
                const grafts = character.grafts ?? [];
                const resolvedEquipment = getResolvedEquipment(character);
                const expanded = isExpanded(character.id);

                return (
                  <div
                    key={character.id}
                    className="wt-item"
                    style={{
                      display: "grid",
                      gap: 12,
                      borderColor: expanded ? "rgba(168,85,247,0.35)" : undefined,
                      background: expanded ? "rgba(168,85,247,0.04)" : undefined,
                    }}
                  >
                    <div className="wt-itemTop" style={{ alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="wt-itemName">{character.name}</div>
                        <div className="wt-muted" style={{ fontSize: 12 }}>
                          Class: {character.className} ({character.classId})
                        </div>
                        <div className="wt-muted" style={{ fontSize: 12 }}>
                          HP: {currentHp} / {maxHp}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <span className="wt-tag">
                          {hpBusyId === character.id ? "Updating..." : "Live"}
                        </span>

                        <button
                          type="button"
                          className="wt-btn wt-btnSmall"
                          onClick={() => toggleExpanded(character.id)}
                        >
                          {expanded ? "Collapse" : "Expand"}
                        </button>

                        <Link href={`/character/${character.id}`} className="wt-btn wt-btnSmall">
                          Open Sheet
                        </Link>
                      </div>
                    </div>

                    {expanded ? (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
                            gap: 8,
                          }}
                        >
                          <div className="wt-statTile">
                            <div className="wt-statValue">{totalStat(character, "ATT")}</div>
                            <div className="wt-statName">ATT</div>
                          </div>
                          <div className="wt-statTile">
                            <div className="wt-statValue">{totalStat(character, "TEC")}</div>
                            <div className="wt-statName">TEC</div>
                          </div>
                          <div className="wt-statTile">
                            <div className="wt-statValue">{totalStat(character, "CHA")}</div>
                            <div className="wt-statName">CHA</div>
                          </div>
                          <div className="wt-statTile">
                            <div className="wt-statValue">{totalStat(character, "DEF")}</div>
                            <div className="wt-statName">DEF</div>
                          </div>
                          <div className="wt-statTile">
                            <div className="wt-statValue">{totalStat(character, "HEA")}</div>
                            <div className="wt-statName">HEA</div>
                          </div>
                          <div className="wt-statTile">
                            <div className="wt-statValue">{mutationTotal(character)}</div>
                            <div className="wt-statName">Mutation</div>
                          </div>
                          <div className="wt-statTile">
                            <div className="wt-statValue">{humanityTotal(character)}</div>
                            <div className="wt-statName">Humanity</div>
                          </div>
                        </div>

                        <div className="wt-item">
                          <div className="wt-itemTop">
                            <div>
                              <div className="wt-kicker">Current Health</div>
                              <div className="wt-itemName">
                                {currentHp} / {maxHp}
                              </div>
                            </div>
                          </div>

                          <div className="wt-chipRow" style={{ marginTop: 10 }}>
                            <button
                              type="button"
                              className="wt-btn wt-btnSmall"
                              onClick={() => adjustHealth(character.id, currentHp - 1)}
                              disabled={hpBusyId === character.id}
                            >
                              -1 HP
                            </button>
                            <button
                              type="button"
                              className="wt-btn wt-btnSmall"
                              onClick={() => adjustHealth(character.id, currentHp + 1)}
                              disabled={hpBusyId === character.id}
                            >
                              +1 HP
                            </button>
                            <button
                              type="button"
                              className="wt-btn wt-btnSmall"
                              onClick={() => adjustHealth(character.id, 0)}
                              disabled={hpBusyId === character.id}
                            >
                              Set 0
                            </button>
                            <button
                              type="button"
                              className="wt-btn wt-btnSmall"
                              onClick={() => adjustHealth(character.id, maxHp)}
                              disabled={hpBusyId === character.id}
                            >
                              Full Heal
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={maxHp}
                              value={currentHpInputs[character.id] ?? String(currentHp)}
                              onChange={(e) =>
                                setCurrentHpInputs((prev) => ({
                                  ...prev,
                                  [character.id]: e.target.value,
                                }))
                              }
                              className="wt-input"
                              style={{ width: 90 }}
                            />
                            <button
                              type="button"
                              className="wt-btn wt-btnPrimary wt-btnSmall"
                              onClick={() =>
                                setExactHealth(
                                  character.id,
                                  currentHpInputs[character.id] ?? String(currentHp)
                                )
                              }
                              disabled={hpBusyId === character.id}
                            >
                              Set Health
                            </button>
                          </div>
                        </div>

                        <div className="wt-item">
                          <div className="wt-itemTop">
                            <div>
                              <div className="wt-kicker">Maximum Health</div>
                              <div className="wt-itemName">{maxHp}</div>
                            </div>
                          </div>

                          <div className="wt-chipRow" style={{ marginTop: 10 }}>
                            <button
                              type="button"
                              className="wt-btn wt-btnSmall"
                              onClick={() => adjustMaxHealth(character.id, maxHp - 1)}
                              disabled={hpBusyId === character.id}
                            >
                              Max -1
                            </button>
                            <button
                              type="button"
                              className="wt-btn wt-btnSmall"
                              onClick={() => adjustMaxHealth(character.id, maxHp + 1)}
                              disabled={hpBusyId === character.id}
                            >
                              Max +1
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={maxHpInputs[character.id] ?? String(maxHp)}
                              onChange={(e) =>
                                setMaxHpInputs((prev) => ({
                                  ...prev,
                                  [character.id]: e.target.value,
                                }))
                              }
                              className="wt-input"
                              style={{ width: 90 }}
                            />
                            <button
                              type="button"
                              className="wt-btn wt-btnPrimary wt-btnSmall"
                              onClick={() =>
                                setExactMaxHealth(
                                  character.id,
                                  maxHpInputs[character.id] ?? String(maxHp)
                                )
                              }
                              disabled={hpBusyId === character.id}
                            >
                              Set Max Health
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                          <div>
                            <div className="wt-kicker">Equipment</div>
                            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                              {resolvedEquipment.length === 0 ? (
                                <div className="wt-chipRow">
                                  <span className="wt-chip">No equipment</span>
                                </div>
                              ) : (
                                resolvedEquipment.map((item) => (
                                  <div key={item.id} className="wt-item">
                                    <div className="wt-itemTop">
                                      <div>
                                        <div className="wt-itemName">{item.name}</div>
                                        {item.description ? (
                                          <div className="wt-muted" style={{ fontSize: 12 }}>
                                            {item.description}
                                          </div>
                                        ) : null}
                                      </div>
                                      <span className="wt-tag">Gear</span>
                                    </div>

                                    <div className="wt-chipRow">
                                      {formatModChips(item.mods).length > 0 ? (
                                        formatModChips(item.mods).map((chip) => (
                                          <span key={chip} className="wt-chip">
                                            {chip}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="wt-chip">No stat change</span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="wt-kicker">Grafts</div>
                            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                              {grafts.length === 0 ? (
                                <div className="wt-chipRow">
                                  <span className="wt-chip">No grafts</span>
                                </div>
                              ) : (
                                grafts.map((graft) => (
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

                                    <div
                                      className="wt-muted"
                                      style={{ fontSize: 12, lineHeight: 1.55, marginTop: 8 }}
                                    >
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
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}