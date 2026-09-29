import "server-only";
import { getStore } from "@netlify/blobs";
import type { Item, ItemView } from "./types";

// Thumbnails and screenshots live in a private Netlify Blobs store. The browser
// fetches them through /api/media/…, which checks you're signed in.
function media() {
  return getStore({ name: "media", consistency: "strong" });
}

export async function uploadMedia(
  itemId: string,
  name: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const key = `${itemId}/${name}`;
  await media().set(key, new Blob([bytes as BlobPart], { type: contentType }), { metadata: { contentType } });
  return key;
}

export async function downloadMedia(key: string): Promise<{ bytes: Uint8Array; contentType: string } | undefined> {
  const entry = await media().getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry) return undefined;
  const contentType = typeof entry.metadata.contentType === "string" ? entry.metadata.contentType : "application/octet-stream";
  return { bytes: new Uint8Array(entry.data), contentType };
}

export async function deleteMediaFolder(itemId: string): Promise<void> {
  const store = media();
  const { blobs } = await store.list({ prefix: `${itemId}/` });
  await Promise.all(blobs.map((b) => store.delete(b.key)));
}

/** Adds the URL the browser should use for each item's thumbnail. */
export async function withThumbnails(items: Item[]): Promise<ItemView[]> {
  return items.map((i) => ({
    ...i,
    // The version param changes whenever the item changes, so browsers can cache images safely.
    thumbnail_url: i.thumbnail_path
      ? `/api/media/${i.thumbnail_path.split("/").map(encodeURIComponent).join("/")}?v=${Date.parse(i.updated_at) || 0}`
      : null,
  }));
}
