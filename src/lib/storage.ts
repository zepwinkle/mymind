import "server-only";
import { db, MEDIA_BUCKET } from "./supabase";
import type { Item, ItemView } from "./types";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/avif": "avif",
};

export async function uploadMedia(
  itemId: string,
  name: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const path = `${itemId}/${name}.${EXTENSIONS[contentType] ?? "img"}`;
  const { error } = await db().storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Could not store image: ${error.message}`);
  return path;
}

export async function downloadMedia(path: string): Promise<{ bytes: Uint8Array; contentType: string } | undefined> {
  const { data, error } = await db().storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) return undefined;
  return { bytes: new Uint8Array(await data.arrayBuffer()), contentType: data.type };
}

export async function deleteMediaFolder(itemId: string): Promise<void> {
  const bucket = db().storage.from(MEDIA_BUCKET);
  const { data } = await bucket.list(itemId);
  if (data?.length) await bucket.remove(data.map((f) => `${itemId}/${f.name}`));
}

/** Adds a signed (temporary) thumbnail URL to each item. */
export async function withThumbnails(items: Item[]): Promise<ItemView[]> {
  const paths = [...new Set(items.map((i) => i.thumbnail_path).filter((p): p is string => !!p))];
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await db().storage.from(MEDIA_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
    }
  }
  return items.map((i) => ({ ...i, thumbnail_url: i.thumbnail_path ? urls.get(i.thumbnail_path) ?? null : null }));
}
