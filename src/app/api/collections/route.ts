import { isAuthorized, unauthorized } from "@/lib/auth";
import { hasFilter, parseCollectionInput } from "@/lib/collection-input";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();
  const input = parseCollectionInput(await request.json().catch(() => ({})));
  if (!input.name) return Response.json({ error: "Give the group a name" }, { status: 400 });
  if (input.type === "smart" && !hasFilter(input.filter)) {
    return Response.json({ error: "Pick at least one thing to filter by" }, { status: 400 });
  }
  const [group] = await query<{ id: string }>(
    `insert into collections (name, type, filter) values ($1, $2, $3::jsonb) returning id`,
    [input.name, input.type, JSON.stringify(input.filter)],
  );
  return Response.json({ id: group.id }, { status: 201 });
}
