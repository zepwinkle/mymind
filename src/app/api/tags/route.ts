import { isAuthorized, unauthorized } from "@/lib/auth";
import { cleanTagName, deleteMyTag, saveMyTag } from "@/lib/my-tags";

/** Add a tag of your own, or update its description. */
export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const name = cleanTagName(String(body.name ?? ""));
  if (!name) return Response.json({ error: "Give the tag a name" }, { status: 400 });
  const description = String(body.description ?? "").trim().slice(0, 300);
  await saveMyTag(name, description);
  return Response.json({ ok: true, name });
}

export async function DELETE(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const name = cleanTagName(String(body.name ?? ""));
  if (!name) return Response.json({ error: "Which tag?" }, { status: 400 });
  await deleteMyTag(name);
  return Response.json({ ok: true });
}
