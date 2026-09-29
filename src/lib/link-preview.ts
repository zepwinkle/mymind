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
  /** Every image in the post (e.g. all slides of a carousel), first one included. */
  images?: string[];
  /** True when the link is known to be a photo carousel rather than a video. */
  isPhotoPost?: boolean;
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
  // TikTok's oEmbed only understands video links; photo carousels share the same
  // ID space, so asking for the /video/ form returns the carousel's cover.
  if (source === "tiktok") url = url.replace(/\/photo\/(\d+)/, "/video/$1");
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

function firstUrl(value: unknown): string | undefined {
  const list = (value as { urlList?: unknown; url_list?: unknown } | undefined)?.urlList ??
    (value as { url_list?: unknown } | undefined)?.url_list;
  const url = Array.isArray(list) ? list.find((u) => typeof u === "string" && /^https?:/.test(u)) : undefined;
  return typeof url === "string" ? url : undefined;
}

/** Depth-first search for the first value stored under `key` anywhere in parsed JSON. */
function findKey(value: unknown, key: string, depth = 0): unknown {
  if (!value || typeof value !== "object" || depth > 14) return undefined;
  if (!Array.isArray(value) && key in value) return (value as Record<string, unknown>)[key];
  for (const child of Object.values(value)) {
    const found = findKey(child, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function scriptJson(html: string, id: string): unknown {
  const re = new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)</script>`, "i");
  const raw = html.match(re)?.[1];
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** The numeric post ID from a TikTok video or photo link. */
export function tiktokPostId(url: string): string | undefined {
  return url.match(/\/(?:video|photo)\/(\d{6,})/)?.[1];
}

/** TikTok's embed player page (what websites use to embed a post). */
export function tiktokEmbedUrl(id: string): string {
  return `https://www.tiktok.com/embed/v2/${id}`;
}

/**
 * The embed page carries its own copy of the post data, including carousel slides
 * (under imagePostInfo.displayImages). Used when the main page didn't give us them.
 */
export function slidesFromTikTokEmbedHtml(html: string): { images: string[]; isPhotoPost: boolean } {
  const info = findKey(scriptJson(html, "__FRONTITY_CONNECT_STATE__"), "imagePostInfo") as
    | { displayImages?: unknown[]; images?: unknown[] }
    | undefined;
  const list = info?.displayImages ?? info?.images ?? [];
  const images = (Array.isArray(list) ? list : [])
    .map((img) => firstUrl(img) ?? firstUrl((img as { imageURL?: unknown })?.imageURL))
    .filter((u): u is string => Boolean(u));
  return { images, isPhotoPost: Boolean(info) };
}

/**
 * TikTok pages embed the post's data as JSON. For photo carousels this is the only
 * place the slide images appear, so read the caption, author and every image from it.
 */
export function previewFromTikTokHtml(url: string, html: string): Partial<LinkPreview> {
  const data = scriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__") as
    | { __DEFAULT_SCOPE__?: Record<string, { itemInfo?: { itemStruct?: unknown } }> }
    | undefined;
  const item = (data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct ??
    findKey(data, "itemStruct")) as Record<string, unknown> | undefined;
  if (!item || typeof item !== "object") return {};

  const imagePost = item.imagePost as { images?: { imageURL?: unknown; display_image?: unknown }[]; cover?: { imageURL?: unknown } } | undefined;
  const slides = (imagePost?.images ?? [])
    .map((img) => firstUrl(img?.imageURL) ?? firstUrl(img?.display_image))
    .filter((u): u is string => Boolean(u));
  const video = item.video as { cover?: unknown; originCover?: unknown } | undefined;
  const cover =
    slides[0] ??
    firstUrl(imagePost?.cover?.imageURL) ??
    (typeof video?.originCover === "string" && video.originCover ? video.originCover : undefined) ??
    (typeof video?.cover === "string" && video.cover ? video.cover : undefined);

  const author = item.author as { uniqueId?: unknown; nickname?: unknown } | undefined;
  const title = (imagePost as { title?: unknown } | undefined)?.title;
  const desc = typeof item.desc === "string" && item.desc.trim() ? item.desc.trim() : undefined;
  return {
    url,
    source: "tiktok",
    title: typeof title === "string" && title.trim() ? title.trim() : undefined,
    description: desc,
    author: typeof author?.nickname === "string" && author.nickname ? author.nickname : typeof author?.uniqueId === "string" ? author.uniqueId : undefined,
    imageUrl: cover,
    images: slides.length ? slides : cover ? [cover] : undefined,
    isPhotoPost: Boolean(imagePost),
  };
}
