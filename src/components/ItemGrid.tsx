import Link from "next/link";
import type { ItemView } from "@/lib/types";
import { AutoRefresh } from "./AutoRefresh";

const SOURCE_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  pinterest: "Pinterest",
  youtube: "YouTube",
  web: "Web",
  image: "Image",
  note: "Note",
};

export function ItemGrid({ items, empty }: { items: ItemView[]; empty: React.ReactNode }) {
  if (!items.length) return <div className="py-24 text-center text-muted">{empty}</div>;
  return (
    <>
      <AutoRefresh active={items.some((i) => i.status === "processing")} />
      <div className="masonry">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}

function ItemCard({ item }: { item: ItemView }) {
  const title = item.title || item.caption?.split("\n")[0] || item.note?.split("\n")[0] || item.url || "Untitled";
  return (
    <Link href={`/items/${item.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition group-hover:shadow-md">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" loading="lazy" className="block w-full" />
        ) : (
          <div className="p-4 font-serif text-lg leading-snug">
            <span className="line-clamp-6">{item.note || item.caption || title}</span>
          </div>
        )}
        {item.status === "processing" && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur">
            Reading…
          </span>
        )}
        {item.status === "failed" && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600/80 px-2 py-0.5 text-xs text-white">Needs a look</span>
        )}
      </div>
      <div className="px-1 pt-1.5">
        <p className="line-clamp-2 text-sm leading-snug">{title}</p>
        <p className="text-xs text-muted">{SOURCE_LABELS[item.source] ?? item.source}</p>
      </div>
    </Link>
  );
}
