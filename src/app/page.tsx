import Link from "next/link";
import { Header } from "@/components/Header";
import { ItemGrid } from "@/components/ItemGrid";
import { NewGroupButton } from "@/components/GroupForm";
import { restartStale } from "@/lib/background";
import { completedCount, kindCounts, listCollections, listItems } from "@/lib/items";
import { KINDS, KIND_LABELS } from "@/lib/types";

const chip = "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const kind = first(params.kind) || undefined;
  const tag = first(params.tag) || undefined;
  const completed = first(params.completed) === "1" ? "1" : undefined;

  const [items, collections, counts, doneCount] = await Promise.all([
    listItems({ q, kind, tag, completed: completed ? true : undefined }),
    listCollections(),
    kindCounts(),
    completedCount(),
  ]);
  await restartStale(items);

  const link = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, kind, tag, completed, ...next })) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <Header q={q} hidden={Object.fromEntries(Object.entries({ kind, tag, completed }).filter(([, v]) => v)) as Record<string, string>} />
      <main className="mx-auto max-w-7xl px-4 pb-16">
        <section className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
          {collections.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`} className={`${chip} bg-card ring-1 ring-border hover:ring-accent`}>
              {c.type === "smart" ? "✦ " : ""}
              {c.name}
            </Link>
          ))}
          <NewGroupButton className={`${chip} border border-dashed border-border text-muted hover:text-fg`} />
        </section>

        {counts.size > 0 && (
          <nav className="flex gap-1.5 overflow-x-auto pb-4 [scrollbar-width:none]">
            <Link href={link({ kind: undefined, completed: undefined })} className={`${chip} ${!kind && !completed ? "bg-fg text-bg" : "bg-chip"}`}>
              Everything
            </Link>
            {doneCount > 0 && (
              <Link
                href={link({ completed: completed ? undefined : "1" })}
                className={`${chip} ${completed ? "bg-emerald-700 text-white" : "bg-chip"}`}
              >
                ✓ Completed <span className="opacity-60">{doneCount}</span>
              </Link>
            )}
            {KINDS.filter((k) => counts.has(k)).map((k) => (
              <Link key={k} href={link({ kind: k === kind ? undefined : k })} className={`${chip} ${k === kind ? "bg-fg text-bg" : "bg-chip"}`}>
                {KIND_LABELS[k]} <span className="opacity-60">{counts.get(k)}</span>
              </Link>
            ))}
          </nav>
        )}

        {tag && (
          <p className="pb-4 text-sm text-muted">
            Tagged <span className="text-fg">#{tag}</span> ·{" "}
            <Link href={link({ tag: undefined })} className="underline">
              clear
            </Link>
          </p>
        )}

        <ItemGrid
          items={items}
          empty={
            q || kind || tag || completed ? (
              "Nothing matches that yet."
            ) : (
              <>
                <p className="font-serif text-3xl text-fg">Your mind is empty.</p>
                <p className="mt-2">
                  Tap <b>+ Save</b> to add a link or image, or{" "}
                  <Link href="/setup" className="underline">
                    set up the iPhone Shortcut
                  </Link>
                  .
                </p>
              </>
            )
          }
        />
      </main>
    </>
  );
}
