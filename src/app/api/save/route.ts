import { isAuthorized, unauthorized } from "@/lib/auth";
import { startProcessing } from "@/lib/background";
import { detectSource, extractUrl } from "@/lib/link-preview";
import { uploadMedia } from "@/lib/storage";
import { query } from "@/lib/db";
import { updateItem } from "@/lib/items";

// Only used when the background function isn't available (local development).
export const maxDuration = 60;

// Netlify functions accept request bodies up to about 4.5 MB of binary data.
const MAX_UPLOAD_BYTES = 4_400_000;

/**
 * Save something. Used by the web app and the iPhone Shortcut.
 * Accepts multipart form data or JSON with any of:
 *   url   – a link (or share-sheet text containing a link)
 *   note  – your own words about it
 *   image – a screenshot/photo file (form data only)
 */
export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  let rawUrl = "";
  let note = "";
  let image: File | undefined;

  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      rawUrl = String(form.get("url") ?? "");
      note = String(form.get("note") ?? "");
      const file = form.get("image");
      if (file instanceof File && file.size > 0) image = file;
    } else {
      const body = await request.json();
      rawUrl = String(body.url ?? "");
      note = String(body.note ?? "");
    }
  } catch {
    return Response.json({ error: "Couldn't read the request" }, { status: 400 });
  }

  const url = extractUrl(rawUrl);
  // If the "link" field held plain text with no link, keep it as part of the note.
  if (!url && rawUrl.trim()) note = [rawUrl.trim(), note.trim()].filter(Boolean).join("\n\n");
  note = note.trim().slice(0, 10_000);

  if (image && (image.size > MAX_UPLOAD_BYTES || !image.type.startsWith("image/"))) {
    return Response.json({ error: "Images must be under 4 MB. Try a smaller screenshot." }, { status: 400 });
  }
  if (!url && !image && !note) {
    return Response.json({ error: "Send a link, an image or a note" }, { status: 400 });
  }

  const [item] = await query<{ id: string }>(
    `insert into items (url, note, source, status) values ($1, $2, $3, 'processing') returning id`,
    [url ?? null, note || null, url ? detectSource(url) : image ? "image" : "note"],
  );

  if (image) {
    try {
      const path = await uploadMedia(item.id, "screenshot", new Uint8Array(await image.arrayBuffer()), image.type);
      await updateItem(item.id, { thumbnail_path: path });
    } catch (err) {
      await query(`delete from items where id = $1`, [item.id]);
      return Response.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
    }
  }

  await startProcessing(item.id);
  return Response.json({ id: item.id, message: "Saved to mymind" }, { status: 201 });
}
