"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { KINDS, KIND_LABELS, type Kind } from "@/lib/types";
import { api } from "./client-utils";
import { ghostButtonClass, inputClass } from "./Modal";

interface Props {
  item: { id: string; title: string; note: string; tags: string[]; kind: Kind | null; completedAt: string | null };
  groups: { id: string; name: string; member: boolean }[];
}

type Fields = { title: string; note: string; tags: string; kind: string };
const FIELD_NAMES = ["title", "note", "tags", "kind"] as const;

function fieldsOf(item: Props["item"]): Fields {
  return { title: item.title, note: item.note, tags: item.tags.join(", "), kind: item.kind ?? "" };
}

/** Just the fields that differ from what the server has, in the shape the API expects. */
function changesBetween(fields: Fields, saved: Fields): Record<string, unknown> | undefined {
  const body: Record<string, unknown> = {};
  if (fields.title !== saved.title) body.title = fields.title;
  if (fields.note !== saved.note) body.note = fields.note;
  if (fields.tags !== saved.tags) body.tags = fields.tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (fields.kind !== saved.kind && fields.kind) body.kind = fields.kind;
  return Object.keys(body).length ? body : undefined;
}

export function ItemEditor({ item, groups }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(() => fieldsOf(item));
  // What the server has, as far as we know. Anything in `fields` that differs is unsaved.
  const [saved, setSaved] = useState<Fields>(() => fieldsOf(item));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [membership, setMembership] = useState(groups);
  const [completedAt, setCompletedAt] = useState(item.completedAt);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When the page refreshes with new data (the AI finished, another device edited it…),
  // take the new values only for fields you haven't changed, so your typing is never lost.
  const incoming = fieldsOf(item);
  const incomingKey = JSON.stringify(incoming);
  const [lastIncomingKey, setLastIncomingKey] = useState(incomingKey);
  if (incomingKey !== lastIncomingKey) {
    setLastIncomingKey(incomingKey);
    setFields((current) => {
      const next = { ...current };
      for (const name of FIELD_NAMES) if (current[name] === saved[name]) next[name] = incoming[name];
      return next;
    });
    setSaved(incoming);
  }

  const setField = (name: keyof Fields, value: string) => setFields((f) => ({ ...f, [name]: value }));

  // Latest values for the save callbacks below (which can run after this render).
  const latest = useRef({ fields, saved });
  useEffect(() => {
    latest.current = { fields, saved };
  });
  const queue = useRef<Promise<void>>(Promise.resolve());

  /** Saves any unsaved changes. `keepalive` lets the save finish even if you leave the page. */
  const flush = useCallback(
    (keepalive = false) => {
      queue.current = queue.current.then(async () => {
        const { fields: snapshot, saved: base } = latest.current;
        const body = changesBetween(snapshot, base);
        if (!body) return;
        setSaveState("saving");
        try {
          const res = await fetch(`/api/items/${item.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            keepalive,
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Couldn't save (${res.status})`);
          latest.current = { ...latest.current, saved: snapshot };
          setSaved(snapshot);
          setSaveState("saved");
          if (!keepalive) router.refresh();
        } catch (err) {
          setSaveState("error");
          setError(err instanceof Error ? err.message : String(err));
        }
      });
      return queue.current;
    },
    [item.id, router],
  );

  const dirty = Boolean(changesBetween(fields, saved));

  // Save a moment after you stop typing.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => void flush(), 1000);
    return () => clearTimeout(timer);
  }, [fields, dirty, flush]);

  // …and straight away if you leave the page or switch apps.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void flush(true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void flush(true);
    };
  }, [flush]);

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

  const toggleGroup = (groupId: string, member: boolean) =>
    run(`group-${groupId}`, async () => {
      await api(`/api/collections/${groupId}/items`, { method: member ? "DELETE" : "POST", json: { itemId: item.id } });
      setMembership((gs) => gs.map((g) => (g.id === groupId ? { ...g, member: !member } : g)));
    });

  const toggleCompleted = () =>
    run("completed", async () => {
      const next = !completedAt;
      setCompletedAt(next ? new Date().toISOString() : null);
      try {
        await api(`/api/items/${item.id}`, { method: "PATCH", json: { completed: next } });
      } catch (err) {
        setCompletedAt(item.completedAt);
        throw err;
      }
      router.refresh();
    });

  const reprocess = () =>
    run("reprocess", async () => {
      await flush();
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
      <button
        type="button"
        role="checkbox"
        aria-checked={Boolean(completedAt)}
        onClick={toggleCompleted}
        disabled={busy === "completed"}
        className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${
          completedAt ? "bg-emerald-50 ring-emerald-600 dark:bg-emerald-950" : "bg-card ring-border hover:ring-fg"
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold ${
            completedAt ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted text-transparent"
          }`}
        >
          ✓
        </span>
        <span>
          <span className="block font-medium">Completed</span>
          <span className="block text-sm text-muted">
            {completedAt
              ? `Ticked off ${new Date(completedAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}`
              : "Read it, made it, been there? Tick it off."}
          </span>
        </span>
      </button>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Title</span>
        <input className={inputClass} value={fields.title} onChange={(e) => setField("title", e.target.value)} />
      </label>

      <label className="block">
        <span className="mb-1 flex justify-between text-sm text-muted">
          Your notes
          <span aria-live="polite" className={saveState === "error" ? "text-red-600" : ""}>
            {dirty || saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : saveState === "error" ? "Not saved" : ""}
          </span>
        </span>
        <textarea
          className={`${inputClass} min-h-28`}
          placeholder="Anything to remember: what it is, where it's from, what you thought…"
          value={fields.note}
          onChange={(e) => setField("note", e.target.value)}
          onBlur={() => void flush()}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Tags (comma separated)</span>
        <input className={inputClass} value={fields.tags} onChange={(e) => setField("tags", e.target.value)} onBlur={() => void flush()} />
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
        <select className={inputClass} value={fields.kind} onChange={(e) => setField("kind", e.target.value)}>
          {!fields.kind && <option value="">Not categorised yet</option>}
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
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
