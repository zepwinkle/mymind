import { isAuthorized, unauthorized } from "@/lib/auth";
import { parseCollectionInput } from "@/lib/collection-input";
import { db } from "@/lib/supabase";

export async function PATCH(request: Request, ctx: RouteContext<"/api/collections/[id]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const { data: existing } = await db().from("collections").select("type").eq("id", id).maybeSingle();
  if (!existing) return Response.json({ error: "Group not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const input = parseCollectionInput({ ...body, type: existing.type });
  if (!input.name) return Response.json({ error: "Give the group a name" }, { status: 400 });
  if (input.type === "smart" && !Object.keys(input.filter).length) {
    return Response.json({ error: "Pick at least one category, tag or word to filter by" }, { status: 400 });
  }
  const { error } = await db().from("collections").update({ name: input.name, filter: input.filter }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/collections/[id]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  const { error } = await db().from("collections").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
