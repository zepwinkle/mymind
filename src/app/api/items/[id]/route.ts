import { isAuthorized, unauthorized } from "@/lib/auth";
import { normalizeTags } from "@/lib/ai";
import { deleteMediaFolder } from "@/lib/storage";
import { query } from "@/lib/db";
import { isUuid, updateItem } from "@/lib/items";
import { KINDS } from "@/lib/types";

/** Edit an item's note, title, tags, category or completed state. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/items/[id]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body.note === "string") patch.note = body.note.trim().slice(0, 10_000) || null;
  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 200) || null;
  if (Array.isArray(body.tags)) patch.tags = normalizeTags(body.tags.map(String));
  if (typeof body.completed === "boolean") patch.completed_at = body.completed ? new Date().toISOString() : null;
  if (typeof body.kind === "string" && (KINDS as readonly string[]).includes(body.kind)) patch.kind = body.kind;
  if (!Object.keys(patch).length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  await updateItem(id, patch);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/items/[id]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found" }, { status: 404 });
  await query(`delete from items where id = $1`, [id]);
  await deleteMediaFolder(id).catch(() => {});
  return Response.json({ ok: true });
}
