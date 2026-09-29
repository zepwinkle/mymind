import { isAuthorized, unauthorized } from "@/lib/auth";
import { parseCollectionInput } from "@/lib/collection-input";
import { db } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();
  const input = parseCollectionInput(await request.json().catch(() => ({})));
  if (!input.name) return Response.json({ error: "Give the group a name" }, { status: 400 });
  if (input.type === "smart" && !Object.keys(input.filter).length) {
    return Response.json({ error: "Pick at least one category, tag or word to filter by" }, { status: 400 });
  }
  const { data, error } = await db().from("collections").insert(input).select("id").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id }, { status: 201 });
}
