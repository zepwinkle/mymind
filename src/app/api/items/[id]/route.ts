import { isAuthorized, unauthorized } from "@/lib/auth";
import { normalizeTags } from "@/lib/ai";
import { deleteMediaFolder } from "@/lib/storage";
import { db } from "@/lib/supabase";
import { KINDS } from "@/lib/types";

/** Edit an item's note, title, tags or category. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/items/[id]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body.note === "string") patch.note = body.note.trim().slice(0, 10_000) || null;
  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 200) || null;
  if (Array.isArray(body.tags)) patch.tags = normalizeTags(body.tags.map(String));
  if (typeof body.kind === "string" && (KINDS as readonly string[]).includes(body.kind)) patch.kind = body.kind;
  if (!Object.keys(patch).length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await db().from("items").update(patch).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/items/[id]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const { error } = await db().from("items").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await deleteMediaFolder(id).catch(() => {});
  return Response.json({ ok: true });
}
