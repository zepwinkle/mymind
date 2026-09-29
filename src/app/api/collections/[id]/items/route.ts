import { isAuthorized, unauthorized } from "@/lib/auth";
import { db } from "@/lib/supabase";

async function readItemId(request: Request): Promise<string | undefined> {
  const body = await request.json().catch(() => ({}));
  return typeof body.itemId === "string" ? body.itemId : undefined;
}

/** Add an item to a hand-picked group. */
export async function POST(request: Request, ctx: RouteContext<"/api/collections/[id]/items">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const itemId = await readItemId(request);
  if (!itemId) return Response.json({ error: "itemId is required" }, { status: 400 });
  const { error } = await db()
    .from("collection_items")
    .upsert({ collection_id: id, item_id: itemId }, { ignoreDuplicates: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

/** Remove an item from a hand-picked group. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/collections/[id]/items">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const itemId = await readItemId(request);
  if (!itemId) return Response.json({ error: "itemId is required" }, { status: 400 });
  const { error } = await db().from("collection_items").delete().eq("collection_id", id).eq("item_id", itemId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
