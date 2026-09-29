import { isAuthorized, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";
import { isUuid, updateItem } from "@/lib/items";
import { deleteMedia, uploadMedia } from "@/lib/storage";

// Netlify functions accept request bodies up to about 4.5 MB of binary data.
const MAX_UPLOAD_BYTES = 4_400_000;

/** Replace an item's thumbnail with a picture you choose. */
export async function POST(request: Request, ctx: RouteContext<"/api/items/[id]/image">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const [item] = await query<{ thumbnail_path: string | null; media_paths: string[] }>(
    `select thumbnail_path, media_paths from items where id = $1`,
    [id],
  );
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData().catch(() => undefined);
  const image = form?.get("image");
  if (!(image instanceof File) || image.size === 0 || !image.type.startsWith("image/")) {
    return Response.json({ error: "Choose a picture to use" }, { status: 400 });
  }
  if (image.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "Images must be under 4 MB. Try a smaller picture." }, { status: 400 });
  }

  // A fresh key each time, so no browser keeps showing the old picture.
  const path = await uploadMedia(id, `cover-${Date.now()}`, new Uint8Array(await image.arrayBuffer()), image.type);
  const old = item.thumbnail_path;
  if (old && item.media_paths?.length) {
    // Carousel: keep the old cover as the first slide rather than losing it.
    await updateItem(id, { thumbnail_path: path, media_paths: [old, ...item.media_paths] });
  } else {
    await updateItem(id, { thumbnail_path: path });
    if (old) await deleteMedia(old).catch(() => {});
  }
  return Response.json({ ok: true });
}
