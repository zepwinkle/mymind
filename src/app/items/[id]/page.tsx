import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Header } from "@/components/Header";
import { ItemEditor } from "@/components/ItemEditor";
import { collectionIdsForItem, getItem, listCollections } from "@/lib/items";
import { KIND_LABELS } from "@/lib/types";

const OPEN_LABELS: Record<string, string> = {
  tiktok: "Open in TikTok",
  instagram: "Open in Instagram",
  pinterest: "Open in Pinterest",
  youtube: "Open in YouTube",
};

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const [item, collections, memberOf] = await Promise.all([getItem(id), listCollections(), collectionIdsForItem(id)]);
  if (!item) notFound();

  const manualGroups = collections.filter((c) => c.type === "manual");

  return (
    <>
      <Header />
      <AutoRefresh active={item.status === "processing"} />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          {item.thumbnail_url ? (
            <img src={item.thumbnail_url} alt="" className="w-full rounded-2xl bg-card shadow-sm ring-1 ring-border" />
          ) : (
            <div className="rounded-2xl bg-card p-8 font-serif text-2xl leading-snug ring-1 ring-border">
              {item.note || item.caption || item.url}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {item.kind && (
                <Link href={`/?kind=${item.kind}`} className="rounded-full bg-chip px-2.5 py-0.5 text-fg">
                  {KIND_LABELS[item.kind]}
                </Link>
              )}
              <span>Saved {new Date(item.created_at).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</span>
              {item.author && <span>· {item.author}</span>}
            </div>
            {item.status === "processing" && <p className="mt-3 text-sm text-accent">Reading this with AI…</p>}
            {item.error && <p className="mt-3 rounded-xl bg-chip p-3 text-sm">{item.error}</p>}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block break-all text-sm underline decoration-border underline-offset-4 hover:decoration-fg"
              >
                {OPEN_LABELS[item.source] ?? item.url} ↗
              </a>
            )}
          </div>

          {item.summary && <p className="leading-relaxed">{item.summary}</p>}

          {!!item.details.ingredients?.length && (
            <section>
              <h2 className="mb-2 font-serif text-xl">Ingredients</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {item.details.ingredients.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          )}
          {!!item.details.steps?.length && (
            <section>
              <h2 className="mb-2 font-serif text-xl">Steps</h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {item.details.steps.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </section>
          )}

          <ItemEditor
            key={item.updated_at}
            item={{ id: item.id, title: item.title ?? "", note: item.note ?? "", tags: item.tags, kind: item.kind }}
            groups={manualGroups.map((g) => ({ id: g.id, name: g.name, member: memberOf.has(g.id) }))}
          />

          {item.caption && (
            <details className="text-sm text-muted">
              <summary className="cursor-pointer">Original caption</summary>
              <p className="mt-2 whitespace-pre-wrap">{item.caption}</p>
            </details>
          )}
          {item.details.extracted_text && (
            <details className="text-sm text-muted">
              <summary className="cursor-pointer">Text in the image</summary>
              <p className="mt-2 whitespace-pre-wrap">{item.details.extracted_text}</p>
            </details>
          )}
        </div>
      </main>
    </>
  );
}
