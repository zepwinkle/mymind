"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, readClipboard, shrinkImage } from "./client-utils";
import { ghostButtonClass } from "./Modal";

/** Lets you swap an item's thumbnail for a photo or screenshot of your own. */
export function ReplaceImageButton({ itemId, hasImage }: { itemId: string; hasImage: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("image", await shrinkImage(file), "image.jpg");
      await api(`/api/items/${itemId}/image`, { method: "POST", body: form });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function paste() {
    setError(null);
    try {
      const { image } = await readClipboard();
      if (!image) {
        setError("There's no picture on your clipboard. Copy one first.");
        return;
      }
      await upload(image);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className={ghostButtonClass} onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : hasImage ? "Change picture" : "Add a picture"}
        </button>
        <button type="button" className={ghostButtonClass} onClick={paste} disabled={busy}>
          📋 Paste picture
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
