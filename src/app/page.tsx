import Link from "next/link";
import { Header } from "@/components/Header";
import { ItemGrid } from "@/components/ItemGrid";
import { NewGroupButton } from "@/components/GroupForm";
import { kindCounts, listCollections, listItems } from "@/lib/items";
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

  const [items, collections, counts] = await Promise.all([
    listItems({ q, kind, tag }),
    listCollections(),
    kindCounts(),
  ]);

  const link = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, kind, tag, ...next })) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <Header q={q} hidden={Object.fromEntries(Object.entries({ kind, tag }).filter(([, v]) => v)) as Record<string, string>} />
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
            <Link href={link({ kind: undefined })} className={`${chip} ${!kind ? "bg-fg text-bg" : "bg-chip"}`}>
              Everything
            </Link>
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
            q || kind || tag ? (
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
