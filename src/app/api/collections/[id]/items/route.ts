import { isAuthorized, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";
import { isUuid } from "@/lib/items";

async function readItemId(request: Request): Promise<string | undefined> {
  const body = await request.json().catch(() => ({}));
  return isUuid(body.itemId) ? body.itemId : undefined;
}

/** Add an item to a hand-picked group. */
export async function POST(request: Request, ctx: RouteContext<"/api/collections/[id]/items">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const itemId = await readItemId(request);
  if (!itemId) return Response.json({ error: "itemId is required" }, { status: 400 });
  if (!isUuid(id)) return Response.json({ error: "Group not found" }, { status: 404 });
  const [found] = await query(
    `select 1 from collections c, items i where c.id = $1 and c.type = 'manual' and i.id = $2`,
    [id, itemId],
  );
  if (!found) return Response.json({ error: "Group or item not found" }, { status: 404 });
  await query(`insert into collection_items (collection_id, item_id) values ($1, $2) on conflict do nothing`, [id, itemId]);
  return Response.json({ ok: true });
}

/** Remove an item from a hand-picked group. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/collections/[id]/items">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const itemId = await readItemId(request);
  if (!itemId) return Response.json({ error: "itemId is required" }, { status: 400 });
  if (!isUuid(id)) return Response.json({ error: "Group not found" }, { status: 404 });
  await query(`delete from collection_items where collection_id = $1 and item_id = $2`, [id, itemId]);
  return Response.json({ ok: true });
}
