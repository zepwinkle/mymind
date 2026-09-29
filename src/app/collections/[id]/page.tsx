import Link from "next/link";
import { notFound } from "next/navigation";
import { EditGroupButtons } from "@/components/GroupForm";
import { Header } from "@/components/Header";
import { ItemGrid } from "@/components/ItemGrid";
import { getCollection, listItems } from "@/lib/items";
import { KIND_LABELS, type Kind, type SmartFilter } from "@/lib/types";

function describe(filter: SmartFilter): string {
  const parts: string[] = [];
  if (filter.kinds?.length) parts.push(filter.kinds.map((k) => KIND_LABELS[k as Kind] ?? k).join(" or "));
  if (filter.tags?.length) parts.push(`tagged ${filter.tags.map((t) => `#${t}`).join(" or ")}`);
  if (filter.query) parts.push(`mentioning “${filter.query}”`);
  return parts.join(", ");
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() || undefined;
  const group = await getCollection(id);
  if (!group) notFound();
  const items = await listItems({ collection: group, q });

  return (
    <>
      <Header q={q} action={`/collections/${id}`} />
      <main className="mx-auto max-w-7xl px-4 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3 py-6">
          <div>
            <Link href="/" className="text-sm text-muted hover:text-fg">
              ← Everything
            </Link>
            <h1 className="font-serif text-4xl">{group.name}</h1>
            <p className="text-sm text-muted">
              {group.type === "smart" ? `✦ Automatic: ${describe(group.filter)}` : "Hand-picked"} · {items.length} item
              {items.length === 1 ? "" : "s"}
            </p>
          </div>
          <EditGroupButtons group={group} />
        </div>
        <ItemGrid
          items={items}
          empty={
            group.type === "manual"
              ? "Nothing here yet. Open any item and tick this group to add it."
              : "Nothing matches this filter yet."
          }
        />
      </main>
    </>
  );
}
