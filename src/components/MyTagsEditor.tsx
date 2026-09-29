"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MyTag } from "@/lib/my-tags";
import { api } from "./client-utils";
import { buttonClass, ghostButtonClass, inputClass } from "./Modal";

export function MyTagsEditor({ tags }: { tags: MyTag[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api("/api/tags", { method: "POST", json: { name, description } });
      setName("");
      setDescription("");
      setEditing(null);
    });
  };

  const edit = (tag: MyTag) => {
    setEditing(tag.name);
    setName(tag.name);
    setDescription(tag.description ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = (tag: MyTag) => {
    if (!confirm(`Stop the AI using “${tag.name}”? Items already tagged keep the tag.`)) return;
    void run(() => api("/api/tags", { method: "DELETE", json: { name: tag.name } }));
  };

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border">
        <input
          className={inputClass}
          placeholder="Tag, e.g. healthy"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={editing !== null}
        />
        <textarea
          className={`${inputClass} min-h-20`}
          placeholder="What it means to you (optional), e.g. mostly whole foods: veg, lean protein, whole grains. Not desserts or fried food."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          {editing && (
            <button
              type="button"
              className={ghostButtonClass}
              onClick={() => {
                setEditing(null);
                setName("");
                setDescription("");
              }}
            >
              Cancel
            </button>
          )}
          <button className={buttonClass} disabled={busy || !name.trim()}>
            {editing ? "Save" : "Add tag"}
          </button>
        </div>
      </form>

      {tags.length ? (
        <ul className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
          {tags.map((tag) => (
            <li key={tag.name} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/?tag=${encodeURIComponent(tag.name)}`} className="font-medium hover:underline">
                  #{tag.name}
                </Link>
                {tag.description && <p className="text-sm text-muted">{tag.description}</p>}
              </div>
              <button className="text-sm text-muted hover:text-fg" onClick={() => edit(tag)} disabled={busy}>
                Edit
              </button>
              <button className="text-sm text-red-600" onClick={() => remove(tag)} disabled={busy}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-muted">No tags yet. Add one above.</p>
      )}
    </div>
  );
}
