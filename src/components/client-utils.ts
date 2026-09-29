"use client";

export async function api(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Something went wrong (${res.status})`);
  return data;
}

/**
 * Shrinks a photo/screenshot to a JPEG of at most `maxSide` pixels before upload,
 * which keeps uploads fast and under hosting limits. iPhone HEIC photos are converted too.
 */
export async function shrinkImage(file: File, maxSide = 1800, quality = 0.85): Promise<Blob> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

export interface ClipboardContents {
  image?: File;
  text?: string;
}

/**
 * Reads a picture and/or text from the clipboard. Must be called from a tap/click.
 * On iPhone, Safari shows a small "Paste" bubble that needs a second tap to allow it.
 */
export async function readClipboard(): Promise<ClipboardContents> {
  if (!navigator.clipboard) throw new Error("This browser doesn't allow pasting here. Try saving the picture instead.");
  const out: ClipboardContents = {};
  if (navigator.clipboard.read) {
    try {
      for (const item of await navigator.clipboard.read()) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType && !out.image) {
          const blob = await item.getType(imageType);
          out.image = new File([blob], `pasted.${imageType.split("/")[1] || "png"}`, { type: imageType });
        }
        if (item.types.includes("text/plain") && !out.text) {
          out.text = (await (await item.getType("text/plain")).text()).trim();
        }
      }
      return out;
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        throw new Error("Pasting was blocked. Tap “Paste” when your phone asks, or allow clipboard access.");
      }
      // Some browsers only support reading text; fall through.
    }
  }
  const text = (await navigator.clipboard.readText().catch(() => "")).trim();
  if (text) out.text = text;
  return out;
}

/** The first image file in a paste event (e.g. ⌘V on a computer), if any. */
export function imageFromPasteEvent(e: React.ClipboardEvent): File | undefined {
  return Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
}
