import "server-only";
import { aiEnabled, tagItem } from "./ai";
import { downloadImage, fetchLinkPreview } from "./fetch-preview";
import { downloadMedia, uploadMedia } from "./storage";
import { query } from "./db";
import { updateItem } from "./items";
import type { Item } from "./types";

const MAX_EXTRA_IMAGES = 19;
const MAX_AI_IMAGES = 4;

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Fills in a saved item: scrapes the link preview, stores a thumbnail copy (platform
 * image links expire), then asks Claude for a title, category, tags and summary.
 * Runs in the background after the save request has already returned.
 */
export async function processItem(id: string, { refetch = false } = {}): Promise<void> {
  const [item] = await query<Item>(`select * from items where id = $1`, [id]);
  if (!item) return;

  const patch: Partial<Item> = {};
  const problems: string[] = [];

  try {
    if (item.url && (refetch || (!item.caption && !item.thumbnail_path))) {
      const preview = await fetchLinkPreview(item.url);
      patch.url = preview.url;
      patch.source = preview.source;
      const caption = [preview.title, preview.description].filter(Boolean).join("\n\n");
      if (caption) patch.caption = caption;
      if (preview.author) patch.author = preview.author;

      const imageUrls = preview.images?.length ? preview.images : preview.imageUrl ? [preview.imageUrl] : [];
      if (!item.thumbnail_path && imageUrls[0]) {
        try {
          const image = await downloadImage(imageUrls[0]);
          if (image) patch.thumbnail_path = await uploadMedia(id, "thumbnail", image.bytes, image.contentType);
        } catch (err) {
          problems.push(`Couldn't save the thumbnail: ${message(err)}`);
        }
      }
      // Carousels: keep a copy of every other slide too (links to them expire).
      if (!item.media_paths?.length && imageUrls.length > 1) {
        const extras = await Promise.all(
          imageUrls.slice(1, MAX_EXTRA_IMAGES + 1).map(async (src, i) => {
            try {
              const image = await downloadImage(src);
              return image ? await uploadMedia(id, `image-${i + 2}`, image.bytes, image.contentType) : undefined;
            } catch {
              return undefined;
            }
          }),
        );
        const saved = extras.filter((p): p is string => Boolean(p));
        if (saved.length) patch.media_paths = saved;
      }
      if (!caption && !patch.thumbnail_path && !item.thumbnail_path) {
        problems.push("Couldn't read this link (the site may need a login). Add a screenshot or a note.");
      }
    }

    const current = { ...item, ...patch };
    if (!aiEnabled()) {
      problems.push("AI tagging is off: set ANTHROPIC_API_KEY.");
    } else if (current.caption || current.note || current.thumbnail_path) {
      // Show the AI the cover plus the first few slides of a carousel.
      const keys = [current.thumbnail_path, ...(current.media_paths ?? [])].filter((k): k is string => Boolean(k));
      const images = (await Promise.all(keys.slice(0, MAX_AI_IMAGES).map(downloadMedia))).filter(
        (img): img is NonNullable<typeof img> => Boolean(img),
      );
      const tagged = await tagItem({
        source: current.source,
        url: current.url,
        caption: current.caption,
        author: current.author,
        note: current.note,
        images,
      });
      Object.assign(patch, tagged);
    }

    patch.status = "ready";
    patch.error = problems.length ? problems.join(" ") : null;
  } catch (err) {
    console.error(`processItem ${id} failed`, err);
    patch.status = "failed";
    patch.error = [...problems, message(err)].join(" ");
  }

  try {
    await updateItem(id, patch);
  } catch (err) {
    console.error(`processItem ${id}: could not save`, err);
  }
}
