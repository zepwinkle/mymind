import "server-only";
import {
  cleanPreview,
  detectSource,
  oembedEndpoint,
  previewFromHtml,
  previewFromOembed,
  type LinkPreview,
} from "./link-preview";

const BROWSER_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
// Instagram only shows preview tags to link-preview crawlers, not to browsers.
const CRAWLER_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

const MAX_HTML_BYTES = 2_000_000;
const MAX_IMAGE_BYTES = 15_000_000;

async function readLimited(res: Response, limit: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const out = new Uint8Array(Math.min(total, limit));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, out.length - offset);
    out.set(part, offset);
    offset += part.length;
    if (offset >= out.length) break;
  }
  return out;
}

function assertHttp(url: string) {
  const { protocol } = new URL(url);
  if (protocol !== "http:" && protocol !== "https:") throw new Error("Only http(s) links can be saved");
}

/**
 * Fetches everything we can learn about a link without logging in: the page's
 * preview tags, plus the platform's oEmbed data where it offers it (TikTok, YouTube).
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  assertHttp(url);
  const source = detectSource(url);
  let preview: LinkPreview = { url, source };

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": source === "instagram" ? CRAWLER_UA : BROWSER_UA,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en",
      },
      signal: AbortSignal.timeout(12_000),
    });
    // Short links (vm.tiktok.com, pin.it) redirect to the real post.
    const finalUrl = res.url || url;
    preview = { ...preview, url: finalUrl };
    if (res.ok && (res.headers.get("content-type") ?? "").includes("html")) {
      const html = new TextDecoder().decode(await readLimited(res, MAX_HTML_BYTES));
      preview = previewFromHtml(finalUrl, source, html);
    } else {
      await res.body?.cancel().catch(() => {});
    }
  } catch {
    // Keep going: oEmbed may still work even when the page itself blocks us.
  }

  const endpoint = oembedEndpoint(preview.url, source);
  if (endpoint) {
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const fromOembed = previewFromOembed(preview.url, source, await res.json());
        preview = {
          ...preview,
          ...Object.fromEntries(Object.entries(fromOembed).filter(([, v]) => v !== undefined)),
        };
      }
    } catch {
      // Ignore; fall back to whatever the page gave us.
    }
  }

  return cleanPreview(preview);
}

export interface DownloadedImage {
  bytes: Uint8Array;
  contentType: string;
}

export async function downloadImage(url: string): Promise<DownloadedImage | undefined> {
  assertHttp(url);
  const res = await fetch(url, {
    headers: { "user-agent": BROWSER_UA, accept: "image/*" },
    signal: AbortSignal.timeout(15_000),
  });
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!res.ok || !contentType.startsWith("image/")) {
    await res.body?.cancel().catch(() => {});
    return undefined;
  }
  const bytes = await readLimited(res, MAX_IMAGE_BYTES + 1);
  if (bytes.byteLength > MAX_IMAGE_BYTES) return undefined;
  return { bytes, contentType };
}
