"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KINDS, KIND_LABELS, type Collection } from "@/lib/types";
import { api } from "./client-utils";
import { Modal, buttonClass, ghostButtonClass, inputClass } from "./Modal";

export function NewGroupButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        + New group
      </button>
      {open && <GroupDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditGroupButtons({ group }: { group: Collection }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function remove() {
    if (!confirm(`Delete the group "${group.name}"? The saved items stay in your library.`)) return;
    await api(`/api/collections/${group.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => setOpen(true)} className={ghostButtonClass}>
        Edit
      </button>
      <button onClick={remove} className={ghostButtonClass}>
        Delete
      </button>
      {open && <GroupDialog group={group} onClose={() => setOpen(false)} />}
    </div>
  );
}

function GroupDialog({ group, onClose }: { group?: Collection; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(group?.name ?? "");
  const [type, setType] = useState<"manual" | "smart">(group?.type ?? "manual");
  const [kinds, setKinds] = useState<string[]>(group?.filter.kinds ?? []);
  const [tags, setTags] = useState((group?.filter.tags ?? []).join(", "));
  const [query, setQuery] = useState(group?.filter.query ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleKind(kind: string) {
    setKinds((ks) => (ks.includes(kind) ? ks.filter((k) => k !== kind) : [...ks, kind]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name,
      type,
      filter: { kinds, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), query },
    };
    try {
      if (group) {
        await api(`/api/collections/${group.id}`, { method: "PATCH", json: body });
      } else {
        const { id } = await api("/api/collections", { method: "POST", json: body });
        router.push(`/collections/${id}`);
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={group ? "Edit group" : "New group"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <input
          className={inputClass}
          placeholder="Name, e.g. Dinner ideas"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {!group && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(
              [
                ["manual", "I'll pick", "Add items to it yourself"],
                ["smart", "Automatic", "Fills itself using a filter"],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                type="button"
                key={value}
                onClick={() => setType(value)}
                className={`rounded-xl border p-3 text-left ${type === value ? "border-accent bg-chip" : "border-border"}`}
              >
                <span className="block font-medium">{label}</span>
                <span className="text-muted">{hint}</span>
              </button>
            ))}
          </div>
        )}

        {type === "smart" && (
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-sm text-muted">Include items in any of these categories</p>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((kind) => (
                  <button
                    type="button"
                    key={kind}
                    onClick={() => toggleKind(kind)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      kinds.includes(kind) ? "bg-fg text-bg" : "bg-chip text-fg"
                    }`}
                  >
                    {KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">…and with any of these tags (comma separated)</span>
              <input className={inputClass} placeholder="e.g. chicken, quick dinner" value={tags} onChange={(e) => setTags(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">…and mentioning these words</span>
              <input className={inputClass} placeholder="e.g. pasta" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button className={buttonClass} disabled={busy || !name.trim()}>
            {busy ? "Saving…" : group ? "Save" : "Create group"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
