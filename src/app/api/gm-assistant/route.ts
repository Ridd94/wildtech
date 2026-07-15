import Anthropic from "@anthropic-ai/sdk";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isGmAllowedEmail } from "@/lib/wildtech/access";
import {
  GM_ASSISTANT_TOOLS,
  GRAFT_ID_NAME_CATALOG,
  PRESET_ITEM_CATALOG,
  executeGmAssistantTool,
  type JoinedCharacter,
} from "@/lib/wildtech/gmAssistantTools";

export const runtime = "nodejs";

const MAX_TOOL_ITERATIONS = 6;

type ChatTurn = { role: "user" | "assistant"; content: string };

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
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const history: ChatTurn[] = Array.isArray(body?.history) ? body.history : [];

  if (!message || !gameId) {
    return Response.json({ error: "message and gameId are required." }, { status: 400 });
  }

  const gameSnap = await adminDb.collection("games").doc(gameId).get();
  if (!gameSnap.exists) {
    return Response.json({ error: "Game not found." }, { status: 404 });
  }

  const game = gameSnap.data() as { gmId?: string; code?: string; scrapAmount?: number };
  if (game.gmId !== decoded.uid) {
    return Response.json({ error: "You do not GM this game." }, { status: 403 });
  }

  const gameContext = {
    id: gameId,
    scrapAmount: typeof game.scrapAmount === "number" ? game.scrapAmount : 0,
  };

  const charactersSnap = await adminDb.collection("characters").where("activeGameId", "==", gameId).get();
  const roster: JoinedCharacter[] = charactersSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<JoinedCharacter, "id">),
  }));

  if (roster.length === 0) {
    return Response.json({
      reply: "No players are currently in this session, so there's nothing for me to manage yet.",
      actions: [],
    });
  }

  const rosterLines = roster
    .map((c) => {
      const equipment = (c.equipment ?? []).join(", ") || "none";
      const grafts = (c.grafts ?? []).map((g) => g.name).join(", ") || "none";
      const unlocked = (c.availableGraftIds ?? []).join(", ") || "none";
      const knownBlueprints = (c.knownBlueprintIds ?? []).join(", ") || "none";
      const soulCharges = c.classId === "soul-slinger" ? `${c.soulCharges ?? 5}/5` : "n/a (not a Soul-Slinger)";
      return `- id: ${c.id} | name: ${c.name} | class: ${c.className ?? "unknown"} (classId: ${
        c.classId ?? "unknown"
      }) | HP: ${c.currentHp ?? 10}/${
        c.maxHp ?? 10
      } | mutation: ${c.mutationLevel ?? 0} | humanity: ${c.humanity ?? 10} | soul charges: ${soulCharges} | equipment: ${equipment} | installed grafts: ${grafts} | unlocked graft ids: ${unlocked} | known blueprint ids: ${knownBlueprints}`;
    })
    .join("\n");

  const itemCatalogLines = PRESET_ITEM_CATALOG.map((i) => `${i.id}: ${i.name}`).join("\n");
  const graftCatalogLines = GRAFT_ID_NAME_CATALOG.map((g) => `${g.id}: ${g.name}`).join("\n");

  const system = `You are the GM's assistant for a live WildTech tabletop session. Game code: ${game.code ?? "unknown"}. Party Scrap: ${gameContext.scrapAmount}/20.

Current players in this session (including what blueprints each already knows):
${rosterLines}

Preset item catalog (id: name):
${itemCatalogLines}

Graft catalog (id: name):
${graftCatalogLines}

Use the provided tools to carry out requests to change a player's health, items, grafts, or Soul Charges, to remove a player from the session, or to adjust the party's shared Scrap. Always resolve player names to the exact character "id" shown above before calling a tool — never invent an id. If a name is ambiguous (matches multiple players) or you can't find a match, ask a clarifying question instead of guessing. If a request is out of scope for your tools (e.g. ending or saving the game session), say so plainly rather than attempting it. Keep replies short and conversational.

Blueprints represent schematics the party has found. To reveal one, use "reveal_blueprint_to_party" with a blueprintId built from the graft or item catalogs above: "graft-<graftId>" for a graft blueprint (e.g. "graft-cybernetic-laser-eye") or "item-<itemId>" for an item blueprint (e.g. "item-gauss_rifle"). This always applies to every joined player at once, not a single character.

Use "add_custom_graft" when a GM describes a graft that isn't in the catalog above — it installs immediately on the target character, same as a real graft. Use "set_soul_charges" only for Soul-Slinger characters (check the "class" / "classId" field on the roster above first); it fails harmlessly if used on a non-Soul-Slinger. Use "adjust_party_scrap" for requests about the party's shared Scrap pool (0-20) — it always sets the absolute value, so compute the new total yourself from the current Party Scrap value above when the request is a relative change (e.g. "give the party 5 scrap"). Use "give_starter_kit_to_party" when a GM wants to re-equip or gear up everyone at once (e.g. "give everyone a basic kit") — it gives a knife, jacket, and med patch to every joined character who doesn't already have them.`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user", content: message },
  ];

  const client = new Anthropic();
  const actions: string[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1536,
        system,
        tools: GM_ASSISTANT_TOOLS as unknown as Anthropic.Tool[],
        messages,
      });
    } catch (err: any) {
      return Response.json({ error: err?.message || "Claude request failed." }, { status: 502 });
    }

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      const reply = textBlock && textBlock.type === "text" ? textBlock.text : "";
      return Response.json({ reply, actions });
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await executeGmAssistantTool(adminDb, roster, block.name, block.input, gameContext);
      if ("summary" in result) {
        actions.push(result.summary);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result.summary });
      } else {
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result.error, is_error: true });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return Response.json({
    reply: "That request needed more steps than I'm allowed to take at once — try breaking it into smaller requests.",
    actions,
  });
}
