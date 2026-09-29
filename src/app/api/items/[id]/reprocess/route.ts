import { after } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { processItem } from "@/lib/ingest";
import { isUuid, updateItem } from "@/lib/items";

export const maxDuration = 60;

/** Re-read the link and re-run the AI (e.g. after adding a note or screenshot). */
export async function POST(request: Request, ctx: RouteContext<"/api/items/[id]/reprocess">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found" }, { status: 404 });
  await updateItem(id, { status: "processing", error: null });
  after(() => processItem(id, { refetch: true }));
  return Response.json({ ok: true });
}
