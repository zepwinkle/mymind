// Pure helpers for turning a shared link into a preview (title, caption, image).
// No project imports here so the tests can run with plain `node --test`.

export type Source =
  | "tiktok"
  | "instagram"
  | "pinterest"
  | "youtube"
  | "web"
  | "image"
  | "note";

export interface LinkPreview {
  url: string;
  source: Source;
  title?: string;
  description?: string;
  author?: string;
  imageUrl?: string;
}

export function detectSource(url: string): Source {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "web";
  }
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is("tiktok.com")) return "tiktok";
  if (is("instagram.com") || is("instagr.am")) return "instagram";
  if (is("pinterest.com") || is("pin.it") || /(^|\.)pinterest\.[a-z.]+$/.test(host)) return "pinterest";
  if (is("youtube.com") || is("youtu.be")) return "youtube";
  return "web";
}

/** Pulls the first http(s) URL out of text, since share sheets often send "Check this out! https://…". */
export function extractUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match?.[0].replace(/[),.!?]+$/, "");
}

/** Where to ask for a structured preview, for platforms that offer oEmbed without an API key. */
export function oembedEndpoint(url: string, source: Source): string | undefined {
  const encoded = encodeURIComponent(url);
  if (source === "tiktok") return `https://www.tiktok.com/oembed?url=${encoded}`;
  if (source === "youtube") return `https://www.youtube.com/oembed?format=json&url=${encoded}`;
  return undefined;
}

export function previewFromOembed(
  url: string,
  source: Source,
  data: Record<string, unknown>,
): LinkPreview {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    url,
    source,
    // TikTok puts the caption in "title"; YouTube puts the video title there.
    title: source === "tiktok" ? undefined : str(data.title),
    description: source === "tiktok" ? str(data.title) : undefined,
    author: str(data.author_name),
    imageUrl: str(data.thumbnail_url),
  };
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return attrs;
}

/** Reads Open Graph / Twitter / standard meta tags from a page's HTML. */
export function previewFromHtml(url: string, source: Source, html: string): LinkPreview {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = parseAttributes(tag);
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop)?.toLowerCase();
    if (key && attrs.content && !(key in meta)) meta[key] = attrs.content.trim();
  }
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const pick = (...keys: string[]) => keys.map((k) => meta[k]).find((v) => v);

  let imageUrl = pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src");
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, url).toString();
    } catch {
      imageUrl = undefined;
    }
  }

  return {
    url: pick("og:url") && /^https?:/i.test(pick("og:url")!) ? pick("og:url")! : url,
    source,
    title: pick("og:title", "twitter:title") ?? (titleTag ? decodeEntities(titleTag).trim() || undefined : undefined),
    description: pick("og:description", "twitter:description", "description"),
    author: pick("author", "article:author", "twitter:creator"),
    imageUrl,
  };
}

/** Keeps only what's worth storing: drops generic login-wall text some sites return to bots. */
export function cleanPreview(preview: LinkPreview): LinkPreview {
  const junk = /^(instagram|tiktok|pinterest|log ?in|sign ?up|create an account)\b.*$/i;
  const title = preview.title && !junk.test(preview.title) ? preview.title : undefined;
  return { ...preview, title };
}
