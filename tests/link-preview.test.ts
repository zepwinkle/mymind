import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanPreview,
  decodeEntities,
  detectSource,
  extractUrl,
  oembedEndpoint,
  previewFromHtml,
  previewFromOembed,
  previewFromTikTokHtml,
} from "../src/lib/link-preview.ts";

test("detectSource recognises each platform", () => {
  assert.equal(detectSource("https://www.tiktok.com/@chef/video/123"), "tiktok");
  assert.equal(detectSource("https://vm.tiktok.com/ZMabc/"), "tiktok");
  assert.equal(detectSource("https://www.instagram.com/p/Cabc/"), "instagram");
  assert.equal(detectSource("https://pin.it/3xyz"), "pinterest");
  assert.equal(detectSource("https://nz.pinterest.com/pin/123/"), "pinterest");
  assert.equal(detectSource("https://www.pinterest.co.uk/pin/123/"), "pinterest");
  assert.equal(detectSource("https://youtu.be/abc"), "youtube");
  assert.equal(detectSource("https://nottiktok.com/x"), "web");
  assert.equal(detectSource("not a url"), "web");
});

test("extractUrl pulls a link out of share-sheet text", () => {
  assert.equal(
    extractUrl("Check out this video! https://vm.tiktok.com/ZMabc/ #fyp"),
    "https://vm.tiktok.com/ZMabc/",
  );
  assert.equal(extractUrl("(see https://example.com/a.)"), "https://example.com/a");
  assert.equal(extractUrl("no link here"), undefined);
});

test("oembed endpoints exist only for keyless platforms", () => {
  assert.match(oembedEndpoint("https://www.tiktok.com/@a/video/1", "tiktok")!, /^https:\/\/www\.tiktok\.com\/oembed\?url=https%3A/);
  assert.equal(oembedEndpoint("https://www.instagram.com/p/x/", "instagram"), undefined);
  assert.equal(
    oembedEndpoint("https://www.tiktok.com/@a/photo/7412345678901234567", "tiktok"),
    `https://www.tiktok.com/oembed?url=${encodeURIComponent("https://www.tiktok.com/@a/video/7412345678901234567")}`,
  );
});

test("TikTok oEmbed title is treated as the caption", () => {
  const p = previewFromOembed("https://www.tiktok.com/@a/video/1", "tiktok", {
    title: "15 min chilli oil noodles 🌶️ #recipe",
    author_name: "Chef A",
    thumbnail_url: "https://p16.tiktokcdn.com/thumb.jpeg",
  });
  assert.equal(p.title, undefined);
  assert.equal(p.description, "15 min chilli oil noodles 🌶️ #recipe");
  assert.equal(p.author, "Chef A");
  assert.equal(p.imageUrl, "https://p16.tiktokcdn.com/thumb.jpeg");
});

test("previewFromHtml reads Open Graph tags in any attribute order", () => {
  const html = `<html><head>
    <title>Fallback title</title>
    <meta content="Linen summer outfit &amp; sandals" property="og:title">
    <meta property='og:description' content='Outfit idea &#8212; neutral tones'>
    <meta name="twitter:image" content="/img/small.jpg">
    <meta property="og:image" content="https://i.pinimg.com/736x/ab/cd.jpg" />
  </head></html>`;
  const p = previewFromHtml("https://www.pinterest.com/pin/1/", "pinterest", html);
  assert.equal(p.title, "Linen summer outfit & sandals");
  assert.equal(p.description, "Outfit idea — neutral tones");
  assert.equal(p.imageUrl, "https://i.pinimg.com/736x/ab/cd.jpg");
});

test("previewFromHtml falls back to <title> and resolves relative images", () => {
  const p = previewFromHtml(
    "https://blog.example.com/posts/1",
    "web",
    `<title> My &quot;best&quot; bread </title><meta name="twitter:image" content="/hero.png">`,
  );
  assert.equal(p.title, 'My "best" bread');
  assert.equal(p.imageUrl, "https://blog.example.com/hero.png");
});

test("cleanPreview drops login-wall titles", () => {
  const p = cleanPreview({ url: "u", source: "instagram", title: "Instagram", description: "x" });
  assert.equal(p.title, undefined);
  assert.equal(p.description, "x");
});

test("decodeEntities handles numeric and named entities", () => {
  assert.equal(decodeEntities("a &amp; b &#x1F35C; &lt;3 &unknown;"), "a & b 🍜 <3 &unknown;");
});

function tiktokPage(itemStruct: unknown) {
  const data = { __DEFAULT_SCOPE__: { "webapp.video-detail": { itemInfo: { itemStruct } } } };
  return `<html><head><meta property="og:title" content="TikTok - Make Your Day"></head><body>
    <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
}

test("TikTok photo carousels yield every slide, caption and author", () => {
  const p = previewFromTikTokHtml(
    "https://www.tiktok.com/@cook/photo/1",
    tiktokPage({
      desc: "5 easy lunches 🥗 #mealprep",
      author: { uniqueId: "cook", nickname: "Cook With Me" },
      imagePost: {
        title: "Easy lunches",
        images: [
          { imageURL: { urlList: ["https://p16-sign.tiktokcdn.com/1.jpeg", "https://backup/1.jpeg"] } },
          { imageURL: { urlList: ["https://p16-sign.tiktokcdn.com/2.jpeg"] } },
          { imageURL: { urlList: [] } },
        ],
      },
      video: { cover: "" },
    }),
  );
  assert.equal(p.description, "5 easy lunches 🥗 #mealprep");
  assert.equal(p.title, "Easy lunches");
  assert.equal(p.author, "Cook With Me");
  assert.equal(p.imageUrl, "https://p16-sign.tiktokcdn.com/1.jpeg");
  assert.deepEqual(p.images, ["https://p16-sign.tiktokcdn.com/1.jpeg", "https://p16-sign.tiktokcdn.com/2.jpeg"]);
});

test("TikTok videos fall back to the video cover", () => {
  const p = previewFromTikTokHtml(
    "https://www.tiktok.com/@a/video/2",
    tiktokPage({ desc: "hi", author: { uniqueId: "a" }, video: { cover: "https://p16/cover.jpeg", originCover: "https://p16/origin.jpeg" } }),
  );
  assert.equal(p.imageUrl, "https://p16/origin.jpeg");
  assert.deepEqual(p.images, ["https://p16/origin.jpeg"]);
  assert.equal(p.author, "a");
});

test("TikTok pages without embedded data return nothing", () => {
  assert.deepEqual(previewFromTikTokHtml("u", "<html></html>"), {});
  assert.deepEqual(
    previewFromTikTokHtml("u", '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">{not json</script>'),
    {},
  );
});
