"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KINDS, KIND_LABELS, type Kind } from "@/lib/types";
import { api } from "./client-utils";
import { buttonClass, ghostButtonClass, inputClass } from "./Modal";

interface Props {
  item: { id: string; title: string; note: string; tags: string[]; kind: Kind | null };
  groups: { id: string; name: string; member: boolean }[];
}

export function ItemEditor({ item, groups }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note);
  const [tags, setTags] = useState(item.tags.join(", "));
  const [kind, setKind] = useState<string>(item.kind ?? "");
  const [membership, setMembership] = useState(groups);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    title !== item.title || note !== item.note || tags !== item.tags.join(", ") || kind !== (item.kind ?? "");

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run("save", async () => {
      await api(`/api/items/${item.id}`, {
        method: "PATCH",
        json: { title, note, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), ...(kind ? { kind } : {}) },
      });
      router.refresh();
    });

  const toggleGroup = (groupId: string, member: boolean) =>
    run(`group-${groupId}`, async () => {
      await api(`/api/collections/${groupId}/items`, { method: member ? "DELETE" : "POST", json: { itemId: item.id } });
      setMembership((gs) => gs.map((g) => (g.id === groupId ? { ...g, member: !member } : g)));
    });

  const reprocess = () =>
    run("reprocess", async () => {
      if (dirty) await save();
      await api(`/api/items/${item.id}/reprocess`, { method: "POST" });
      router.refresh();
    });

  const remove = () =>
    run("delete", async () => {
      if (!confirm("Delete this from your mind?")) return;
      await api(`/api/items/${item.id}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Title</span>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Your notes</span>
        <textarea
          className={`${inputClass} min-h-28`}
          placeholder="Anything to remember: what it is, where it's from, what you thought…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Tags (comma separated)</span>
        <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} />
        {item.tags.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="rounded-full bg-chip px-2.5 py-0.5 text-xs hover:bg-border">
                #{t}
              </Link>
            ))}
          </span>
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Category</span>
        <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
          {!kind && <option value="">Not categorised yet</option>}
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button className={buttonClass} onClick={save} disabled={!dirty || !!busy}>
          {busy === "save" ? "Saving…" : "Save changes"}
        </button>
        <button className={ghostButtonClass} onClick={reprocess} disabled={!!busy} title="Re-read the link and re-run the AI, using your notes">
          {busy === "reprocess" ? "Starting…" : "Re-run AI"}
        </button>
        <button className={`${ghostButtonClass} text-red-600`} onClick={remove} disabled={!!busy}>
          Delete
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-2 text-sm text-muted">Groups</h2>
        {membership.length ? (
          <div className="flex flex-wrap gap-1.5">
            {membership.map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id, g.member)}
                disabled={busy === `group-${g.id}`}
                className={`rounded-full px-3 py-1 text-sm ${g.member ? "bg-fg text-bg" : "bg-chip"}`}
              >
                {g.member ? "✓ " : "+ "}
                {g.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Make a hand-picked group from the home screen to add this to it.</p>
        )}
      </section>
    </div>
  );
}
