// Background function: reads a saved link, stores its images and tags it with AI.
// Netlify replies 202 straight away and lets this run to completion (up to 15 minutes),
// so saves from the iPhone Shortcut get processed even when the app isn't open.
import { isInternalRequest } from "../../src/lib/auth";
import { processItem } from "../../src/lib/ingest";

export default async function processItemInBackground(request: Request) {
  if (!(await isInternalRequest(request))) return new Response("Forbidden", { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Bad item id", { status: 400 });
  }
  await processItem(id, { refetch: body.refetch === true });
  return new Response("Done");
}

export const config = { background: true };
