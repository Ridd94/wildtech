"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  CharacterGraft,
  GRAFT_CATALOG,
  getGraftTotals,
  getTotalHumanityLossFromGrafts,
  getTotalMutationFromGrafts,
} from "@/lib/wildtech/grafts";

type StatMods = {
  ATT?: number;
  TEC?: number;
  CHA?: number;
  DEF?: number;
  HEA?: number;
};

type GameDoc = {
  code: string;
  gmId: string;
  status: "open" | "closed";
  createdAt?: any;
  updatedAt?: any;
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
  activeGameId: string | null;
  mutationLevel?: number;
  humanity?: number;
  grafts?: CharacterGraft[];
  currentHp?: number;
  maxHp?: number;
  createdAt?: any;
  updatedAt?: any;
  raceId?: string;
  raceName?: string;
  raceDescription?: string;
  raceBonusName?: string;
  raceBonusText?: string;
  raceStatMods?: StatMods;
  classBonusName?: string;
  classBonusText?: string;
  classStatMods?: StatMods;
};

type ItemResolved = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  mods?: StatMods;
};

const EQUIP_LIMIT = 4;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

function formatModChips(mods?: StatMods) {
  const chips: string[] = [];
  if (!mods) return chips;

  if (mods.ATT) chips.push(`ATT ${mods.ATT > 0 ? "+" : ""}${mods.ATT}`);
  if (mods.TEC) chips.push(`TEC ${mods.TEC > 0 ? "+" : ""}${mods.TEC}`);
  if (mods.DEF) chips.push(`DEF ${mods.DEF > 0 ? "+" : ""}${mods.DEF}`);
  if (mods.HEA) chips.push(`HEA ${mods.HEA > 0 ? "+" : ""}${mods.HEA}`);
  if (mods.CHA) chips.push(`CHA ${mods.CHA > 0 ? "+" : ""}${mods.CHA}`);

  return chips;
}

function tsToText(value: any) {
  if (!value) return "—";

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleString();
    }

    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleString();
    }

    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) return dt.toLocaleString();
  } catch {}

  return "—";
}

function SectionCard({
  title,
  sub,
  badge,
  children,
}: {
  title: string;
  sub?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="wt-card"
      style={{
        padding: 20,
        display: "grid",
        gap: 14,
      }}
    >
      <div className="wt-cardHeader wt-cardHeaderCompact" style={{ padding: 0 }}>
        <div className="wt-cardTitleRow">
          <div>
            <div className="wt-cardTitle" style={{ fontSize: 20, fontWeight: 950 }}>
              {title}
            </div>
            {sub ? (
              <div className="wt-cardSub" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
                {sub}
              </div>
            ) : null}
          </div>
          {badge ? <span className="wt-badge">{badge}</span> : null}
        </div>
      </div>

      <div>{children}</div>
    </section>
  );
}

function Meter({
  label,
  value,
  max,
  fill,
  meta,
}: {
  label: string;
  value: number;
  max: number;
  fill: string;
  meta?: string;
}) {
  const pct = max > 0 ? clamp(Math.round((value / max) * 100), 0, 100) : 0;

  return (
    <div
      className="wt-card"
      style={{
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div className="wt-kicker" style={{ fontSize: 12 }}>
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 950 }}>
          {value}/{max}
        </div>
      </div>

      <div className="wt-hpStrip" aria-label={label}>
        <div
          className="wt-hpFill"
          style={{
            width: `${pct}%`,
            background: fill,
          }}
        />
      </div>

      {meta ? (
        <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
          {meta}
        </div>
      ) : null}
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div
      className="wt-card"
      style={{
        padding: 16,
        display: "grid",
        gap: 6,
        textAlign: "center",
      }}
    >
      <div className="wt-muted" style={{ fontSize: 12, fontWeight: 800 }}>
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 950, lineHeight: 1 }}>{value}</div>
      <div className="wt-kicker" style={{ fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}

export default function CharacterSheetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterDoc | null>(null);

  const [showDebug, setShowDebug] = useState(false);
  const [itemsModule, setItemsModule] = useState<any>(null);
  const [applyingGraftId, setApplyingGraftId] = useState<string | null>(null);

  const [gameCodeInput, setGameCodeInput] = useState("");
  const [joiningGame, setJoiningGame] = useState(false);
  const [activeGameCode, setActiveGameCode] = useState<string>("");

  const fallbackMap = useMemo(() => {
    const m: Record<string, ItemResolved> = {};
    for (const it of FALLBACK_ITEMS) m[it.id] = it;
    return m;
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wt_showDebug");
      setShowDebug(stored === "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("wt_showDebug", showDebug ? "1" : "0");
    } catch {}
  }, [showDebug]);

  useEffect(() => {
    let mounted = true;
    let unsubscribeCharacter: (() => void) | null = null;

    async function load() {
      if (!id) return;

      setLoading(true);
      setErr(null);

      try {
        const ref = doc(db, "characters", String(id));

        unsubscribeCharacter = onSnapshot(
          ref,
          (snap) => {
            if (!snap.exists()) {
              if (mounted) {
                setErr("Character not found.");
                setCharacter(null);
                setLoading(false);
              }
              return;
            }

            const data = snap.data() as CharacterDoc;

            if (!mounted) return;

            const normalized: CharacterDoc = {
              ...data,
              equipment: Array.isArray(data.equipment) ? data.equipment : [],
              statMods: data.statMods || {},
              mutationLevel: typeof data.mutationLevel === "number" ? data.mutationLevel : 0,
              humanity: typeof data.humanity === "number" ? data.humanity : 10,
              grafts: Array.isArray(data.grafts) ? data.grafts : [],
              currentHp: typeof data.currentHp === "number" ? data.currentHp : 10,
              maxHp: typeof data.maxHp === "number" ? data.maxHp : 10,
            };

            setCharacter(normalized);
            setLoading(false);
          },
          (error) => {
            if (!mounted) return;
            setErr(error?.message || "Failed to load character.");
            setLoading(false);
          }
        );

        try {
          const mod = await import("@/lib/game/items");
          if (mounted) setItemsModule(mod);
        } catch {
          if (mounted) setItemsModule(null);
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load character.");
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      if (unsubscribeCharacter) unsubscribeCharacter();
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadGameCode() {
      if (!character?.activeGameId) {
        setActiveGameCode("");
        return;
      }

      try {
        const gameSnap = await getDoc(doc(db, "games", character.activeGameId));
        if (!cancelled && gameSnap.exists()) {
          const data = gameSnap.data() as GameDoc;
          setActiveGameCode(data.code || "");
        }
      } catch {
        if (!cancelled) {
          setActiveGameCode("");
        }
      }
    }

    loadGameCode();

    return () => {
      cancelled = true;
    };
  }, [character?.activeGameId]);

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
    const fromMod = resolveFromModule(itemId);
    if (fromMod) return fromMod;
    if (fallbackMap[itemId]) return fallbackMap[itemId];
    return { id: itemId, name: itemId, description: "", mods: {} };
  }

  const equippedIds = character?.equipment ?? [];
  const equippedItems = useMemo(
    () => equippedIds.map(resolveItem),
    [equippedIds, itemsModule, fallbackMap]
  );

  const armoryItems: ItemResolved[] = useMemo(() => {
    const mod = itemsModule;

    const list =
      mod?.ITEMS ||
      mod?.items ||
      mod?.ITEM_LIST ||
      mod?.ALL_ITEMS ||
      mod?.default?.ITEMS ||
      mod?.default?.items ||
      null;

    if (Array.isArray(list)) {
      return list
        .map((x: any) => ({
          id: String(x?.id ?? ""),
          name: x?.name || x?.title || String(x?.id ?? "Unknown"),
          description: x?.description || x?.desc || "",
          tags: x?.tags || [],
          mods: x?.statMods || x?.mods || x?.bonus || {},
        }))
        .filter((x: ItemResolved) => x.id);
    }

    return FALLBACK_ITEMS.filter((x) => !["knife", "pistol"].includes(x.id));
  }, [itemsModule]);

  const grafts = character?.grafts ?? [];
  const graftTotals = useMemo(() => getGraftTotals(grafts), [grafts]);

  const totals = useMemo(() => {
    const base: Required<StatMods> = { ATT: 0, TEC: 0, CHA: 0, DEF: 0, HEA: 0 };

    const raceMods = character?.raceStatMods || {};
    base.ATT += raceMods.ATT ?? 0;
    base.TEC += raceMods.TEC ?? 0;
    base.CHA += raceMods.CHA ?? 0;
    base.DEF += raceMods.DEF ?? 0;
    base.HEA += raceMods.HEA ?? 0;

    const classMods = character?.classStatMods || character?.statMods || {};
    base.ATT += classMods.ATT ?? 0;
    base.TEC += classMods.TEC ?? 0;
    base.CHA += classMods.CHA ?? 0;
    base.DEF += classMods.DEF ?? 0;
    base.HEA += classMods.HEA ?? 0;

    for (const it of equippedItems) {
      const m = it.mods || {};
      base.ATT += m.ATT ?? 0;
      base.TEC += m.TEC ?? 0;
      base.CHA += m.CHA ?? 0;
      base.DEF += m.DEF ?? 0;
      base.HEA += m.HEA ?? 0;
    }

    base.ATT += graftTotals.ATT ?? 0;
    base.TEC += graftTotals.TEC ?? 0;
    base.CHA += graftTotals.CHA ?? 0;
    base.DEF += graftTotals.DEF ?? 0;
    base.HEA += graftTotals.HEA ?? 0;

    return base;
  }, [character, equippedItems, graftTotals]);

  const availableGrafts = useMemo(() => {
    const installed = new Set(grafts.map((g) => g.id));
    return GRAFT_CATALOG.filter((g) => !installed.has(g.id));
  }, [grafts]);

  const totalMutationFromGrafts = useMemo(() => getTotalMutationFromGrafts(grafts), [grafts]);
  const totalHumanityLossFromGrafts = useMemo(
    () => getTotalHumanityLossFromGrafts(grafts),
    [grafts]
  );

  async function persistCharacterPatch(patch: Record<string, any>) {
    if (!character || !id) return;

    const ref = doc(db, "characters", String(id));
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }

  async function persistEquipment(nextIds: string[]) {
    await persistCharacterPatch({
      equipment: nextIds,
    });
  }

  async function onEquip(itemId: string) {
    if (!character) return;

    const current = character.equipment ?? [];
    if (current.includes(itemId)) return;

    if (current.length >= EQUIP_LIMIT) {
      alert(`Equip limit reached (${EQUIP_LIMIT}). Unequip something first.`);
      return;
    }

    await persistEquipment([...current, itemId]);
  }

  async function onUnequip(itemId: string) {
    if (!character) return;
    const current = character.equipment ?? [];
    if (!current.includes(itemId)) return;
    await persistEquipment(current.filter((x) => x !== itemId));
  }

  async function onApplyGraft(graftId: string) {
    if (!character || !id) return;

    const graft = GRAFT_CATALOG.find((g) => g.id === graftId);
    if (!graft) {
      alert("Graft not found.");
      return;
    }

    const currentGrafts = Array.isArray(character.grafts) ? character.grafts : [];
    if (currentGrafts.some((g) => g.id === graft.id)) {
      alert("That graft is already installed.");
      return;
    }

    try {
      setApplyingGraftId(graft.id);

      const nextGrafts = [...currentGrafts, graft];
      const nextMutation = (character.mutationLevel ?? 0) + graft.mutationCost;
      const nextHumanity = Math.max(0, (character.humanity ?? 10) - graft.humanityLoss);

      await persistCharacterPatch({
        grafts: nextGrafts,
        mutationLevel: nextMutation,
        humanity: nextHumanity,
      });
    } catch (e: any) {
      alert(e?.message || "Failed to apply graft.");
    } finally {
      setApplyingGraftId(null);
    }
  }

  async function adjustHp(nextHp: number) {
    if (!character) return;

    const maxHp = typeof character.maxHp === "number" ? character.maxHp : 10;
    await persistCharacterPatch({
      currentHp: clamp(nextHp, 0, maxHp),
    });
  }

  async function adjustMaxHp(nextMaxHp: number) {
    if (!character) return;

    const clampedMax = clamp(nextMaxHp, 1, 99);
    const nextCurrent = clamp(character.currentHp ?? clampedMax, 0, clampedMax);

    await persistCharacterPatch({
      maxHp: clampedMax,
      currentHp: nextCurrent,
    });
  }

  async function onJoinGame() {
    if (!character || !id) return;

    const code = gameCodeInput.trim().toUpperCase();
    if (!code) {
      alert("Enter a game code.");
      return;
    }

    try {
      setJoiningGame(true);

      const q = query(collection(db, "games"), where("code", "==", code));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("No game found with that code.");
        return;
      }

      const gameDoc = snap.docs[0];
      const game = gameDoc.data() as GameDoc;

      if (game.status !== "open") {
        alert("That game is closed.");
        return;
      }

      await persistCharacterPatch({
        activeGameId: gameDoc.id,
      });

      setGameCodeInput("");
    } catch (e: any) {
      alert(e?.message || "Failed to join game.");
    } finally {
      setJoiningGame(false);
    }
  }

  async function onLeaveGame() {
    if (!character?.activeGameId) return;

    try {
      setJoiningGame(true);

      await persistCharacterPatch({
        activeGameId: null,
      });

      setGameCodeInput("");
    } catch (e: any) {
      alert(e?.message || "Failed to leave game.");
    } finally {
      setJoiningGame(false);
    }
  }

  async function onSaveCharacter() {
    alert("Character state is now saved live to Firestore.");
  }

  const currentHp = character?.currentHp ?? 10;
  const maxHp = character?.maxHp ?? 10;

  const hpPct = useMemo(() => {
    if (maxHp <= 0) return 0;
    return clamp(Math.round((currentHp / maxHp) * 100), 0, 100);
  }, [currentHp, maxHp]);

  const mutationLevel = character?.mutationLevel ?? 0;
  const humanity = character?.humanity ?? 10;

  const heroSubtitle = [
    character?.raceName || null,
    character?.className || null,
    character?.activeGameId ? `In Session ${activeGameCode ? `(${activeGameCode})` : ""}` : "No Active Session",
  ]
    .filter(Boolean)
    .join(" • ");

  if (loading) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardBody">Loading character…</div>
        </div>
      </div>
    );
  }

  if (err || !character) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">Error</div>
            <div className="wt-cardSub">{err || "Could not load character."}</div>
          </div>
          <div className="wt-cardBody">
            <button className="wt-btn" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-page">
      <div className="wt-subheader">
        <div className="wt-subLeft">
          <Link href="/character/vault" className="wt-btn" aria-label="Back to Character Vault">
            ← <span style={{ marginLeft: 6 }}>Character Vault</span>
          </Link>

          <span className="wt-pill wt-pillMuted">
            Equipped {equippedIds.length}/{EQUIP_LIMIT}
          </span>
        </div>

        <div className="wt-subRight">
          <button className="wt-btn" onClick={() => setShowDebug((v) => !v)}>
            {showDebug ? "Hide Debug" : "Show Debug"}
          </button>
          <button className="wt-btn" onClick={onSaveCharacter}>
            Save Character
          </button>
          <Link href="/gm" className="wt-btn wt-btnJoin">
            GM Dashboard
          </Link>
        </div>
      </div>

      <section
        className="wt-card"
        style={{
          padding: 22,
          display: "grid",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "96px minmax(0, 1fr)",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 22,
              display: "grid",
              placeItems: "center",
              fontSize: 36,
              fontWeight: 950,
              color: "var(--wt-text)",
              background:
                "linear-gradient(135deg, rgba(168,85,247,0.20), rgba(59,130,246,0.12))",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
            }}
          >
            {String(character?.name || "?").charAt(0).toUpperCase()}
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              minWidth: 0,
            }}
          >
            <div className="wt-kicker">WildTech Character Sheet</div>

            <div
              style={{
                fontSize: 34,
                fontWeight: 950,
                lineHeight: 1.05,
                wordBreak: "break-word",
              }}
            >
              {character.name}
            </div>

            <div
              className="wt-muted"
              style={{
                fontSize: 15,
                lineHeight: 1.5,
              }}
            >
              {heroSubtitle}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {character.raceName ? <span className="wt-badge">{character.raceName}</span> : null}
              <span className="wt-badge wt-badgeAccent">{character.className || character.classId}</span>
              <span className="wt-badge">{character.activeGameId ? "Live Session" : "Idle"}</span>
            </div>
          </div>
        </div>

        <div className="wt-healthLine">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--wt-red)" }}>❤</span>
            <span>
              Health: <strong style={{ color: "var(--wt-text)" }}>{currentHp}</strong> / {maxHp}
            </span>
          </span>
        </div>

        <div className="wt-hpStrip" aria-label="Health bar">
          <div className="wt-hpFill" style={{ width: `${hpPct}%` }} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <Meter
            label="Health"
            value={currentHp}
            max={maxHp}
            fill="linear-gradient(90deg, #22c55e, #16a34a)"
            meta="Live health used by players and the GM dashboard."
          />
          <Meter
            label="Mutation"
            value={mutationLevel}
            max={10}
            fill="linear-gradient(90deg, #a855f7, #7c3aed)"
            meta={`Grafts currently add +${totalMutationFromGrafts} Mutation.`}
          />
          <Meter
            label="Humanity"
            value={humanity}
            max={10}
            fill="linear-gradient(90deg, #38bdf8, #0ea5e9)"
            meta={`Installed grafts currently cost ${totalHumanityLossFromGrafts} Humanity.`}
          />
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
          <SectionCard
            title="Identity & Background"
            sub="Who this contractor is, where their power comes from, and what defines them."
            badge="Core"
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div className="wt-item">
                <div className="wt-kicker">Race</div>
                <div className="wt-itemName">{character.raceName || "No race recorded"}</div>
                {character.raceDescription ? (
                  <div className="wt-muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
                    {character.raceDescription}
                  </div>
                ) : null}
                {character.raceBonusName ? (
                  <div className="wt-muted" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
                    <strong style={{ color: "var(--wt-text)" }}>{character.raceBonusName}:</strong>{" "}
                    {character.raceBonusText || "No race bonus text."}
                  </div>
                ) : null}
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Class</div>
                <div className="wt-itemName">{character.className}</div>
                {character.description ? (
                  <div className="wt-muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
                    {character.description}
                  </div>
                ) : null}
                <div className="wt-muted" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
                  <strong style={{ color: "var(--wt-text)" }}>
                    {character.classBonusName || character.bonusName || "Archetype Bonus"}:
                  </strong>{" "}
                  {character.classBonusText || character.bonusText || "No class bonus text."}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Vitals & Session Control"
            sub="Live session presence, join codes, and persistent health control."
            badge="Live"
          >
            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button className="wt-btn wt-btnSmall" onClick={() => adjustHp(currentHp - 1)}>
                  -1 HP
                </button>
                <button className="wt-btn wt-btnSmall" onClick={() => adjustHp(currentHp + 1)}>
                  +1 HP
                </button>
                <button className="wt-btn wt-btnSmall" onClick={() => adjustHp(maxHp)}>
                  Heal to Max
                </button>

                <span className="wt-pill wt-pillMuted" style={{ marginLeft: 6 }}>
                  Max HP
                  <button
                    className="wt-btn wt-btnSmall"
                    style={{ marginLeft: 8 }}
                    onClick={() => adjustMaxHp(maxHp - 1)}
                  >
                    -
                  </button>
                  <strong style={{ margin: "0 8px" }}>{maxHp}</strong>
                  <button className="wt-btn wt-btnSmall" onClick={() => adjustMaxHp(maxHp + 1)}>
                    +
                  </button>
                </span>
              </div>

              <div className="wt-item">
                <div className="wt-itemTop">
                  <div>
                    <div className="wt-itemName">
                      {character.activeGameId ? "Currently Joined" : "Not In Game"}
                    </div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Game Code: {activeGameCode || "None"}
                    </div>
                    <div className="wt-muted" style={{ fontSize: 12 }}>
                      Game ID: {character.activeGameId || "None"}
                    </div>
                  </div>
                  <span className="wt-tag">{character.activeGameId ? "Live Session" : "Idle"}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  className="wt-input"
                  type="text"
                  placeholder="Enter game code"
                  value={gameCodeInput}
                  onChange={(e) => setGameCodeInput(e.target.value.toUpperCase())}
                  style={{ minWidth: 200 }}
                />
                <button
                  type="button"
                  className="wt-btn wt-btnPrimary"
                  onClick={onJoinGame}
                  disabled={joiningGame}
                >
                  {joiningGame ? "Joining..." : "Join Game"}
                </button>

                {character.activeGameId ? (
                  <button
                    type="button"
                    className="wt-btn"
                    onClick={onLeaveGame}
                    disabled={joiningGame}
                  >
                    Leave Game
                  </button>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Installed Grafts"
            sub="Harvested enemy traits permanently fused into the body."
            badge={`Installed ${grafts.length}`}
          >
            <div style={{ display: "grid", gap: 10 }}>
              {grafts.length === 0 ? (
                <div className="wt-item">
                  <div className="wt-muted" style={{ fontSize: 12 }}>
                    No grafts installed yet.
                  </div>
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
                      <span className="wt-tag">Installed</span>
                    </div>

                    <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55, marginTop: 8 }}>
                      {graft.ability}
                    </div>

                    <div className="wt-chipRow">
                      {formatModChips(graft.statBoost).map((chip) => (
                        <span key={chip} className="wt-chip">
                          {chip}
                        </span>
                      ))}
                      <span className="wt-chip">+{graft.mutationCost} Mutation</span>
                      <span className="wt-chip">-{graft.humanityLoss} Humanity</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Prototype Grafts"
            sub="Experimental body modifications available for installation."
            badge="Install"
          >
            <div className="wt-scrollPanel" style={{ display: "grid", gap: 10, maxHeight: 560 }}>
              {availableGrafts.length === 0 ? (
                <div className="wt-item">
                  <div className="wt-muted" style={{ fontSize: 12 }}>
                    All currently defined prototype grafts have been installed.
                  </div>
                </div>
              ) : (
                availableGrafts.map((graft) => (
                  <div key={graft.id} className="wt-item">
                    <div className="wt-itemTop" style={{ alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div className="wt-itemName">{graft.name}</div>
                        <div className="wt-muted" style={{ fontSize: 12, marginTop: 4 }}>
                          {graft.sourceEnemy}
                        </div>
                        <div
                          className="wt-muted"
                          style={{ fontSize: 12, lineHeight: 1.55, marginTop: 8 }}
                        >
                          {graft.ability}
                        </div>

                        <div className="wt-chipRow">
                          {formatModChips(graft.statBoost).map((chip) => (
                            <span key={chip} className="wt-chip">
                              {chip}
                            </span>
                          ))}
                          <span className="wt-chip">+{graft.mutationCost} Mutation</span>
                          <span className="wt-chip">-{graft.humanityLoss} Humanity</span>
                        </div>
                      </div>

                      <button
                        className="wt-btn wt-btnPrimary wt-btnSmall"
                        onClick={() => onApplyGraft(graft.id)}
                        disabled={applyingGraftId === graft.id}
                      >
                        {applyingGraftId === graft.id ? "Applying..." : "Apply Graft"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Equipment"
            sub="Equipped loadout, armory access, and stat-affecting item changes."
            badge={`${equippedIds.length}/${EQUIP_LIMIT}`}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div className="wt-listHeader">
                  <div className="wt-sectionLabel" style={{ margin: 0 }}>
                    Equipped Gear
                  </div>
                  <span className="wt-badge">{equippedIds.length}</span>
                </div>

                <div className="wt-scrollPanel" style={{ display: "grid", gap: 10, maxHeight: 520 }}>
                  {equippedItems.length === 0 ? (
                    <div className="wt-item">
                      <div className="wt-muted" style={{ fontSize: 12 }}>
                        Nothing equipped yet.
                      </div>
                    </div>
                  ) : (
                    equippedItems.map((it) => (
                      <div key={it.id} className="wt-item">
                        <div className="wt-itemTop">
                          <div>
                            <div className="wt-itemName">{it.name}</div>
                            {it.description ? (
                              <div className="wt-muted" style={{ fontSize: 12 }}>
                                {it.description}
                              </div>
                            ) : null}

                            <div className="wt-chipRow">
                              {formatModChips(it.mods).map((chip) => (
                                <span key={chip} className="wt-chip">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button className="wt-btn wt-btnSmall" onClick={() => onUnequip(it.id)}>
                            Unequip
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div className="wt-listHeader">
                  <div className="wt-sectionLabel" style={{ margin: 0 }}>
                    Armory
                  </div>
                  <span className="wt-badge">Items</span>
                </div>

                <div className="wt-scrollPanel" style={{ display: "grid", gap: 10, maxHeight: 520 }}>
                  {armoryItems.map((it) => {
                    const isEquipped = equippedIds.includes(it.id);
                    return (
                      <div key={it.id} className="wt-item">
                        <div className="wt-itemTop">
                          <div>
                            <div className="wt-itemName">{it.name}</div>

                            <div className="wt-chipRow">
                              {isEquipped ? (
                                <span className="wt-tag wt-tagEquipped">Equipped</span>
                              ) : (
                                <span className="wt-tag">Available</span>
                              )}
                            </div>

                            {it.description ? (
                              <div className="wt-muted" style={{ fontSize: 12, marginTop: 6 }}>
                                {it.description}
                              </div>
                            ) : null}

                            <div className="wt-chipRow">
                              {formatModChips(it.mods).map((chip) => (
                                <span key={chip} className="wt-chip">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </div>

                          {isEquipped ? (
                            <button className="wt-btn wt-btnSmall" onClick={() => onUnequip(it.id)}>
                              Unequip
                            </button>
                          ) : (
                            <button
                              className="wt-btn wt-btnPrimary wt-btnSmall"
                              onClick={() => onEquip(it.id)}
                            >
                              Equip
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>

          <details className="wt-details">
            <summary className="wt-detailsSummary">
              <span>Stat Breakdown</span>
              <span className="wt-muted" style={{ fontWeight: 800 }}>
                Toggle
              </span>
            </summary>
            <div className="wt-detailsBody">
              <div className="wt-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Where each modifier comes from.
              </div>
              <div className="wt-pre">
                {JSON.stringify(
                  {
                    raceMods: character.raceStatMods || {},
                    classMods: character.classStatMods || character.statMods,
                    equipped: equippedItems.map((x) => ({ id: x.id, name: x.name, mods: x.mods })),
                    grafts: grafts.map((g) => ({
                      id: g.id,
                      name: g.name,
                      statBoost: g.statBoost,
                      mutationCost: g.mutationCost,
                      humanityLoss: g.humanityLoss,
                    })),
                    graftTotals,
                    mutationLevel,
                    humanity,
                    currentHp,
                    maxHp,
                    activeGameId: character.activeGameId,
                    activeGameCode,
                    totals,
                  },
                  null,
                  2
                )}
              </div>
            </div>
          </details>
        </div>

        <aside
          style={{
            position: "sticky",
            top: 16,
            display: "grid",
            gap: 20,
          }}
        >
          <SectionCard
            title="Character Summary"
            sub="A quick-read overview for players and GMs."
            badge="Preview"
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div className="wt-item">
                <div className="wt-kicker">Name</div>
                <div className="wt-itemName">{character.name}</div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Race</div>
                <div className="wt-itemName">{character.raceName || "Unassigned"}</div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Class</div>
                <div className="wt-itemName">{character.className}</div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Current Session</div>
                <div className="wt-itemName">
                  {character.activeGameId ? activeGameCode || character.activeGameId : "None"}
                </div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Created</div>
                <div className="wt-itemName">{tsToText(character.createdAt)}</div>
              </div>

              <div className="wt-item">
                <div className="wt-kicker">Last Updated</div>
                <div className="wt-itemName">{tsToText(character.updatedAt)}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Stat Block"
            sub="Base + race + class + equipment + grafts"
            badge="Totals"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <StatTile label="ATT" value={totals.ATT} icon="Attack" />
              <StatTile label="TEC" value={totals.TEC} icon="Tech" />
              <StatTile label="DEF" value={totals.DEF} icon="Defense" />
              <StatTile label="CHA" value={totals.CHA} icon="Charisma" />
              <StatTile label="HEA" value={totals.HEA} icon="Health" />
              <StatTile label="Grafts" value={grafts.length} icon="Body" />
            </div>
          </SectionCard>

          <SectionCard
            title="Archetype Bonus"
            sub="Primary passive or class-defining feature."
            badge="Passive"
          >
            <div className="wt-item">
              <div className="wt-itemName">{character.classBonusName || character.bonusName || "—"}</div>
              <div className="wt-muted" style={{ fontSize: 12, lineHeight: 1.55, marginTop: 6 }}>
                {character.classBonusText || character.bonusText || "No bonus text."}
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>

      {showDebug ? (
        <div className="wt-debugDock">
          <div className="wt-debugInner">
            <div>
              <strong>Debug</strong> — character id: <span className="wt-muted">{String(id)}</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="wt-muted">Equipped: {equippedIds.join(", ") || "none"}</span>
              <button className="wt-btn" onClick={() => setShowDebug(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @media (max-width: 1180px) {
          div[style*="grid-template-columns: minmax(0, 1fr) 360px"] {
            grid-template-columns: 1fr !important;
          }

          aside[style*="position: sticky"] {
            position: static !important;
            top: auto !important;
          }
        }

        @media (max-width: 900px) {
          div[style*="grid-template-columns: 96px minmax(0, 1fr)"] {
            grid-template-columns: 1fr !important;
          }

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