"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { isGmAllowedEmail } from "@/lib/wildtech/access";
import {
  DEFAULT_SECTOR_STATUS,
  HUB_ID,
  SECTOR_CONNECTIONS,
  SECTOR_DEFS,
  SECTOR_STATUS_META,
  TRAVEL_STATIONS,
  getSectorDef,
  otherSector,
  stationsForSector,
  type SectorStatus,
} from "@/lib/wildtech/campaignMap";

const CAMPAIGN_DOC_PATH = ["campaignMaps", "sanctuary"] as const;

type CampaignMapDoc = {
  sectorStatuses?: Record<string, SectorStatus>;
  travelStations?: Record<string, boolean>;
};

// Layout math: sectors sit on a ring at RADIUS around the (50, 50) center. Angle 0 is the
// top (12 o'clock) and increases clockwise, matching the Sanctuary Campaign map art.
const RADIUS = 36;
const RING_IDS = SECTOR_DEFS.filter((s) => !s.isHub).map((s) => s.id);

function getPosition(sectorId: string): { x: number; y: number } {
  if (sectorId === HUB_ID) return { x: 50, y: 50 };
  const index = RING_IDS.indexOf(sectorId);
  const angle = ((index * 360) / RING_IDS.length) * (Math.PI / 180);
  return {
    x: 50 + RADIUS * Math.sin(angle),
    y: 50 - RADIUS * Math.cos(angle),
  };
}

// Stations sit as waypoints along the line, not stacked at the midpoint: Sector A -> Station 1 -> Station 2 -> Sector B.
function getStationPosition(a: string, b: string, slot: 1 | 2) {
  const pa = getPosition(a);
  const pb = getPosition(b);
  const t = slot === 1 ? 1 / 3 : 2 / 3;
  return {
    x: pa.x + (pb.x - pa.x) * t,
    y: pa.y + (pb.y - pa.y) * t,
  };
}

export default function CampaignMapPage() {
  const { user, loading } = useAuth();
  const isGm = !!user?.email && isGmAllowedEmail(user.email);

  const [sectorStatuses, setSectorStatuses] = useState<Record<string, SectorStatus>>({});
  const [travelStations, setTravelStations] = useState<Record<string, boolean>>({});
  const [selectedSectorId, setSelectedSectorId] = useState<string>(HUB_ID);
  const [busyKey, setBusyKey] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    const ref = doc(db, ...CAMPAIGN_DOC_PATH);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.data() as CampaignMapDoc) || {};
        setSectorStatuses(data.sectorStatuses || {});
        setTravelStations(data.travelStations || {});
      },
      (err) => {
        console.error("[Campaign Map] snapshot failed", err);
        setError(err?.message || "Failed to load the campaign map.");
      }
    );
    return () => unsubscribe();
  }, []);

  function getStatus(sectorId: string): SectorStatus {
    return sectorStatuses[sectorId] || DEFAULT_SECTOR_STATUS;
  }

  function isLocked(stationId: string): boolean {
    return travelStations[stationId] ?? true;
  }

  async function setSectorStatus(sectorId: string, status: SectorStatus) {
    setBusyKey(`sector-${sectorId}`);
    setError("");
    try {
      await setDoc(
        doc(db, ...CAMPAIGN_DOC_PATH),
        { sectorStatuses: { [sectorId]: status } },
        { merge: true }
      );
    } catch (err: any) {
      console.error("[Campaign Map] setSectorStatus failed", err);
      setError(err?.message || "Failed to update sector status.");
    } finally {
      setBusyKey("");
    }
  }

  async function toggleStation(stationId: string) {
    const next = !isLocked(stationId);
    setBusyKey(`station-${stationId}`);
    setError("");
    try {
      await setDoc(
        doc(db, ...CAMPAIGN_DOC_PATH),
        { travelStations: { [stationId]: next } },
        { merge: true }
      );
    } catch (err: any) {
      console.error("[Campaign Map] toggleStation failed", err);
      setError(err?.message || "Failed to update travel station.");
    } finally {
      setBusyKey("");
    }
  }

  const selectedSector = getSectorDef(selectedSectorId);
  const selectedStations = useMemo(() => stationsForSector(selectedSectorId), [selectedSectorId]);

  if (loading) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardBody">Loading campaign map…</div>
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
            "radial-gradient(circle at 14% 18%, rgba(168,85,247,0.18), transparent 26%), radial-gradient(circle at 85% 22%, rgba(211,138,43,0.12), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08)), var(--wt-card)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1, padding: 24, display: "grid", gap: 14 }}>
          <div className="wt-badge wt-badgeAccent" style={{ width: "fit-content" }}>
            Sanctuary Campaign
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 950, lineHeight: 0.98 }}>
              Regulate the Land. Rebuild Life.
            </div>
            <div className="wt-muted" style={{ maxWidth: 920, fontSize: 14, lineHeight: 1.6 }}>
              A shared, persistent map of the Sanctuary campaign. Sector status and travel station locks
              update live for everyone, GM or player.
              {!isGm ? " Only your GM can change sector status or lock/unlock travel stations." : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/dashboard" className="wt-btn wt-btnPrimary">
              Back to Dashboard
            </Link>
            {isGm ? (
              <Link href="/gm" className="wt-btn">
                GM Dashboard
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <section className="wt-card" style={{ marginTop: 18, borderColor: "rgba(239,68,68,0.35)" }}>
          <div className="wt-cardBody">
            <div className="wt-itemName" style={{ color: "#fecaca" }}>
              {error}
            </div>
          </div>
        </section>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 20, marginTop: 18 }}>
        <section className="wt-card" style={{ padding: 20 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 1",
              maxWidth: 640,
              margin: "0 auto",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            >
              {SECTOR_CONNECTIONS.map((conn, i) => {
                const pa = getPosition(conn.a);
                const pb = getPosition(conn.b);
                return (
                  <line
                    key={i}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={0.6}
                  />
                );
              })}
            </svg>

            {SECTOR_DEFS.map((sector) => {
              const pos = getPosition(sector.id);
              const status = getStatus(sector.id);
              const statusMeta = SECTOR_STATUS_META[status];
              const isSelected = selectedSectorId === sector.id;

              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => setSelectedSectorId(sector.id)}
                  title={sector.name}
                  style={{
                    position: "absolute",
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: sector.isHub ? "26%" : "19%",
                    aspectRatio: "1 / 1",
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    background: sector.isHub
                      ? `radial-gradient(circle at 50% 35%, ${sector.color}99, ${sector.color}33 55%, rgba(6,8,14,0.95) 100%)`
                      : isSelected
                      ? `linear-gradient(160deg, ${sector.color}55, ${sector.color}22)`
                      : `linear-gradient(160deg, ${sector.color}33, rgba(10,12,20,0.85))`,
                    border: `2px solid ${
                      sector.isHub ? sector.color : isSelected ? sector.color : "rgba(255,255,255,0.14)"
                    }`,
                    boxShadow: sector.isHub
                      ? `0 0 24px 4px ${sector.color}66, inset 0 0 18px ${sector.color}55`
                      : isSelected
                      ? `0 0 12px 2px ${sector.color}55`
                      : "none",
                    display: "grid",
                    placeItems: "center",
                    gap: 3,
                    cursor: "pointer",
                    padding: 4,
                    zIndex: isSelected || sector.isHub ? 2 : 1,
                  }}
                >
                  <span style={{ fontSize: sector.isHub ? 26 : 18, lineHeight: 1 }}>{sector.icon}</span>
                  <span
                    style={{
                      fontSize: sector.isHub ? 12 : 10,
                      fontWeight: 800,
                      color: "var(--wt-text)",
                      textAlign: "center",
                      lineHeight: 1.15,
                      textShadow: sector.isHub ? `0 0 10px ${sector.color}` : "none",
                    }}
                  >
                    {sector.number != null ? `${sector.number}. ` : ""}
                    {sector.name}
                  </span>
                  {!sector.isHub ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 8,
                        fontWeight: 700,
                        color: "var(--wt-text)",
                        background: `${statusMeta.color}2e`,
                        border: `1px solid ${statusMeta.color}`,
                        borderRadius: 999,
                        padding: "1px 6px",
                        whiteSpace: "nowrap",
                        lineHeight: 1.4,
                      }}
                    >
                      <span>{statusMeta.icon}</span>
                      <span>{statusMeta.shortLabel}</span>
                    </span>
                  ) : null}
                </button>
              );
            })}

            {TRAVEL_STATIONS.map((station) => {
              const pos = getStationPosition(station.a, station.b, station.slot);
              const locked = isLocked(station.id);
              const relevant = station.a === selectedSectorId || station.b === selectedSectorId;

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => (isGm ? toggleStation(station.id) : undefined)}
                  title={`${getSectorDef(station.a)?.name} ↔ ${getSectorDef(station.b)?.name} (station ${station.slot}) — ${
                    locked ? "Locked" : "Unlocked"
                  }`}
                  disabled={!isGm || busyKey === `station-${station.id}`}
                  style={{
                    position: "absolute",
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: 16,
                    height: 16,
                    borderRadius: "999px",
                    border: `1px solid ${relevant ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)"}`,
                    background: locked ? "rgba(239,68,68,0.85)" : "rgba(34,197,94,0.85)",
                    cursor: isGm ? "pointer" : "default",
                    padding: 0,
                    zIndex: 1,
                  }}
                />
              );
            })}
          </div>

          <div className="wt-chipRow" style={{ marginTop: 16, justifyContent: "center" }}>
            {(Object.keys(SECTOR_STATUS_META) as SectorStatus[]).map((status) => (
              <span key={status} className="wt-chip">
                <span style={{ marginRight: 5 }}>{SECTOR_STATUS_META[status].icon}</span>
                {SECTOR_STATUS_META[status].label}
              </span>
            ))}
            <span className="wt-chip">
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "999px",
                  background: "rgba(34,197,94,0.85)",
                  marginRight: 6,
                }}
              />
              Station Unlocked
            </span>
            <span className="wt-chip">
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "999px",
                  background: "rgba(239,68,68,0.85)",
                  marginRight: 6,
                }}
              />
              Station Locked
            </span>
          </div>
        </section>

        <section className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">{selectedSector?.name ?? "Select a sector"}</div>
            <div className="wt-cardSub">
              {selectedSector?.isHub
                ? "Central hub. Connects to every outer sector."
                : `Sector ${selectedSector?.number ?? "?"}`}
            </div>
          </div>

          <div className="wt-cardBody" style={{ display: "grid", gap: 14 }}>
            {selectedSector && !selectedSector.isHub ? (
              <div className="wt-item">
                <div className="wt-kicker">Status</div>
                <div className="wt-itemName" style={{ marginBottom: isGm ? 10 : 0 }}>
                  {SECTOR_STATUS_META[getStatus(selectedSector.id)].icon}{" "}
                  {SECTOR_STATUS_META[getStatus(selectedSector.id)].label}
                </div>

                {isGm ? (
                  <div className="wt-chipRow">
                    {(Object.keys(SECTOR_STATUS_META) as SectorStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={
                          getStatus(selectedSector.id) === status
                            ? "wt-btn wt-btnPrimary wt-btnSmall"
                            : "wt-btn wt-btnSmall"
                        }
                        onClick={() => setSectorStatus(selectedSector.id, status)}
                        disabled={busyKey === `sector-${selectedSector.id}`}
                      >
                        {SECTOR_STATUS_META[status].icon} {SECTOR_STATUS_META[status].label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="wt-item">
              <div className="wt-kicker">Travel Stations</div>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {selectedStations.length === 0 ? (
                  <div className="wt-muted" style={{ fontSize: 12 }}>
                    No connections.
                  </div>
                ) : (
                  selectedStations.map((station) => {
                    const destination = getSectorDef(otherSector(station, selectedSectorId));
                    const locked = isLocked(station.id);

                    return (
                      <div key={station.id} className="wt-item">
                        <div className="wt-itemTop">
                          <div>
                            <div className="wt-itemName">
                              To {destination?.name} — Station {station.slot}
                            </div>
                          </div>
                          {isGm ? (
                            <button
                              type="button"
                              className="wt-btn wt-btnSmall"
                              onClick={() => toggleStation(station.id)}
                              disabled={busyKey === `station-${station.id}`}
                            >
                              {locked ? "Unlock" : "Lock"}
                            </button>
                          ) : (
                            <span className="wt-tag">{locked ? "Locked" : "Unlocked"}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1.3fr 0.9fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
