import { after } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { processItem } from "@/lib/ingest";
import { detectSource, extractUrl } from "@/lib/link-preview";
import { uploadMedia } from "@/lib/storage";
import { db } from "@/lib/supabase";

// Background scraping + AI tagging runs after the response, within this limit.
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 12_000_000;

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
    return Response.json({ error: "Images must be under 12 MB" }, { status: 400 });
  }
  if (!url && !image && !note) {
    return Response.json({ error: "Send a link, an image or a note" }, { status: 400 });
  }

  const { data: item, error } = await db()
    .from("items")
    .insert({
      url: url ?? null,
      note: note || null,
      source: url ? detectSource(url) : image ? "image" : "note",
      status: "processing",
    })
    .select("id")
    .single();
  if (error || !item) return Response.json({ error: error?.message ?? "Save failed" }, { status: 500 });

  if (image) {
    try {
      const path = await uploadMedia(item.id, "screenshot", new Uint8Array(await image.arrayBuffer()), image.type);
      await db().from("items").update({ thumbnail_path: path }).eq("id", item.id);
    } catch (err) {
      await db().from("items").delete().eq("id", item.id);
      return Response.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
    }
  }

  after(() => processItem(item.id));
  return Response.json({ id: item.id, message: "Saved to mymind" }, { status: 201 });
}
