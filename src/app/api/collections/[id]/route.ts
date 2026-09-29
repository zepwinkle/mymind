import { isAuthorized, unauthorized } from "@/lib/auth";
import { parseCollectionInput } from "@/lib/collection-input";
import { query } from "@/lib/db";
import { isUuid } from "@/lib/items";

export async function PATCH(request: Request, ctx: RouteContext<"/api/collections/[id]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const [existing] = isUuid(id) ? await query<{ type: string }>(`select type from collections where id = $1`, [id]) : [];
  if (!existing) return Response.json({ error: "Group not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const input = parseCollectionInput({ ...body, type: existing.type });
  if (!input.name) return Response.json({ error: "Give the group a name" }, { status: 400 });
  if (input.type === "smart" && !Object.keys(input.filter).length) {
    return Response.json({ error: "Pick at least one category, tag or word to filter by" }, { status: 400 });
  }
  await query(`update collections set name = $2, filter = $3::jsonb where id = $1`, [id, input.name, JSON.stringify(input.filter)]);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/collections/[id]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Group not found" }, { status: 404 });
  await query(`delete from collections where id = $1`, [id]);
  return Response.json({ ok: true });
}
