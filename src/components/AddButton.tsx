"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, shrinkImage } from "./client-utils";
import { Modal, buttonClass, inputClass } from "./Modal";

export function AddButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass}>
        + Save
      </button>
      {open && <AddDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AddDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("url", url);
      form.set("note", note);
      if (file) form.set("image", await shrinkImage(file), "image.jpg");
      await api("/api/save", { method: "POST", body: form });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Save something" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input
          className={inputClass}
          type="text"
          inputMode="url"
          placeholder="Paste a TikTok, Pinterest, Instagram or web link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm text-muted hover:border-accent">
          {preview ? (
            <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-chip text-xl">＋</span>
          )}
          <span>{file ? "Change image" : "Add a screenshot or image (optional)"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </label>
        <textarea
          className={`${inputClass} min-h-24`}
          placeholder="Add a note: what is it, why did you save it? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button className={buttonClass} disabled={busy || (!url.trim() && !file && !note.trim())}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
