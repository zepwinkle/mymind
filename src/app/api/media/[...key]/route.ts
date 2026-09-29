import { isAuthorized, unauthorized } from "@/lib/auth";
import { downloadMedia } from "@/lib/storage";

/** Serves a stored thumbnail/screenshot to a signed-in browser. */
export async function GET(request: Request, ctx: RouteContext<"/api/media/[...key]">) {
  if (!(await isAuthorized(request))) return unauthorized();
  const { key } = await ctx.params;
  const file = await downloadMedia(key.join("/"));
  if (!file || !file.contentType.startsWith("image/")) return new Response("Not found", { status: 404 });
  return new Response(file.bytes as BodyInit, {
    headers: {
      "content-type": file.contentType,
      "cache-control": "private, max-age=604800",
      "x-content-type-options": "nosniff",
    },
  });
}
