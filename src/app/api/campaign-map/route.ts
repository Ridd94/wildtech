import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isGmAllowedEmail } from "@/lib/wildtech/access";
import {
  SECTOR_STATUS_META,
  TRAVEL_STATIONS,
  getSectorDef,
  type SectorStatus,
} from "@/lib/wildtech/campaignMap";

export const runtime = "nodejs";

const CAMPAIGN_DOC_PATH = ["campaignMaps", "sanctuary"] as const;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!idToken) {
    return Response.json({ error: "Missing auth token." }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return Response.json({ error: "Invalid auth token." }, { status: 401 });
  }

  if (!isGmAllowedEmail(decoded.email)) {
    return Response.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const ref = adminDb.collection(CAMPAIGN_DOC_PATH[0]).doc(CAMPAIGN_DOC_PATH[1]);

  if (action === "set_sector_status") {
    const sector = getSectorDef(String(body?.sectorId));
    if (!sector || sector.isHub) {
      return Response.json({ error: "Unknown sector." }, { status: 400 });
    }
    const status = String(body?.status) as SectorStatus;
    if (!(status in SECTOR_STATUS_META)) {
      return Response.json({ error: "Unknown sector status." }, { status: 400 });
    }

    await ref.set({ sectorStatuses: { [sector.id]: status } }, { merge: true });
    return Response.json({ ok: true });
  }

  if (action === "set_travel_station_lock") {
    const station = TRAVEL_STATIONS.find((s) => s.id === body?.travelStationId);
    if (!station) {
      return Response.json({ error: "Unknown travel station." }, { status: 400 });
    }
    const locked = !!body?.locked;

    await ref.set({ travelStations: { [station.id]: locked } }, { merge: true });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}
