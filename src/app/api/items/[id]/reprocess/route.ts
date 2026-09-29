import { after } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { processItem } from "@/lib/ingest";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

/** Re-read the link and re-run the AI (e.g. after adding a note or screenshot). */
export async function POST(request: Request, ctx: RouteContext<"/api/items/[id]/reprocess">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const { error } = await db().from("items").update({ status: "processing", error: null }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  after(() => processItem(id, { refetch: true }));
  return Response.json({ ok: true });
}
